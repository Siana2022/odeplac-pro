import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

// Forzamos el entorno de ejecución
export const runtime = 'nodejs';
export const maxDuration = 30;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  console.log('--- INICIANDO ODEPLAC CHAT V1 ---');

  try {
    const { clienteId, messages } = await req.json();
    
    // 1. Datos de Supabase
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 2. Inicializar Modelo
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' }
    );

    // 3. Formatear historial con inyección de sistema
    const history = (messages || []).map((m: any, index: number) => {
      let text = typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text || '');
      
      if (index === 0 && m.role === 'user') {
        text = `CONTEXTO DEL SISTEMA:\n${systemPrompt}\n\nPREGUNTA:\n${text}`;
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text }],
      };
    });

    // 4. Generar contenido en streaming
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
        } catch (err) {
          console.error("Error en el flujo:", err);
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
    console.error('ERROR CRÍTICO EN API:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
