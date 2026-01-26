import { NextResponse } from 'next/server'
import { extractMaterialsFromPDF } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { pdf, proveedor_id } = await req.json()

    if (!pdf) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 })
    }

    const materials = await extractMaterialsFromPDF(pdf)

    if (!materials) {
      return NextResponse.json({ error: 'Failed to extract materials' }, { status: 500 })
    }

    // Map extracted data to database schema
    const supabase = await createClient()

    const formattedMaterials = materials
      .filter((m: any) => m.nombre_producto && !isNaN(parseFloat(m.precio_unidad)))
      .map((m: any) => ({
        nombre: m.nombre_producto,
        unidad: m.unidad || 'ud',
        precio_coste: parseFloat(m.precio_unidad),
        categoria: m.categoria || null,
        proveedor_id: proveedor_id || null,
        metadata: m
      }))

    const { data, error } = await supabase
      .from('materiales')
      .insert(formattedMaterials)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ materials: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
