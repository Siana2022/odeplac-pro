import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();
    
    // USAMOS LA CONFIGURACIÓN MÁS DIRECTA POSIBLE
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
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

    // 🚀 CAMBIO RADICAL: GEMINI 2.0 FLASH
    // Este modelo es el actual estándar de Google y debería saltarse cualquier error de "Not Found"
    const result = await streamText({
      model: google('gemini-2.0-flash'), 
      messages: formattedMessages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('AI ERROR:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
