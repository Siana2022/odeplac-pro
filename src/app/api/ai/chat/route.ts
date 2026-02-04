import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

// Inicializamos la librería nativa
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('--- FORZANDO V1 NATIVO - HORA:', new Date().toLocaleTimeString());

  try {
    const { clienteId, messages } = await req.json();
    
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 🚀 EL CAMBIO CLAVE: Forzamos 'v1' en el segundo parámetro
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' } // <--- ESTO OBLIGA A SALIR DE LA BETA
    );

    const history = (messages || []).slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text || '') }],
    }));

    const lastMessage = messages[messages.length - 1];
    const userContent = typeof lastMessage.content === 'string' ? lastMessage.content : (lastMessage.parts?.[0]?.text || 'Hola');

    const result = await model.generateContentStream({
      contents: [...history, { role: 'user', parts: [{ text: userContent }] }],
      systemInstruction: systemPrompt
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('ERROR FINAL:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
