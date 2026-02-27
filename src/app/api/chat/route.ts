import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const groq = new OpenAI({ 
      apiKey: process.env.GROQ_API_KEY, 
      baseURL: "https://api.groq.com/openai/v1" 
    });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    // 1. CARGA OPTIMIZADA (Para que no explote el límite de Groq en producción)
    const [
      { data: clientes }, 
      { data: materiales },
      { data: seguimiento },
      { data: obras },
      { data: proveedores }
    ] = await Promise.all([
      // Filtramos clientes para que solo cuente los que tienen nombre (tus 8 clientes reales)
      supabase.from('clientes').select('nombre').not('nombre', 'is', null).neq('nombre', ''),
      // Buscamos materiales, asegurándonos de traer las placas de yeso
      supabase.from('materiales').select('nombre, precio_coste, categoria, unidad').limit(150),
      supabase.from('obra_seguimiento').select('mensaje, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('obras').select('titulo, estado'),
      supabase.from('proveedores').select('nombre')
    ]);

    // 2. CONSTRUCCIÓN DEL SYSTEM PROMPT (Formato texto plano para ahorrar tokens)
    const systemPrompt = `Eres OdeplacAI, la Consultora Estratégica de Odeplac Pro. Tu interlocutora es OMAYRA.
    
    INFORMACIÓN REAL DE LA BASE DE DATOS:
    
    CLIENTES (${clientes?.length || 0} registrados):
    ${clientes?.map(c => c.nombre).join(", ")}

    OBRAS ACTIVAS:
    ${obras?.map(o => `${o.titulo} (Estado: ${o.estado})`).join(" | ")}

    MATERIALES Y STOCK:
    ${materiales?.map(m => `- ${m.nombre}: ${m.precio_coste}€ (${m.categoria || 'Sin categoría'})`).join("\n")}

    PROVEEDORES:
    ${proveedores?.map(p => p.nombre).join(", ")}

    ÚLTIMO SEGUIMIENTO:
    ${seguimiento?.map(s => s.mensaje).join(" || ")}

    INSTRUCCIONES IMPORTANTES PARA ODEPLACAI:
    - OMAYRA es tu jefa. Sé profesional y directa.
    - Si te pregunta por "cuántos clientes", di exactamente ${clientes?.length || 0}.
    - Si te pregunta por "placas de yeso", busca en la lista de MATERIALES arriba.
    - Si no encuentras un dato específico, di: "Omayra, no veo ese registro en las tablas, ¿lo hemos dado de alta?".
    - Responde de forma concisa para evitar errores de conexión.`;

    // 3. LLAMADA A GROQ LIMPIA
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...rawMessages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.1, // Precisión total
      max_tokens: 500   // Evita que la respuesta sea demasiado larga y corte la conexión
    });

    return NextResponse.json({ 
      id: Date.now().toString(), 
      role: "assistant", 
      content: response.choices[0]?.message?.content 
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO ODEPLACAI:", error.message);
    return NextResponse.json(
      { error: "Error de conexión con la base de datos de Odeplac." }, 
      { status: 500 }
    );
  }
}