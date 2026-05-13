'use server'

import { createClient } from '@supabase/supabase-js'

// Esta función tiene superpoderes porque usa la SERVICE_ROLE_KEY
export async function adminCreateUser(email: string, pass: string, metadata: any) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Necesitas añadir esta clave a tu archivo .env.local
  )

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true, // Para que el cliente no tenga que confirmar el email
    user_metadata: metadata
  })

  return { data, error }
}