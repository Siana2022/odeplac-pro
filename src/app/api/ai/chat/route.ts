import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();

    // 1. Forzamos la configuración dentro del POST para que no haya fugas de versión
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
    });

    const supabase = await createClient();

    // 2. Datos reales de Supabase
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materialesDisponibles } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materialesDisponibles || []
    });

    // 3. LLAMADA DIRECTA AL MODELO (Sin prefijos raros)
    const result = await streamText({
      model: google('gemini-1.5-flash'), // El SDK manejará la versión v1 automáticamente
      messages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('AI ERROR:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
