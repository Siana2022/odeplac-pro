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

    // 1. CARGA DE DATOS (Solo lo necesario para no saturar)
    const [ { data: clientes }, { data: obras } ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo, estado')
    ]);

    // 2. CONSTRUCCIÓN DE RESPUESTA DIRECTA (Pre-procesada)
    // Le damos la respuesta casi escrita para que no tenga que "razonar"
    const infoObras = obras?.map(o => `${o.titulo} (${o.estado})`).join(", ") || "No hay obras";
    const infoClientes = clientes?.map(c => c.nombre).join(", ") || "No hay clientes";

    // 3. PROMPT "SIN CEREBRO" (Solo instrucciones de flujo)
    const finalPrompt = `Instrucción: Eres el secretario de OMAYRA. 
Datos:
- Tienes ${obras?.length || 0} obras: ${infoObras}
- Tienes ${clientes?.length || 0} clientes: ${infoClientes}

Pregunta: ${userPrompt}
Respuesta corta en español:`;

    // 4. LLAMADA A OLLAMA
    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:1.7b",
        prompt: finalPrompt,
        stream: false,
        options: {
          temperature: 0, // Precisión absoluta, cero creatividad
          num_predict: 80,
          stop: ["Instrucción:", "Pregunta:"]
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