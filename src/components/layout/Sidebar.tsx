import Link from 'next/link'
import { LayoutDashboard, Users, Package, Factory, Settings, Briefcase } from 'lucide-react'

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
    <div className="flex h-full w-64 flex-col border-r border-white/10 bg-[#1e3f6d] text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <img 
          src={logoUrl} 
          alt="ODEPLAC Logo" 
          className="h-10 w-10 rounded-full border border-white/20 shadow-lg"
        />
        <span className="text-lg font-bold tracking-tight">ODEPLAC PRO</span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-white/60 group-hover:text-white" aria-hidden="true" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}