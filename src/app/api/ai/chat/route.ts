import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. LOG DE CONTROL PARA VER SI EL CÓDIGO SE ACTUALIZA
  console.log('--- INTENTO DE CONEXIÓN V1 - HORA:', new Date().toLocaleTimeString());

  try {
    const { clienteId, messages } = await req.json();
    
    // Forzamos la versión v1 explícitamente en el objeto de configuración
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      apiVersion: 'v1' 
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

    // 2. Usamos el nombre de modelo más estándar
    const result = await streamText({
      model: google('gemini-1.5-flash'), 
      messages: formattedMessages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('ERROR DETECTADO:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
