import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { messages } = await req.json();
    const supabase = await createClient();
    
    // 1. CONSULTA DE DATOS (Asegurando nombres exactos de tu radiografía)
    const [mats, obs] = await Promise.all([
      supabase.from('materiales').select('nombre, precio_coste, unidad'),
      supabase.from('obras').select('titulo, estado, porcentaje_avance, total_presupuesto')
    ]);

    // 2. FORMATEO DEL CATÁLOGO PARA LA IA (Sin fallos de undefined)
    const listaMateriales = mats.data?.map(m => 
      `- ${m.nombre}: ${m.precio_coste}€ por ${m.unidad}`
    ).join('\n') || "No hay materiales registrados.";

    const listaObras = obs.data?.map(o => 
      `- ${o.titulo}: Estado ${o.estado} (${o.porcentaje_avance}% avance)`
    ).join('\n') || "No hay obras activas.";

    // 3. INSTRUCCIONES MAESTRAS DE FORMATO
    const systemPrompt = `
      Eres el ASISTENTE TÉCNICO de Juanjo en ODEPLAC PRO. 
      
      DATOS DE LA EMPRESA:
      ${listaMateriales}
      ${listaObras}

      REGLAS DE RESPUESTA:
      1. Juanjo es el jefe. Sé directo y profesional.
      2. Si te pide un cálculo o presupuesto, preséntalo SIEMPRE en una TABLA de Markdown.
      3. Cada concepto debe ir en una fila distinta.
      4. Incluye una fila final con el "TOTAL ESTIMADO" en negrita.
      5. Usa los precios de la lista: Placa Estándar (6.50€), Montante (4.15€), etc.
    `;

    // 4. PREPARAR MENSAJE PARA GEMINI
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (contents.length > 0) {
      contents[0].parts[0].text = `CONTEXTO:\n${systemPrompt}\n\nPREGUNTA DE JUANJO:\n${contents[0].parts[0].text}`;
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