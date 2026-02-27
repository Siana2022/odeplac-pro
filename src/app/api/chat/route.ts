import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Esto es CRÍTICO: le dice a Vercel que no se rinda si el VPS tarda en responder
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    // CARGA DE DATOS (Mantenemos los filtros de tus 8 clientes)
    const [
      { data: clientes }, 
      { data: materiales },
      { data: obras }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('materiales').select('nombre, precio_coste').ilike('nombre', '%placa%').limit(20),
      supabase.from('obras').select('titulo, estado')
    ]);

    const systemPrompt = `Eres OdeplacAI. Interlocutora: OMAYRA. 
    Clientes (${clientes?.length || 0}): ${clientes?.map(c => c.nombre).join(", ")}. 
    Responde muy breve.`;

    // LLAMADA A TU OLLAMA (Cambiado a phi3.5 que es mucho más rápido en CPU)
    const response = await fetch("http://5.189.161.169:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3.5", 
        messages: [
          { role: "system", content: systemPrompt },
          ...rawMessages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: false 
      })
    });

    if (!response.ok) throw new Error("Ollama no responde");
    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.message.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    return NextResponse.json({ error: "OdeplacAI procesando... reintenta en un momento." }, { status: 500 });
  }
}