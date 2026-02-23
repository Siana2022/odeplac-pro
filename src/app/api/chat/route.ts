import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

// Permitir respuestas de hasta 30 segundos (Vercel Free/Pro)
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const supabase = await createClient();

    // 1. Verificación de Seguridad: Solo Admin
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return new Response('No autenticado', { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', authData.user.id)
      .single();

    if (perfil?.rol !== 'admin') {
      return new Response('No autorizado: Solo administradores pueden usar la IA', { status: 403 });
    }

    // 2. Obtener Contexto de la Base de Datos
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_coste, stock, categoria');
    const { data: obras } = await supabase.from('obras').select('nombre, estado, fecha_inicio');

    // 3. Configurar el System Prompt
    const systemPrompt = `
      Eres el asistente inteligente de Odeplac Pro. 
      Tu objetivo es ayudar a los administradores a gestionar el inventario y las obras.
      
      DATOS REALES DE LA BASE DE DATOS:
      - Materiales y Stock: ${JSON.stringify(materiales)}
      - Obras y Estados: ${JSON.stringify(obras)}
      
      INSTRUCCIONES:
      - Responde de forma concisa y profesional.
      - Si te preguntan por stock, da el número exacto si lo tienes.
      - Si te preguntan por precios, usa el precio_coste.
      - Mantén un tono ejecutivo y directo.
    `;

    // 4. Llamar a Gemini 2.5 (Modelo 2.0 Flash para máxima velocidad)
    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      messages, // Enviamos los mensajes directamente
      system: systemPrompt,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Error en Chat API:', error);
    return new Response('Error interno en el servidor de IA', { status: 500 });
  }
}