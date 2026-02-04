import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const maxDuration = 30;

// Configura el proveedor de Google con la clave de API disponible
const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    console.log('API Key configurada:', !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY));
    const { clienteId, messages } = await req.json();
    console.log('AI Chat request for clienteId:', clienteId);

    if (!clienteId) {
        return new Response('clienteId is required', { status: 400 });
    }

    const supabase = await createClient();

    // Fetch client
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    if (!cliente) return new Response('Cliente not found', { status: 404 });

    // Fetch projects with their items and materials
    const { data: obras } = await supabase
      .from('obras')
      .select('*, presupuestos_items(*, materiales(*))')
      .eq('cliente_id', clienteId);

    // Fetch available materials catalog
    const { data: materialesDisponibles } = await supabase
      .from('materiales')
      .select('nombre, precio_unitario, unidad')
      .limit(100);

    const systemPrompt = getSystemInstruction({
      cliente,
      obras: obras || [],
      materialesDisponibles: materialesDisponibles || []
    });

    const coreMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.parts?.[0]?.text || ''
    }));

    const model = googleProvider('gemini-1.5-flash');
    console.log('Llamando a Google con el modelo:', (model as any).modelId);

    const result = streamText({
      model,
      messages: coreMessages,
      system: systemPrompt,
    });

    console.log('StreamText result available methods:', Object.keys(result));
    console.log('Enviando stream de respuesta...');

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
