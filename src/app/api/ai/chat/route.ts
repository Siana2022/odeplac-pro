import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

// Inicializamos con la API KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();
    const supabase = await createClient();
    
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);

    const systemPrompt = getSystemInstruction({ cliente, obras });
    
    // ✅ CORRECCIÓN: Quitamos la versión explícita para evitar el error 404
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const history = (messages || []).map((m: any, i: number) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: i === 0 && m.role === 'user' ? `[SISTEMA: ${systemPrompt}]\n\nUSUARIO: ${m.content}` : (m.content || m.parts?.[0]?.text || '') }]
    }));

    const result = await model.generateContentStream({ contents: history });
    const encoder = new TextEncoder();

    return new Response(new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (streamError) {
          console.error("Error en el stream de Gemini:", streamError);
        } finally {
          controller.close();
        }
      },
    }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (error: any) {
    console.error("Error en API Chat:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}