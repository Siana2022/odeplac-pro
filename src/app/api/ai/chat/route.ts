import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    // 🕵️‍♂️ CHIVATO: Esto saldrá en los logs de Vercel
    console.log(`Verificando llave: termina en ...${key.slice(-4)}`);
    
    const { clienteId, messages } = await req.json();
    const supabase = await createClient();
    
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);

    const systemPrompt = getSystemInstruction({ 
      cliente, 
      obras: (obras as any[]) ?? [] 
    });
    
    // 🚀 CAMBIO DE MODELO: Probamos con la versión "latest" o "gemini-pro"
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const history = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (history.length > 0) {
      history[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${history[0].parts[0].text}`;
    }

    const result = await model.generateContentStream({ contents: history });
    const encoder = new TextEncoder();

    return new Response(new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (e) {
          console.error("Error en stream:", e);
        } finally {
          controller.close();
        }
      },
    }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (error: any) {
    console.error("Error completo:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}