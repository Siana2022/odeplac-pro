import { google } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const supabase = await createClient();

  // 1. Verificación de Seguridad: Solo Admin
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user?.id)
    .single();

  if (perfil?.rol !== 'admin') {
    return new Response('No autorizado', { status: 401 });
  }

  // 2. Obtener Contexto de la Base de Datos (Materiales y Obras)
  const { data: materiales } = await supabase.from('materiales').select('nombre, precio_coste, stock, categoria');
  const { data: obras } = await supabase.from('obras').select('nombre, estado, fecha_inicio');

  // 3. Configurar el System Prompt con los datos reales
  const systemPrompt = `
    Eres el asistente inteligente de Odeplac Pro. Solo hablas con administradores.
    Tienes acceso a estos datos en tiempo real:
    - Materiales: ${JSON.stringify(materiales)}
    - Obras actuales: ${JSON.stringify(obras)}
    
    Responde de forma concisa, técnica y profesional. 
    Si te preguntan por stock o precios, usa los datos proporcionados.
    Si no sabes algo, di que no tienes ese dato en la base de datos actual.
  `;

  // 4. Llamar a Gemini 2.5
  const result = await streamText({
    model: google('gemini-2.0-flash-exp'), // Gemini 2.5 se llama así en el SDK actualmente
    messages: convertToCoreMessages(messages),
    system: systemPrompt,
  });

  return result.toDataStreamResponse();
}