import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    // 1. CARGA DE DATOS DESDE SUPABASE
    const [
      { data: clientes }, 
      { data: materiales },
      { data: obras }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('materiales').select('nombre, precio_coste').ilike('nombre', '%placa%').limit(50),
      supabase.from('obras').select('titulo, estado')
    ]);

    const systemPrompt = `Eres OdeplacAI. Interlocutora: OMAYRA.
    - Clientes reales: ${clientes?.map(c => c.nombre).join(", ")}
    - Obras: ${obras?.map(o => o.titulo).join(", ")}
    - Materiales: ${materiales?.map(m => m.nombre).join(", ")}
    Responde de forma muy breve.`;

    // 2. LLAMADA A TU PROPIO SERVIDOR OLLAMA (CONTABO)
    const response = await fetch("http://5.189.161.169:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:3b",
        messages: [
          { role: "system", content: systemPrompt },
          ...rawMessages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: false // Para que la respuesta llegue completa de una vez
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
    console.error("❌ ERROR EN TU SERVIDOR:", error.message);
    return NextResponse.json({ error: "OdeplacAI está descansando... (Ollama error)" }, { status: 500 });
  }
}