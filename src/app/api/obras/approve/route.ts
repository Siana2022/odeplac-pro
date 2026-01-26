import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { obraId } = await req.json()
    const supabase = await createClient()
    const headerList = await headers()

    // Get IP address (approximation in Vercel/Next.js)
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const userAgent = headerList.get('user-agent') || 'unknown'

    const approvalDetails = {
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      method: 'client_portal_button'
    }

    const { data, error } = await supabase
      .from('obras')
      .update({
        estado: 'curso',
        approval_details: approvalDetails,
        porcentaje_progreso: 5 // Start with some progress
      })
      .eq('id', obraId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Here we could trigger a real webhook or send an email to the admin
    console.log(`Obra ${obraId} approved by client from IP ${ip}`)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
