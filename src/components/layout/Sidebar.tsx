import Link from 'next/link'
import { LayoutDashboard, Users, Package, Factory, Settings, Briefcase, Sparkles } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pipeline (Obras)', href: '/dashboard/obras', icon: Briefcase },
  { name: 'Asistente IA', href: '/dashboard/ai', icon: Sparkles },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { name: 'Materiales', href: '/dashboard/materiales', icon: Package },
  { name: 'Proveedores', href: '/dashboard/proveedores', icon: Factory },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-zinc-50 dark:bg-zinc-900">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold">ODEPLAC PRO</span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}
