import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const groq = new OpenAI({ 
      apiKey: process.env.GROQ_API_KEY, 
      baseURL: "https://api.groq.com/openai/v1" 
    });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    // CARGA DE DATOS OPTIMIZADA (Para evitar el error 429 de Groq)
    const [
      { data: clientes }, 
      { data: materiales },
      { data: seguimiento },
      { data: obras },
      { data: proveedores }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').limit(15),
      supabase.from('materiales').select('nombre, precio_coste').limit(50), // Reducido para ahorrar tokens
      supabase.from('obra_seguimiento').select('mensaje').order('created_at', { ascending: false }).limit(5),
      supabase.from('obras').select('titulo, estado').limit(15),
      supabase.from('proveedores').select('nombre').limit(10)
    ]);

    const systemPrompt = `Eres OdeplacAI, consultora experta de Odeplac Pro. 
    ESTÁS HABLANDO CON OMAYRA. 
    DATOS REALES DE HOY:
    - Obras activas: ${obras?.map(o => o.titulo).join(", ")}
    - Clientes: ${clientes?.map(c => c.nombre).join(", ")}
    - Proveedores: ${proveedores?.map(p => p.nombre).join(", ")}
    - Lista Materiales (extracto): ${materiales?.map(m => m.nombre).join(", ")}
    - Últimos hitos: ${seguimiento?.map(s => s.mensaje).join(" | ")}

    Responde siempre de forma profesional, amable y muy concisa. No uses markdown complejo.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...rawMessages
      ],
      temperature: 0.2,
      max_tokens: 400
    });

    return NextResponse.json({ 
      role: "assistant", 
      content: response.choices[0]?.message?.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO ODEPLACAI:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}