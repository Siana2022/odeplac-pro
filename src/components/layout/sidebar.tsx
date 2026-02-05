import Link from 'next/link'
import { LayoutDashboard, Users, Briefcase, Package, Factory, Settings } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pipeline (Obras)', href: '/dashboard/obras', icon: Briefcase },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { name: 'Materiales', href: '/dashboard/materiales', icon: Package },
  { name: 'Proveedores', href: '/dashboard/proveedores', icon: Factory },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const logoUrl = "https://odeplac.net/wp-content/uploads/2025/12/cropped-favicon-192x192-1-150x150.png";

  return (
    <div className="flex flex-col h-full bg-[#1e3f6d]">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
        <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-full" />
        <span className="font-bold text-white tracking-tight">ODEPLAC PRO</span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}