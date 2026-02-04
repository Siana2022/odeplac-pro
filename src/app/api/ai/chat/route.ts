import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();
    const supabase = await createClient();
    
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);

    // ✅ FIX: Usamos "as any" y "??" para evitar errores de TypeScript
    const systemPrompt = getSystemInstruction({ 
      cliente, 
      obras: (obras as any[]) ?? [] 
    });
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const history = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    // Insertamos el prompt de sistema al principio
    if (history.length > 0) {
      history[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${history[0].parts[0].text}`;
    }

    const result = await model.generateContentStream({ contents: history });
    const encoder = new TextEncoder();

    return new Response(new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}