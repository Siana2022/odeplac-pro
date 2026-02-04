import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('--- FORZANDO CONEXIÓN V1 FINAL - HORA:', new Date().toLocaleTimeString());

  try {
    const { clienteId, messages } = await req.json();
    
    // CONFIGURACIÓN QUE BLOQUEA LA VERSIÓN V1
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1', // <--- ESTO OBLIGA A USAR V1
    });

    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text || '')
    }));

    // PROBAMOS CON EL NOMBRE TÉCNICO COMPLETO
    const result = await streamText({
      model: google('models/gemini-1.5-flash'), 
      messages: formattedMessages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('ERROR CRÍTICO:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
