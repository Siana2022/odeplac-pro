import { createClient } from '@/lib/supabase/server';
import { generateTechnicalMemory } from '@/lib/ai/gemini';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { obraId } = await req.json();
    const supabase = await createClient();

    // 1. Obtenemos la obra con sus materiales
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select('*, clientes(*)')
      .eq('id', obraId)
      .single();

    if (obraError || !obra) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });

    const { data: items } = await supabase
      .from('presupuestos_items')
      .select('*, materiales(*)')
      .eq('obra_id', obraId);

    const materiales = items?.map(item => ({
      nombre: item.materiales?.nombre,
      cantidad: item.cantidad,
      unidad: item.materiales?.unidad
    })) || [];

    // ✅ CORRECCIÓN: Enviamos los 2 argumentos que espera gemini.ts
    const memory = await generateTechnicalMemory(obra, materiales);

    return NextResponse.json({ memory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}