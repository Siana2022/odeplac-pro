import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Esto es vital para evitar el error 504
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];
    const userPrompt = rawMessages[rawMessages.length - 1].content;

    // 1. CARGA RÁPIDA DE DATOS
    const [ { data: clientes }, { data: obras } ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo')
    ]);

    // 2. PROMPT DIRECTO (Sin vueltas para que la IA responda en milisegundos)
    const context = `Clientes(${clientes?.length || 0}): ${clientes?.map(c => c.nombre).join(", ")}. Obras: ${obras?.map(o => o.titulo).join(", ")}.`;
    
    const finalPrompt = `Eres OdeplacAI. Responde a OMAYRA brevemente y en español.
Datos actuales: ${context}
Pregunta: ${userPrompt}
Respuesta:`;

    // 3. LLAMADA CON TIMEOUT CORTO PARA EVITAR BLOQUEOS
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:1.7b",
        prompt: finalPrompt,
        stream: false,
        options: {
          num_predict: 80,
          temperature: 0.3
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Servidor ocupado");

    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.response.replace(/<[^>]*>/g, '').trim() 
    });

  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    return NextResponse.json(
      { error: "Omayra, el servidor está tardando. Prueba a preguntar de nuevo en 3 segundos." }, 
      { status: 200 } // Devolvemos 200 para que el chat no explote con el error 'A'
    );
  }
}