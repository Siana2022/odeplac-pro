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

    // 1. CARGA COMPLETA DE DATOS
    const [ { data: clientes }, { data: obras }, { data: proveedores } ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo, estado'),
      supabase.from('proveedores').select('nombre, categoria')
    ]);

    // 2. PRE-PROCESADO ESTRICTO
    const txtObras = obras?.map(o => `${o.titulo} (${o.estado})`).join(", ") || "No hay obras";
    const txtClientes = clientes?.map(c => c.nombre).join(", ") || "No hay clientes";
    const txtProv = proveedores?.map(p => `${p.nombre} (${p.categoria || 'General'})`).join(", ") || "No hay proveedores registrados";

    // 3. EL PROMPT DE "CAJONES ESTANCOS"
    // Le decimos que si pregunta por X, use SOLO el dato X.
    const finalPrompt = `Eres el asistente de OMAYRA. Usa SOLO estos datos:

LISTA_OBRAS: ${txtObras}
LISTA_CLIENTES: ${txtClientes}
LISTA_PROVEEDORES: ${txtProv}

Regla: Si pregunta por proveedores, responde SOLO con LISTA_PROVEEDORES. No menciones clientes.
Pregunta: ${userPrompt}
Respuesta corta:`;

    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:1.7b",
        prompt: finalPrompt,
        stream: false,
        options: {
          temperature: 0, 
          num_predict: 100,
          stop: ["LISTA_", "Regla:"]
        }
      })
    });

    if (!response.ok) throw new Error("Error");
    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.response.trim() 
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Procesando..." }, { status: 200 });
  }
}