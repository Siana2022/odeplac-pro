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

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    if (contents.length > 0) {
      contents[0].parts[0].text = `Instrucciones: ${systemPrompt}\n\nPregunta: ${contents[0].parts[0].text}`;
    }

    // 🚀 ESTRATEGIA DE TRES INTENTOS
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-pro"
    ];

    let lastError = "";

    for (const modelName of modelsToTry) {
      console.log(`Intentando conectar con el modelo: ${modelName}...`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        console.log(`✅ ¡Éxito con el modelo ${modelName}!`);
        return new Response(textResponse, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      const errorData = await response.json();
      lastError = errorData.error?.message || "Error desconocido";
      console.warn(`❌ El modelo ${modelName} falló: ${lastError}`);
    }

    // Si llegamos aquí, los 3 fallaron
    throw new Error(`Google rechaza todos los modelos: ${lastError}`);

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}