import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { clienteId, messages } = await req.json();
    const supabase = await createClient();
    
    // 1. OBTENEMOS LOS MATERIALES (Para que la IA sepa los precios de Odeplac)
    const { data: materiales } = await supabase.from('materiales').select('*');
    
    // 2. OBTENEMOS DATOS DEL CLIENTE SI EXISTE (Para el chat específico de obra)
    let clienteData = null;
    let obrasData = [];
    
    if (clienteId && clienteId !== 'general') {
      const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
      const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
      clienteData = cliente;
      obrasData = (obras as any[]) ?? [];
    }

    // 3. CONSTRUIMOS LAS INSTRUCCIONES MAESTRAS
    const baseSystemPrompt = getSystemInstruction({ cliente: clienteData, obras: obrasData });
    
    const materialesPrompt = materiales && materiales.length > 0 
      ? `\n\nCATÁLOGO DE MATERIALES DE ODEPLAC (Usa estos precios): \n${materiales.map(m => `- ${m.nombre}: ${m.precio_unitario}€/${m.unidad_medida}`).join('\n')}`
      : "";

    const systemPrompt = `${baseSystemPrompt}${materialesPrompt}
    REGLA ADICIONAL: Eres el asistente de Juanjo en ODEPLAC. Si te preguntan por precios o presupuestos, prioriza SIEMPRE la lista de materiales anterior.`;

    // 4. PREPARAMOS LOS MENSAJES PARA GEMINI
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (contents.length > 0) {
      contents[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${contents[0].parts[0].text}`;
    }

    // 5. LLAMADA A GEMINI CON STREAMING (Mantenemos tu versión 2.5-flash)
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
    console.error("Error en Chat API:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}