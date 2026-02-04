import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

// Forzamos el uso de la versión estable de la API de Google
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();
    
    // 1. Obtener datos de Supabase
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 2. Configurar el modelo (Usando la sintaxis nativa de 2026)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt 
    });

    // 3. Preparar el historial
    const history = (messages || []).slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text || '') }],
    }));

    const lastMessage = messages[messages.length - 1];
    const userContent = typeof lastMessage.content === 'string' ? lastMessage.content : (lastMessage.parts?.[0]?.text || 'Hola');

    // 4. Iniciar el stream nativo
    const result = await model.generateContentStream({
      contents: [...history, { role: 'user', parts: [{ text: userContent }] }],
    });

    // 5. Convertir a un stream que el navegador entienda (sin usar 'ai' SDK roto)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            controller.enqueue(encoder.encode(chunkText));
          }
        }
        controller.close();
      },
    });

    // 6. Devolver la respuesta de stream estándar
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('ERROR EN EL DEPLOY:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
