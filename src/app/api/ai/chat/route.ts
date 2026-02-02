import { NextResponse } from 'next/server'
import { chatWithClientContext } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { clienteId, messages } = await req.json()
    const supabase = await createClient()

    // Fetch client and their projects with items
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
    if (!cliente) return NextResponse.json({ error: 'Cliente not found' }, { status: 404 })

    const { data: obras } = await supabase
      .from('obras')
      .select('*, presupuestos_items(*, materiales(*))')
      .eq('cliente_id', clienteId)

    const reply = await chatWithClientContext(messages, {
      cliente,
      obras: obras || []
    })

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI Chat Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
