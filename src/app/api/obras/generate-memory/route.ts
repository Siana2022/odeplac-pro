import { NextResponse } from 'next/server'
import { generateTechnicalMemory } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { obraId } = await req.json()
    const supabase = await createClient()

    // Fetch obra, cliente and materials
    const { data: obra } = await supabase.from('obras').select('*, clientes(*)').eq('id', obraId).single()
    const { data: items } = await supabase.from('presupuestos_items').select('*, materiales(*)').eq('obra_id', obraId)

    if (!obra) return NextResponse.json({ error: 'Obra not found' }, { status: 404 })

    const materiales = items?.map(item => ({
      nombre: item.materiales.nombre,
      unidad: item.materiales.unidad,
      cantidad: item.cantidad
    })) || []

    const memory = await generateTechnicalMemory({
      cliente: obra.clientes,
      obra: obra,
      materiales: materiales
    })

    // Save memory to database
    await supabase.from('obras').update({ memoria_tecnica_final: memory }).eq('id', obraId)

    return NextResponse.json({ memory })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
