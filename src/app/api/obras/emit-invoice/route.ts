import { NextResponse } from 'next/server'
import { submitInvoiceToVerifactu } from '@/lib/fiscal/facturascripts'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { obraId } = await req.json()
    const supabase = await createClient()

    // Fetch obra and items
    const { data: obra } = await supabase.from('obras').select('*').eq('id', obraId).single()
    const { data: items } = await supabase.from('presupuestos_items').select('*, materiales(*)').eq('obra_id', obraId)

    if (!obra || obra.estado !== 'terminado') {
      return NextResponse.json({ error: 'La obra debe estar terminada para emitir factura' }, { status: 400 })
    }

    // Check if invoice already exists
    const { data: existingInvoice } = await supabase.from('facturas').select('id').eq('obra_id', obraId).single()
    if (existingInvoice) {
      return NextResponse.json({ error: 'Ya existe una factura para esta obra' }, { status: 400 })
    }

    const result = await submitInvoiceToVerifactu(obra, items || [])

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, invoice: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
