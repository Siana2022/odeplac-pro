import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

// Permitir respuestas de hasta 30 segundos
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
      return new Response('Acceso denegado: IA solo para administradores', { status: 403 });
    }

    // 2. Obtener Contexto de la Base de Datos
    const { data: materiales } = await supabase.from('materiales').select('nombre, precio_coste, stock, categoria');
    const { data: obras } = await supabase.from('obras').select('nombre, estado, fecha_inicio');

    // 3. Configurar el System Prompt
    const systemPrompt = `
      Eres el asistente inteligente oficial de Odeplac Pro. 
      Hablas directamente con Juanjo, el administrador.
      
      DATOS REALES DE TU BASE DE DATOS:
      - Materiales y Stock: ${JSON.stringify(materiales)}
      - Obras y Estados: ${JSON.stringify(obras)}
      
      INSTRUCCIONES DE RESPUESTA:
      - Sé extremadamente directo y profesional.
      - Si te preguntan "¿cuánto stock hay?", da el número exacto sin rodeos.
      - Si te preguntan por obras, menciona su estado actual.
      - No inventes datos que no estén en los JSON de arriba.
    `;

    // 4. Llamar a Gemini 2.0 Flash (el motor 2.5)
    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      messages, 
      system: systemPrompt,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Error en Chat API:', error);
    return new Response('Error en el servicio de IA', { status: 500 });
  }
}