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

    // 1. CARGA DE TODAS LAS TABLAS
    const [
      { data: clientes }, 
      { data: obras },
      { data: proveedores },
      { data: materiales }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo, estado'),
      supabase.from('proveedores').select('nombre, categoria'),
      supabase.from('materiales').select('nombre, precio_coste').limit(20)
    ]);

    // 2. FORMATEO DE LISTAS (Para que la IA no se pierda)
    const listaClientes = clientes?.map(c => c.nombre).join(", ") || "Ninguno";
    const listaObras = obras?.map(o => `${o.titulo} (${o.estado || 'Sin estado'})`).join(" | ") || "Ninguna";
    const listaProv = proveedores?.map(p => p.nombre).join(", ") || "Ninguno";
    const listaMat = materiales?.map(m => m.nombre).join(", ") || "Sin stock";

    // 3. PROMPT DE "RESPUESTA FORZADA"
    // Aquí le damos los datos masticados para que no pueda decir que "no los ve"
    const finalPrompt = `Eres OdeplacAI. Tu jefa es OMAYRA. 
    
DATOS DE LA EMPRESA QUE DEBES USAR:
- Clientes (${clientes?.length || 0}): ${listaClientes}
- Obras (${obras?.length || 0}): ${listaObras}
- Proveedores (${proveedores?.length || 0}): ${listaProv}
- Materiales: ${listaMat}

INSTRUCCIÓN: Omayra te pregunta: "${userPrompt}". 
Responde de forma muy directa en español. Si pregunta cuántos, dile el número exacto.
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
          temperature: 0.1,
          num_predict: 100
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
    return NextResponse.json({ error: "Reintentando conexión..." }, { status: 200 });
  }
}