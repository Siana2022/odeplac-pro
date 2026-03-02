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
    const userPrompt = rawMessages[rawMessages.length - 1].content;

    // 1. CARGA MASIVA DE TODA LA EMPRESA (Optimizado para no saturar al pequeñín SmolLM2)
    const [
      { data: clientes }, 
      { data: obras },
      { data: proveedores },
      { data: materiales }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre, email, telefono').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo, estado'),
      supabase.from('proveedores').select('nombre, categoria'),
      supabase.from('materiales').select('nombre, precio_coste, unidad').limit(50)
    ]);

    // 2. CONSTRUCCIÓN DE LA "MEMORIA" DE ODEPLAC
    const contextEmpresa = `
DATOS DE ODEPLAC PRO PARA OMAYRA:
- CLIENTES (${clientes?.length || 0}): ${clientes?.map(c => `${c.nombre} (${c.email || 'sin email'})`).join(", ")}
- OBRAS ACTIVAS (${obras?.length || 0}): ${obras?.map(o => `${o.titulo} [Estado: ${o.estado}]`).join(" | ")}
- PROVEEDORES (${proveedores?.length || 0}): ${proveedores?.map(p => `${p.nombre} (${p.categoria || 'general'})`).join(", ")}
- INVENTARIO MATERIALES: ${materiales?.map(m => `${m.nombre} (${m.precio_coste}€/${m.unidad})`).join(", ")}
`;

    // 3. PROMPT ESTRUCTURADO DE AUTORIDAD
    const finalPrompt = `<|system|>
Eres OdeplacAI, la consultora estratégica de ODEPLAC. Tu jefa es OMAYRA.
Usa estos datos reales para responder:
${contextEmpresa}

REGLAS:
1. Responde siempre en ESPAÑOL y sé muy breve (máximo 3 frases).
2. Si Omayra pregunta por clientes, da el número exacto (${clientes?.length}).
3. Si pregunta por obras, menciona su estado actual.
4. Si no sabes un dato, di: "Omayra, no veo ese dato en la base de datos".
5. No inventes proveedores ni materiales.
<|user|>
${userPrompt}
<|assistant|>`;

    // 4. LLAMADA A TU SERVIDOR (SmolLM2 es el que mejor procesa estas listas)
    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:1.7b",
        prompt: finalPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 150,
          stop: ["<|user|>", "<|assistant|>", "</s>"]
        }
      })
    });

    if (!response.ok) throw new Error("Servidor ocupado");

    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.response.trim() 
    });

  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    return NextResponse.json({ error: "Servidor procesando datos... Reintenta." }, { status: 200 });
  }
}