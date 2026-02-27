import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Forzamos que no use caché para traer siempre los clientes frescos
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Faltan las llaves de Supabase en el .env");
      return NextResponse.json([]); // Devolvemos array vacío para que el frontal no explote
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('clientes') // <-- REVISA AQUÍ: ¿Tu tabla se llama 'clientes'?
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      console.error("❌ Error de Supabase:", error.message);
      return NextResponse.json([]); 
    }

    // Si todo va bien, enviamos los datos. Si no hay datos, enviamos []
    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error("❌ Error crítico en API Clientes:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}