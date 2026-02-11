import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { messages } = await req.json();
    
    // Inicializamos cliente de Supabase (Server Side)
    const supabase = await createClient();
    
    // Obtenemos los materiales reales de la base de datos
    const { data: mats, error: dbError } = await supabase
      .from('materiales')
      .select('nombre, precio_unitario, unidad');

    if (dbError) {
      console.error('Error obteniendo materiales:', dbError);
    }

    // Construimos la lista de precios para el contexto de la IA
    const listaMateriales = mats?.map(m => `- ${m.nombre}: ${m.precio_unitario}€/${m.unidad}`).join('\n') || "";

    const systemPrompt = `
      Eres el ASISTENTE TÉCNICO de Juanjo en ODEPLAC. 
      
      MATERIALES Y PRECIOS ACTUALES EN BASE DE DATOS:
      ${listaMateriales}

      INSTRUCCIONES DE RESPUESTA:
      1. Si Juanjo te pide un presupuesto o cálculo, responde SIEMPRE con una tabla Markdown clara.
      2. La tabla debe tener columnas: Concepto, Cantidad, Unidad, Precio Unitario, Subtotal.
      3. Aplica un margen de beneficio del 20% sobre los precios de la lista si no se especifica otro.
      4. No preguntes por el nombre del cliente; Juanjo lo gestiona desde la interfaz.
      5. Sé directo, técnico y profesional.
      6. Al final de la tabla indica el TOTAL sin IVA y el TOTAL con IVA (21%).
    `;

    // Mapeo de mensajes al formato de Google Generative AI
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    // Inyectamos el System Prompt en el primer mensaje para dar contexto
    if (contents.length > 0) {
      contents[0].parts[0].text = `${systemPrompt}\n\nPregunta del usuario: ${contents[0].parts[0].text}`;
    }

    // Llamada a la API de Google Gemini 2.0 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          generationConfig: {
            temperature: 0.2, // Baja temperatura para mayor precisión técnica
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
    
    // Transformamos el flujo SSE de Google a texto plano para el frontend
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
              // Ignorar líneas malformadas o finales de stream
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