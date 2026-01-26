import { NextResponse } from 'next/server'
import { sendBudgetEmail } from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { clienteId } = await req.json()
    const supabase = await createClient()

    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${cliente.token_acceso_portal}`

    const result = await sendBudgetEmail(cliente.email, cliente.nombre_fiscal, portalUrl)

    if (!result.success) {
      return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
