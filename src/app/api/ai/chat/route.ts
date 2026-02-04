import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const { clienteId, messages } = await req.json();
    const supabase = await createClient();
    
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);

    const systemPrompt = getSystemInstruction({ 
      cliente, 
      obras: (obras as any[]) ?? [] 
    });

    // Formateamos el historial para la API de Google
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    // Inyectamos el prompt de sistema
    if (contents.length > 0) {
      contents[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${contents[0].parts[0].text}`;
    }

    // 🚀 LLAMADA DIRECTA AL ENDPOINT (Sin librerías intermedias)
    // Probamos con la versión v1 y el modelo flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error en la API de Google');
    }

    // Retornamos el stream directamente al cliente
    return new Response(response.body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error: any) {
    console.error("Error crítico IA:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}