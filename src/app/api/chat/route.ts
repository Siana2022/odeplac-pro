import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Tiempo máximo de ejecución para Vercel (Paid tier)
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];
    // Convertimos a minúsculas para que el filtro sea más preciso
    const userPrompt = rawMessages[rawMessages.length - 1].content.toLowerCase();

    // 1. CARGA DE DATOS DESDE SUPABASE
    const [
      { data: clientes }, 
      { data: obras }, 
      { data: proveedores },
      { data: materiales }
    ] = await Promise.all([
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      supabase.from('obras').select('titulo, estado'),
      supabase.from('proveedores').select('nombre, categoria'),
      supabase.from('materiales').select('nombre, precio_coste').limit(30)
    ]);

    // 2. FILTRO SELECTIVO (El "muro" de datos para evitar que la IA se líe)
    let contextoEspecifico = "";
    
    if (userPrompt.includes("obra") || userPrompt.includes("proyecto") || userPrompt.includes("estado")) {
      contextoEspecifico = `DATOS DE OBRAS: ${obras?.map(o => `${o.titulo} (Estado: ${o.estado || 'Pendiente'})`).join(" | ")}`;
    } 
    else if (userPrompt.includes("proveedor")) {
      contextoEspecifico = `LISTA DE PROVEEDORES: ${proveedores?.map(p => `${p.nombre} - ${p.categoria || 'General'}`).join(", ")}`;
    } 
    else if (userPrompt.includes("cliente")) {
      contextoEspecifico = `LISTA DE CLIENTES: ${clientes?.map(c => c.nombre).join(", ")}`;
    } 
    else if (userPrompt.includes("material") || userPrompt.includes("stock") || userPrompt.includes("placa") || userPrompt.includes("precio")) {
      contextoEspecifico = `INVENTARIO: ${materiales?.map(m => `${m.nombre} (${m.precio_coste}€)`).join(", ")}`;
    } 
    else {
      contextoEspecifico = `Resumen: Tienes ${clientes?.length} clientes, ${obras?.length} obras y ${proveedores?.length} proveedores.`;
    }

    // 3. PROMPT ESTRUCTURADO PARA LLAMA 3.2 1B
    const finalPrompt = `Eres OdeplacAI, el asistente inteligente de OMAYRA en la empresa ODEPLAC. 
Responde siempre en ESPAÑOL de forma profesional y muy breve.

DATOS REALES DEL SISTEMA:
${contextoEspecifico}

INSTRUCCIÓN: Responde a la pregunta usando SOLO los datos anteriores. No menciones clientes si preguntan por proveedores.

PREGUNTA DE OMAYRA: ${userPrompt}
RESPUESTA:`;

    // 4. LLAMADA AL SERVIDOR OLLAMA (CONTABO)
    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:1b", // El nuevo modelo que instalaste
        prompt: finalPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Baja creatividad = alta precisión
          num_predict: 120
        }
      })
    });

    if (!response.ok) throw new Error("Error en servidor Contabo");

    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.response.trim() 
    });

  } catch (error: any) {
    console.error("❌ ERROR API:", error.message);
    return NextResponse.json(
      { error: "Omayra, estoy actualizando los datos. Por favor, pregunta de nuevo en un segundo." }, 
      { status: 200 }
    );
  }
}