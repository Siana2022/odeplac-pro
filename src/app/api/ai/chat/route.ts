import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('--- USANDO LIBRERÍA NATIVA GOOGLE - HORA:', new Date().toLocaleTimeString());

  try {
    const { clienteId, messages } = await req.json();
    
    // 1. Inicializamos con la librería oficial
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 2. Configuramos el modelo con la instrucción de sistema de forma nativa
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt // Aquí la librería nativa sí sabe cómo enviarlo
    });

    // 3. Traducimos mensajes al formato de Google
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: typeof m.content === 'string' ? m.content : m.parts?.[0]?.text || '' }],
    }));

    const userMessage = messages[messages.length - 1].content;

    // 4. Llamada en streaming
    const geminiStream = await model.generateContentStream({
      contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
    });

    // 5. Convertimos a stream compatible con tu interfaz
    const stream = GoogleGenerativeAIStream(geminiStream);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error('ERROR NATIVO:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
