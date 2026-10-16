/**
 * API Route: /api/gemini/analizar-factura
 * 
 * Procesa facturas de proveedores con Gemini en el SERVIDOR.
 * Reemplaza el flujo de n8n que daba resultados incorrectos.
 * 
 * Funciona con cualquier formato de factura:
 * - Isoterm, Saint-Gobain, Placo, Hermanos Moreno, etc.
 */
 
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
 
export const maxDuration = 60
 
export async function POST(req: Request) {
  try {
    // 1. Verificar sesión
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
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
 
    // 2. Verificar API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Servicio de IA no configurado' },
        { status: 500 }
      )
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
 
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar 10MB' }, { status: 400 })
    }
 
    // 4. Convertir a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
 
    // 5. Llamar a Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
 
    const prompt = `
      Analiza esta factura de proveedor y extrae los datos en formato JSON.
      
      IMPORTANTE: Lee TODA la factura cuidadosamente. 
      El proveedor es la EMPRESA QUE EMITE la factura (quien cobra), NO quien la recibe.
      
      Devuelve EXCLUSIVAMENTE este JSON sin texto adicional:
      {
        "proveedor": "nombre completo de la empresa que emite la factura",
        "numero_factura": "número de factura",
        "fecha": "fecha en formato YYYY-MM-DD",
        "referencia_obra": "referencia de obra o pedido si existe, si no null",
        "base_imponible": 0.00,
        "iva_porcentaje": 21,
        "iva_total": 0.00,
        "total": 0.00,
        "lineas_factura": [
          {
            "codigo": "código artículo o null",
            "descripcion": "descripción completa del producto",
            "cantidad": 0.00,
            "unidad": "M2 o ML o UDS o KG",
            "precio_unitario": 0.00,
            "descuento": 0.00,
            "importe": 0.00
          }
        ]
      }
      
      REGLAS:
      - proveedor: es quien EMITE la factura, quien aparece en el membrete/cabecera
      - Los importes deben ser números decimales, nunca strings
      - Si un campo no existe usa null
      - base_imponible es el total SIN IVA
      - total es el importe FINAL con IVA incluido
      - No inventes datos que no estén en el PDF
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
 
    let factura
    try {
      factura = JSON.parse(cleanJson)
    } catch {
      console.error('❌ Gemini devolvió JSON inválido:', cleanJson.substring(0, 200))
      return NextResponse.json(
        { error: 'La IA no pudo procesar la factura. Inténtalo de nuevo.' },
        { status: 422 }
      )
    }
 
    // 7. Validar campos mínimos
    if (!factura.proveedor || !factura.total) {
      return NextResponse.json(
        { error: 'No se pudieron extraer los datos básicos de la factura' },
        { status: 422 }
      )
    }
 
    // 8. Limpiar y normalizar datos
    const facturaLimpia = {
      proveedor: factura.proveedor?.trim(),
      numero_factura: factura.numero_factura?.trim() || 'S/N',
      fecha: factura.fecha || new Date().toISOString().split('T')[0],
      referencia_obra: factura.referencia_obra || 'ALMACÉN',
      base_imponible: parseFloat(factura.base_imponible) || 0,
      iva_porcentaje: parseFloat(factura.iva_porcentaje) || 21,
      iva_total: parseFloat(factura.iva_total) || 0,
      total: parseFloat(factura.total) || 0,
      lineas_factura: Array.isArray(factura.lineas_factura)
        ? factura.lineas_factura.map((l: any) => ({
            codigo: l.codigo || null,
            descripcion: l.descripcion?.trim() || 'Sin descripción',
            cantidad: parseFloat(l.cantidad) || 0,
            unidad: l.unidad?.trim() || 'UDS',
            precio_unitario: parseFloat(l.precio_unitario) || 0,
            descuento: parseFloat(l.descuento) || 0,
            importe: parseFloat(l.importe) || 0,
          }))
        : []
    }
 
    return NextResponse.json({
      success: true,
      factura: facturaLimpia
    })
 
  } catch (error: any) {
    console.error('❌ [ANALIZAR FACTURA ERROR]:', error.message)
    return NextResponse.json(
      { error: 'Error interno: ' + error.message },
      { status: 500 }
    )
  }
}