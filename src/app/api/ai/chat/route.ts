import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  apiVersion: 'v1',
});

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();

    if (!clienteId) return new Response('clienteId is required', { status: 400 });

    const supabase = await createClient();

    // 1. Datos de Supabase
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_unitario, unidad').limit(100);

    const systemPrompt = getSystemInstruction({
      cliente: cliente || {},
      obras: obras || [],
      materialesDisponibles: materiales || []
    });

    // 2. 🛡️ TRADUCTOR DE MENSAJES (Esto arregla el error de Schema)
    // Convertimos el formato de Google (parts) al formato estándar (content)
    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' 
        ? m.content 
        : m.parts?.[0]?.text || '' // Si viene como parts, extraemos el texto
    }));

    // 3. Llamada con el formato correcto
    const result = await streamText({
      model: google('gemini-1.5-flash'), // Volvemos a Flash porque ya sabemos que conecta
      messages: formattedMessages, // <--- Usamos los mensajes traducidos
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('AI ERROR:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
