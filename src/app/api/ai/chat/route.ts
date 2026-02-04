import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('--- MODO COMPATIBILIDAD TOTAL - HORA:', new Date().toLocaleTimeString());

  try {
    const { clienteId, messages } = await req.json();
    
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    // 1. Obtenemos las instrucciones
    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 2. Modelo limpio (sin campos extra que den error 400)
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' }
    );

    // 3. Formateamos el historial y PEGAMOS el sistema al principio del primer mensaje
    const history = (messages || []).map((m: any, index: number) => {
      let text = typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text || '');
      
      // Si es el primer mensaje del usuario, le inyectamos el contexto de Odeplac
      if (index === 0 && m.role === 'user') {
        text = `INSTRUCCIONES DE SISTEMA PARA ODEPLAC:\n${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${text}`;
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text }],
      };
    });

    // 4. Stream nativo simplificado
    const result = await model.generateContentStream({
      contents: history,
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
          console.error("Error en el flujo:", e);
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
