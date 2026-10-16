/**
 * API Route: /api/gemini/importar-presto
 *
 * Extrae partidas de un PDF generado por Presto (software de presupuestos de construcción).
 * Devuelve obra, cliente y array de partidas listo para cargar en el editor de ODEPLAC.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    // 1. Verificar autenticación (sesión web O clave estática para n8n/scripts)
    const importSecret = req.headers.get('x-import-secret')
    const validSecret = process.env.PRESTO_IMPORT_SECRET

    let autenticado = false

    if (validSecret && importSecret === validSecret) {
      autenticado = true
    } else {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            },
          },
        }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) autenticado = true
    }

    if (!autenticado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Verificar API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 500 })
    }

    // 3. Leer el PDF
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar 20 MB' }, { status: 400 })
    }

    // 4. Convertir a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 5. Llamar a Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
Eres un experto extrayendo datos de presupuestos de construcción generados por el software Presto (RIB Spain).

Analiza este PDF y extrae:
1. El nombre de la OBRA o proyecto
2. El nombre del CLIENTE (si aparece)
3. Todas las PARTIDAS del presupuesto

Para cada partida extrae:
- descripcion: título o encabezado de la partida (lo que aparece en negrita o como código descriptivo)
- ofertamos: descripción técnica desarrollada de lo que se oferta (el texto largo con materiales, proceso, etc.) — puede ser null si no existe
- unidad: m², ml, ud, kg, etc.
- medicion: cantidad numérica
- precio_unitario: precio por unidad
- total_euros: importe total de la partida

IMPORTANTE:
- Extrae TODAS las partidas, incluso las de capítulos o secciones distintas
- Si hay capítulos o secciones, incluye el nombre del capítulo en "capitulo" de cada partida
- Los valores numéricos deben ser números decimales, NUNCA strings
- Si un campo no existe usa null
- Ignora las líneas de subtotal, total general y cabeceras de tabla
- Los precios en formato español (1.234,56) conviértelos a decimal (1234.56)

Devuelve EXCLUSIVAMENTE este JSON sin texto adicional:
{
  "obra": "nombre de la obra o proyecto",
  "cliente": "nombre del cliente o null",
  "partidas": [
    {
      "capitulo": "nombre del capítulo o null",
      "descripcion": "título de la partida",
      "ofertamos": "descripción técnica larga o null",
      "unidad": "m²",
      "medicion": 0.00,
      "precio_unitario": 0.00,
      "total_euros": 0.00
    }
  ]
}
`

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: 'application/pdf'
        }
      },
      { text: prompt }
    ])

    const responseText = result.response.text()

    // 6. Limpiar y parsear
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let extracted: any
    try {
      extracted = JSON.parse(cleanJson)
    } catch {
      console.error('Gemini devolvió JSON inválido:', cleanJson.substring(0, 300))
      return NextResponse.json(
        { error: 'La IA no pudo procesar el PDF. Asegúrate de que es un presupuesto de Presto.' },
        { status: 422 }
      )
    }

    // 7. Validar y normalizar
    if (!Array.isArray(extracted.partidas) || extracted.partidas.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron partidas en el PDF. ¿Es un presupuesto de Presto?' },
        { status: 422 }
      )
    }

    const partidasNormalizadas = extracted.partidas
      .filter((p: any) => p.descripcion)
      .map((p: any, i: number) => ({
        item: i + 1,
        capitulo: p.capitulo?.trim() || null,
        descripcion: p.descripcion?.trim() || 'Sin descripción',
        ofertamos: p.ofertamos?.trim() || null,
        unidad: p.unidad?.trim() || 'ud',
        medicion: parseFloat(p.medicion) || 0,
        precio_unitario: parseFloat(p.precio_unitario) || 0,
        total_euros: parseFloat(p.total_euros) || 0,
      }))

    return NextResponse.json({
      success: true,
      obra: extracted.obra?.trim() || 'Obra importada de Presto',
      cliente: extracted.cliente?.trim() || null,
      partidas: partidasNormalizadas,
      total: partidasNormalizadas.reduce((acc: number, p: any) => acc + p.total_euros, 0),
    })

  } catch (error: any) {
    console.error('[IMPORTAR PRESTO ERROR]:', error.message)
    return NextResponse.json(
      { error: 'Error interno: ' + error.message },
      { status: 500 }
    )
  }
}
