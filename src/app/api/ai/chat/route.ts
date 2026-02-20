import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { messages } = await req.json();
    
    // Inicializamos cliente de Supabase (Server Side) con el helper que acabamos de validar
    const supabase = await createClient();
    
    // Obtenemos los materiales reales de la base de datos según el esquema definido
    const { data: mats, error: dbError } = await supabase
      .from('materiales')
      .select('nombre, precio_unitario, unidad, categoria');

    if (dbError) {
      console.error('Error obteniendo materiales:', dbError);
    }

    // Construimos la lista de precios para el contexto de la IA basándonos en el esquema
    const listaMateriales = mats?.map(m => `- ${m.nombre} (${m.categoria || 'General'}): ${m.precio_unitario}€/${m.unidad}`).join('\n') || "";

    const systemPrompt = `
      Eres el ASISTENTE TÉCNICO de Juanjo en ODEPLAC. 
      
      MATERIALES Y PRECIOS BASE (SIN MARGEN):
      ${listaMateriales}

      INSTRUCCIONES DE RESPUESTA:
      1. Si se solicita un presupuesto o cálculo, responde EXCLUSIVAMENTE con una tabla Markdown.
      2. Columnas obligatorias: Concepto, Cantidad, Unidad, Precio Unitario (con margen), Subtotal.
      3. IMPORTANTE: Los precios de la lista de arriba son COSTES. Debes aplicar SIEMPRE un margen de beneficio del 20% sobre esos precios (Precio Venta = Coste * 1.20) a menos que Juanjo indique otro margen.
      4. Al final de la tabla, incluye:
         - TOTAL BASE (Suma de subtotales)
         - IVA (21%)
         - TOTAL PRESUPUESTO (Base + IVA)
      5. No pidas datos del cliente.
      6. Usa un tono técnico, preciso y directo.
    `;

    // Mapeo de mensajes al formato de Google Generative AI
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    // Inyectamos el System Prompt como instrucción de contexto inicial
    if (contents.length > 0) {
      contents[0].parts[0].text = `${systemPrompt}\n\nPregunta de Juanjo: ${contents[0].parts[0].text}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          generationConfig: {
            temperature: 0.1, // Reducimos a 0.1 para máxima consistencia en cálculos
            topP: 0.8,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API Error: ${response.status} - ${errorText}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.substring(6));
              const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {
              // Fin de stream o línea malformada
            }
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}