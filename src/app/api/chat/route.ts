import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Tiempo de espera máximo para Vercel
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

    // 2. FILTRO SELECTIVO (El "muro" de datos para evitar mezclas)
    let contextoEspecifico = "";
    
    if (userPrompt.includes("obra") || userPrompt.includes("proyecto") || userPrompt.includes("estado")) {
      // Priorizamos Título y ESTADO
      contextoEspecifico = `DATOS DE OBRAS Y SUS ESTADOS ACTUALES: ${obras?.map(o => `Obra: ${o.titulo} -> Estado: ${o.estado || 'Pendiente'}`).join(" | ")}`;
    } 
    else if (userPrompt.includes("cliente")) {
      contextoEspecifico = `LISTA DE CLIENTES REGISTRADOS: ${clientes?.map(c => c.nombre).join(", ")}`;
    } 
    else if (userPrompt.includes("proveedor")) {
      contextoEspecifico = `LISTA DE PROVEEDORES Y CATEGORÍAS: ${proveedores?.map(p => `${p.nombre} (${p.categoria || 'General'})`).join(", ")}`;
    } 
    else if (userPrompt.includes("material") || userPrompt.includes("stock") || userPrompt.includes("placa") || userPrompt.includes("precio")) {
      contextoEspecifico = `INVENTARIO DE MATERIALES Y PRECIOS: ${materiales?.map(m => `${m.nombre} (${m.precio_coste}€)`).join(", ")}`;
    } 
    else {
      // Resumen general si no hay palabra clave clara
      contextoEspecifico = `RESUMEN GENERAL PARA OMAYRA: Tienes ${clientes?.length} clientes, ${obras?.length} obras activas, ${proveedores?.length} proveedores y ${materiales?.length} tipos de materiales.`;
    }

    // 3. PROMPT ESTRUCTURADO PARA SMOL-LM2
    const finalPrompt = `Eres el asistente de OMAYRA en ODEPLAC. 
USA EXCLUSIVAMENTE ESTA INFORMACIÓN:
${contextoEspecifico}

Pregunta de Omayra: ${userPrompt}
Respuesta corta y directa en español:`;

    // 4. LLAMADA AL SERVIDOR OLLAMA (CONTABO)
    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:1.7b",
        prompt: finalPrompt,
        stream: false,
        options: {
          temperature: 0, // Cero creatividad para evitar inventos
          num_predict: 100
        }
      })
    });

    if (!response.ok) throw new Error("Error en la respuesta del servidor Ollama");

    const data = await response.json();

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.response.trim() 
    });

  } catch (error: any) {
    console.error("❌ ERROR API CHAT:", error.message);
    return NextResponse.json(
      { error: "Omayra, estoy procesando los datos. Por favor, reintenta en un momento." }, 
      { status: 200 }
    );
  }
}