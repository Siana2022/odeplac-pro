import { createBrowserClient } from '@supabase/ssr'

// Esta es la función que la página de Clientes intenta importar
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Mantener tu ayuda para el ID de usuario demo
export const getDemoUserId = async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id || '05971cd1-57e1-4d97-8469-4dc104f6e691'; 
};