import { createClient } from '@/lib/supabase/server';
import { getSystemInstruction } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    // 🕵️‍♂️ EL CHIVATO: Esto nos dirá qué llave está leyendo Vercel realmente
    const terminacion = key.slice(-4);
    console.log(`🔍 LOG DE CONTROL: La llave termina en ...${terminacion}`);

    const { clienteId, messages } = await req.json();
    const supabase = await createClient();
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
    const { data: obras } = await supabase.from('obras').select('*, presupuestos_items(*, materiales(*))').eq('cliente_id', clienteId);

    const systemPrompt = getSystemInstruction({ cliente, obras: obras ?? [] });
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    // 🚀 CAMBIO DE ESTRATEGIA: Forzamos el modelo 1.5 Flash (que es el que tiene cuota segura en Gmail)
    // El 2.0 Flash a veces viene con cuota 0 en cuentas nuevas hasta que pasan 24h.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Instrucciones: ${systemPrompt}\n\nPregunta: ${contents[contents.length-1]?.parts[0].text}` }] }] })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error en Gemini');

    return new Response(data.candidates[0].content.parts[0].text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error: any) {
    console.error("❌ ERROR DETECTADO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}