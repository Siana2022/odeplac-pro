import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const body = await req.json();
    const rawMessages = body.messages || [];

    // 1. CARGA MASIVA DE LAS 5 TABLAS (Configuradas para consulta profunda)
    const [
      { data: clientes }, 
      { data: materiales },
      { data: seguimiento },
      { data: obras },
      { data: proveedores }
    ] = await Promise.all([
      supabase.from('clientes').select('*'),
      // Limitamos a 200 materiales para asegurar que quepan los proveedores y seguimientos en el límite de Groq
      supabase.from('materiales').select('nombre, precio_coste, categoria, unidad').limit(200),
      supabase.from('obra_seguimiento').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('obras').select('*, clientes(nombre)'),
      supabase.from('proveedores').select('*')
    ]);

    console.log(`--- 📊 ODEPLACAI CARGA TOTAL ---`);
    console.log(`Proveedores encontrados: ${proveedores?.length || 0}`);

    // 2. CONSTRUCCIÓN DEL SYSTEM PROMPT CON TODAS LAS TABLAS
    const systemPrompt = `Eres OdeplacAI, la Consultora Estratégica de Odeplac Pro. Tu interlocutora es OMAYRA.
    Tienes acceso a toda la información de la empresa. Úsala para responder con precisión:

    TABLA CLIENTES:
    ${JSON.stringify(clientes || [])}

    TABLA MATERIALES (Nombre, Coste, Categoría, Unidad):
    ${JSON.stringify(materiales || [])}

    TABLA OBRA_SEGUIMIENTO (Últimos mensajes y estados):
    ${JSON.stringify(seguimiento || [])}

    TABLA OBRAS (Información de proyectos y presupuestos):
    ${JSON.stringify(obras || [])}

    TABLA PROVEEDORES (Información completa):
    ${JSON.stringify(proveedores || [])}

    INSTRUCCIONES:
    - OMAYRA es tu interlocutora. Sé profesional y ejecutiva.
    - Si te pregunta por PROVEEDORES, busca en la TABLA PROVEEDORES y dáselos todos.
    - Si te pregunta por MATERIALES, busca en su tabla correspondiente (nombres técnicos y costes).
    - Para el seguimiento de obras, cruza la información de OBRAS con OBRA_SEGUIMIENTO.
    - No inventes datos. Si algo no aparece, di: "Omayra, no veo registros de ese dato en las tablas de la base de datos".`;

    // 3. LLAMADA A GROQ
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...rawMessages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.1, // Máxima precisión
    });

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: response.choices[0]?.message?.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO ODEPLACAI:", error.message);
    return NextResponse.json({ error: "Error al consultar las bases de datos." }, { status: 500 });
  }
}