import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const body = await req.json();
    const rawMessages = body.messages || [];

    // 1. CARGA DE TABLAS (Reducida para evitar el error 429)
    const [
      { data: clientes }, 
      { data: materiales },
      { data: seguimiento },
      { data: obras },
      { data: proveedores }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').limit(20),
      // Bajamos a 100 materiales para no saturar el Rate Limit
      supabase.from('materiales').select('nombre, precio_coste, categoria').limit(100),
      supabase.from('obra_seguimiento').select('mensaje').limit(5),
      supabase.from('obras').select('titulo, estado'),
      supabase.from('proveedores').select('nombre').limit(10)
    ]);

    const systemPrompt = `Eres OdeplacAI, consultora de Odeplac Pro. Hablas con OMAYRA.
    DATOS ACTUALES:
    - Clientes: ${clientes?.map(c => c.nombre).join(", ")}
    - Obras: ${obras?.map(o => o.titulo + "(" + o.estado + ")").join(", ")}
    - Proveedores: ${proveedores?.map(p => p.nombre).join(", ")}
    - Muestra Materiales: ${materiales?.map(m => m.nombre + "(" + m.precio_coste + "€)").join(", ")}
    - Últimos hitos: ${seguimiento?.map(s => s.mensaje).join(" | ")}

    REGLA: Responde de forma muy breve y directa para ahorrar recursos.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...rawMessages
      ],
      temperature: 0.1,
      max_tokens: 500 // Respuesta corta para evitar bloqueos
    });

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: response.choices[0]?.message?.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR EN API:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}