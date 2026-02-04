import { GoogleGenerativeAI } from '@google/generative-ai';
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

    const systemPrompt = getSystemInstruction({ cliente, obras: obras ?? [] });
    
    const genAI = new GoogleGenerativeAI(key);
    
    // ✅ CAMBIO CLAVE: Usamos el alias "gemini-1.5-flash" que es el que tiene la cuota gratuita más amplia
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (contents.length > 0) {
      contents[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${contents[0].parts[0].text}`;
    }

    // Usamos una llamada normal (no stream) para asegurar que la cuota no se bloquee
    const result = await model.generateContent({ contents });
    const responseText = result.response.text();

    return new Response(responseText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error: any) {
    // Si da error de cuota, intentamos avisar al usuario de forma amigable
    const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
    const message = isQuotaError 
      ? "Google ha limitado temporalmente las consultas gratuitas. Por favor, espera 30 segundos e inténtalo de nuevo."
      : error.message;
      
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}