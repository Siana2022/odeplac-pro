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

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (contents.length > 0) {
      contents[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${contents[0].parts[0].text}`;
    }

    // 🚀 CAMBIO MAESTRO: Usamos gemini-pro (v1.0) que es el más compatible en España
    // Y usamos la versión de API v1beta que es la que mejor funciona con fetch
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      // Si falla gemini-pro, intentamos el flash por si acaso, pero gemini-pro es el seguro
      throw new Error(errorData.error?.message || 'Error de comunicación con Google');
    }

    return new Response(response.body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}