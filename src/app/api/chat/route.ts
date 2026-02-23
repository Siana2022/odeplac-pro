import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return new Response('Unauthorized', { status: 401 });

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', authData.user.id)
      .single();

    if (perfil?.rol !== 'admin') return new Response('Forbidden', { status: 403 });

    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_coste, stock');
    const { data: obras } = await supabase.from('obras').select('nombre, estado');

    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      messages,
      system: `Eres el asistente de Odeplac Pro. Materiales: ${JSON.stringify(materiales)}. Obras: ${JSON.stringify(obras)}. Responde corto.`,
    });

    // Cambiado a toTextStreamResponse y añadido 'as any' para forzar el build
    return (result as any).toTextStreamResponse();
  } catch (e) {
    console.error(e);
    return new Response('Error', { status: 500 });
  }
}