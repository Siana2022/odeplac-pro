import { redirect } from 'next/navigation'

export default function Home() {
  // Cuando alguien entre a la raíz, lo mandamos al dashboard
  // El middleware se encargará de ver si tiene permiso o si lo manda a /login
  redirect('/dashboard')
}