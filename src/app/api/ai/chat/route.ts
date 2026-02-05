import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { messages } = await req.json();
    const supabase = await createClient();
    
    const [mats, obs] = await Promise.all([
      supabase.from('materiales').select('nombre, precio_coste, unidad'),
      supabase.from('obras').select('titulo, estado, porcentaje_avance, total_presupuesto')
    ]);

    const listaMateriales = mats.data?.map(m => `- ${m.nombre}: ${m.precio_coste}€/${m.unidad}`).join('\n');
    const listaObras = obs.data?.map(o => `- ${o.titulo}: ${o.estado} (${o.porcentaje_avance}%)`).join('\n');

    const systemPrompt = `
      Eres el ASISTENTE TÉCNICO de Juanjo en ODEPLAC PRO. 
      
      DATOS:
      ${listaMateriales}
      ${listaObras}

      REGLAS DE FORMATO (ESTRICTAS):
      1. PROHIBIDO usar etiquetas HTML (como <br>, <b>, <table>).
      2. Usa SOLO Markdown puro. 
      3. Para las tablas, usa este formato exacto y deja una línea en blanco antes y después:
      
      | Concepto | Cantidad | Precio | Total |
      | :--- | :--- | :--- | :--- |
      | Texto | Numero | Numero | Numero |

      4. Si no hay datos, dilo claramente sin inventar.
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