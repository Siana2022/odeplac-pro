import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];
    const userPrompt = rawMessages[rawMessages.length - 1].content.toLowerCase();

    // 1. CARGA DE DATOS
    const [ { data: clientes }, { data: obras } ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo, estado')
    ]);

    // 2. CREACIÓN DE BLOQUES AISLADOS
    // Usamos separadores visuales que la IA entiende como "esto es una cosa y esto es otra"
    const bloqueClientes = `### LISTA DE CLIENTES (Total: ${clientes?.length}):\n${clientes?.map(c => `- ${c.nombre}`).join("\n")}`;
    const bloqueObras = `### LISTA DE OBRAS (Total: ${obras?.length}):\n${obras?.map(o => `- ${o.titulo} (Estado: ${o.estado})`).join("\n")}`;

    // 3. PROMPT DE "EXTRACCIÓN PURA"
    const finalPrompt = `Eres OdeplacAI. Responde a OMAYRA.
    
USA EXCLUSIVAMENTE ESTOS BLOQUES:

${bloqueClientes}

${bloqueObras}

INSTRUCCIÓN: Si Omayra pregunta por OBRAS, mira SOLO el bloque de OBRAS. Si pregunta por CLIENTES, mira SOLO el bloque de CLIENTES. No mezcles.
Pregunta: ${userPrompt}
Respuesta:`;

    // 4. LLAMADA A OLLAMA
    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:1.7b",
        prompt: finalPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Al mínimo para que no invente nada
          num_predict: 120
        }
      })
    });

    if (!response.ok) throw new Error("Error servidor");
    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.response.trim() 
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Reintentando..." }, { status: 200 });
  }
}