import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

// FORZAMOS LA VERSIÓN V1 (ESTABLE) PARA EVITAR EL ERROR 404 DE LA BETA
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
  apiVersion: 'v1', 
});

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json();

    if (!clienteId) {
      return new Response('clienteId is required', { status: 400 });
    }

    const supabase = await createClient();

    // 1. Obtener datos del cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (!cliente) {
      return new Response('Cliente not found', { status: 404 });
    }

    // 2. Obtener obras y materiales para dar contexto real a la IA
    const { data: obras } = await supabase
      .from('obras')
      .select('*, presupuestos_items(*, materiales(*))')
      .eq('cliente_id', clienteId);

    const { data: materialesDisponibles } = await supabase
      .from('materiales')
      .select('nombre, precio_unitario, unidad')
      .limit(100);

    const systemPrompt = getSystemInstruction({
      cliente,
      obras: obras || [],
      materialesDisponibles: materialesDisponibles || []
    });

    // 3. Normalizar mensajes
    const coreMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.parts?.[0]?.text || ''
    }));

    // 4. LLAMADA AL MODELO CON EL NOMBRE ESTÁNDAR
    const result = await streamText({
      model: google('gemini-1.5-flash'), 
      messages: coreMessages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    // Retornamos el error detallado para saber qué dice Google exactamente ahora
    return new Response(JSON.stringify({ 
      error: error.message || 'Error en la conexión con la IA',
      status: error.statusCode 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
