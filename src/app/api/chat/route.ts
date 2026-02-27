import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Configuración de paciencia para Vercel (60 segundos)
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    // 1. Conexión con tu base de datos Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    // 2. Carga de datos real de Odeplac Pro
    const [
      { data: clientes }, 
      { data: materiales },
      { data: obras }
    ] = await Promise.all([
      // Filtro para tus 8 clientes reales
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      // Buscamos específicamente placas y materiales
      supabase.from('materiales').select('nombre, precio_coste').ilike('nombre', '%placa%').limit(30),
      supabase.from('obras').select('titulo, estado')
    ]);

    // 3. El "Cerebro" de las instrucciones (System Prompt)
    const systemPrompt = `Eres OdeplacAI, la consultora estratégica de Odeplac Pro. 
    TU INTERLOCUTORA ES OMAYRA (tu jefa).
    
    INFORMACIÓN ACTUALIZADA DE LA BASE DE DATOS:
    - CLIENTES REGISTRADOS (${clientes?.length || 0}): ${clientes?.map(c => c.nombre).join(", ")}
    - OBRAS ACTIVAS (${obras?.length || 0}): ${obras?.map(o => `${o.titulo} (${o.estado})`).join(" | ")}
    - MATERIALES/PLACAS EN STOCK: ${materiales?.map(m => m.nombre).join(", ")}

    REGLAS ESTRICTAS DE RESPUESTA:
    1. Si OMAYRA pregunta cuántos clientes hay, responde: "Tienes ${clientes?.length || 0} clientes" y nómbralos.
    2. Si OMAYRA pregunta por las obras, usa la lista de OBRAS ACTIVAS arriba.
    3. Si te pregunta por materiales o placas, usa la lista de MATERIALES arriba.
    4. NO digas "según mis registros" o "consulte su lista". Habla con propiedad: "Tienes...", "En stock hay...".
    5. Sé ejecutiva, profesional y muy breve.`;

    // 4. Llamada a TU PROPIO SERVIDOR OLLAMA (Contabo)
    // Usamos el modelo phi3.5 por ser el más rápido en CPU
    const response = await fetch("http://5.189.161.169:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3.5", 
        messages: [
          { role: "system", content: systemPrompt },
          ...rawMessages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: false 
      })
    });

    if (!response.ok) {
      throw new Error("El servidor Ollama en Contabo no responde. Revisa si el servicio está activo.");
    }

    const data = await response.json();

    // 5. Respuesta final al ChatBox
    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: data.message.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO EN API CHAT:", error.message);
    return NextResponse.json(
      { error: "OdeplacAI está procesando datos. Por favor, reintenta en unos segundos." }, 
      { status: 500 }
    );
  }
}