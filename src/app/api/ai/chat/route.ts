import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Inicializamos la API fuera del handler para mayor rapidez
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  console.log('--- INTENTO DEFINITIVO TRAS PAUSA - V1 ---');

  try {
    const { clienteId, messages } = await req.json();
    
    // 1. Conexión a Supabase
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 2. Configuración del modelo SIN campos experimentales
    // En la v1 estable, las instrucciones de sistema se pasan de forma especial
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' }
    );

    // 3. Formateo de historial compatible con v1
    const history = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text || '') }],
    }));

    // 4. Inyectamos el sistema como el primer mensaje del historial si es necesario
    // O mejor aún, usamos el parámetro nativo pero bien formado
    const result = await model.generateContentStream({
      contents: history,
      systemInstruction: { parts: [{ text: systemPrompt }] } // <--- ESTO es lo que la v1 espera
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
    console.error('ERROR EN EL ÚLTIMO INTENTO:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
