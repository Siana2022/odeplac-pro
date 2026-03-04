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
  FileText,
  CircleDot,
  X,
  Brain, // Importamos el icono de Cerebro
  BookOpen
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Pipeline (Obras)', icon: Briefcase, href: '/dashboard/obras' },
  { name: 'Clientes', icon: Users, href: '/dashboard/clientes' },
  { name: 'Materiales', icon: Box, href: '/dashboard/materiales' },
  { name: 'Proveedores', icon: Truck, href: '/dashboard/proveedores' },
  { name: 'Presupuestos', icon: FileText, href: '/dashboard/presupuestos' },
  // NUEVO: Manual de Inteligencia para las recetas y configuración IA
  { name: 'Inteligencia', icon: Brain, href: '/dashboard/configurador' },
  { name: 'Configuración', icon: Settings, href: '/dashboard/configuracion' },
];

// Añadimos la interfaz para recibir onClose del layout móvil
interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#1e3d6b] border-r border-white/10 flex flex-col h-screen shrink-0 relative">
      {/* Botón de cerrar interno para móvil (opcional, por si el usuario busca una X) */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 text-white/50 hover:text-white"
      >
        <X size={20} />
      </button>

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
              // Al hacer clic, ejecutamos onClose para que en móvil el menú desaparezca
              onClick={() => {
                if (onClose) onClose();
              }}
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
      
      {/* Pie del sidebar */}
      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-blue-200/50 uppercase font-bold mb-1">Usuario</p>
          <p className="text-xs text-white truncate font-medium">Administrador Odeplac</p>
        </div>
      </div>
    </aside>
  );
}