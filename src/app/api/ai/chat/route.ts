import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();
    
    // Verificamos si la API KEY llega (lo verás en los logs de Vercel)
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    console.log('API Key presente:', !!apiKey);

    const google = createGoogleGenerativeAI({ apiKey });

    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 🛡️ FORMATEO DE MENSAJES PARA EVITAR EL ERROR DE SCHEMA
    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : (m.content?.[0]?.text || m.parts?.[0]?.text || '')
    }));

    // 🚀 MODELO COMPATIBLE 100% (gemini-1.5-flash-latest)
    const result = await streamText({
      model: google('gemini-1.5-flash-latest'), // Usar '-latest' fuerza a Google a buscar la versión más activa
      messages: formattedMessages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('DETALLE DEL ERROR:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
