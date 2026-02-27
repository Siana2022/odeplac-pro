import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Le damos 60 segundos de margen a Vercel
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    // 1. CARGA DE DATOS (Mantenemos la precisión de tus 8 clientes)
    const [
      { data: clientes }, 
      { data: materiales },
      { data: obras }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('materiales').select('nombre').ilike('nombre', '%placa%').limit(20),
      supabase.from('obras').select('titulo, estado')
    ]);

    // 2. SYSTEM PROMPT (Ultra-Directo para TinyLlama)
    const systemPrompt = `Eres OdeplacAI. Interlocutora: OMAYRA.
    - CLIENTES (${clientes?.length || 0}): ${clientes?.map(c => c.nombre).join(", ")}
    - OBRAS (${obras?.length || 0}): ${obras?.map(o => o.titulo).join(", ")}
    - PLACAS: ${materiales?.map(m => m.nombre).join(", ")}
    INSTRUCCIÓN: Responde siempre en español, muy breve y directo.`;

    // 3. LLAMADA A TU OLLAMA (Cambiado a TinyLlama para velocidad)
    const response = await fetch("http://5.189.161.169:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tinyllama", 
        messages: [
          { role: "system", content: systemPrompt },
          ...rawMessages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: false 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error de Ollama:", errorText);
      throw new Error("Servidor lento");
    }

    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.message.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR ODEPLACAI:", error.message);
    return NextResponse.json(
      { error: "OdeplacAI está pensando... Reintenta en 5 segundos." }, 
      { status: 500 }
    );
  }
}