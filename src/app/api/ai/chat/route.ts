import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { messages } = await req.json();
    const supabase = await createClient();
    
    const [mats] = await Promise.all([
      supabase.from('materiales').select('nombre, precio_coste, unidad')
    ]);

    const listaMateriales = mats.data?.map(m => `- ${m.nombre}: ${m.precio_coste}€/${m.unidad}`).join('\n') || "";

    const systemPrompt = `
      Eres el ASISTENTE TÉCNICO de Juanjo en ODEPLAC. 
      
      MATERIALES Y PRECIOS:
      ${listaMateriales}

      INSTRUCCIONES:
      1. Si Juanjo te pide un cálculo, responde con una tabla Markdown clara.
      2. No hace falta que preguntes por el nombre del cliente, Juanjo lo seleccionará directamente desde un menú en la pantalla.
      3. Sé directo y profesional.
    `;

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (contents.length > 0) {
      contents[0].parts[0].text = `${systemPrompt}\n\nPregunta: ${contents[0].parts[0].text}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

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
              if (content) controller.enqueue(encoder.encode(content));
            } catch (e) {}
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}