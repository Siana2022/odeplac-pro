'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Box, 
  Truck, 
  Settings,
  CircleDot
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Pipeline (Obras)', icon: Briefcase, href: '/dashboard/obras' },
  { name: 'Clientes', icon: Users, href: '/dashboard/clientes' },
  { name: 'Materiales', icon: Box, href: '/dashboard/materiales' },
  { name: 'Proveedores', icon: Truck, href: '/dashboard/proveedores' },
  { name: 'Configuración', icon: Settings, href: '/dashboard/configuracion' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#1e3d6b] border-r border-white/10 flex flex-col min-h-screen shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
          <CircleDot className="text-[#295693]" size={20} />
        </div>
        <span className="font-bold text-lg tracking-tight text-white uppercase italic">Odeplac Pro</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' 
                  : 'text-blue-100/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}