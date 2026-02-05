// src/app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar" // Asegúrate que está en minúscula aquí

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full bg-[#295693] overflow-hidden">
      {/* Sidebar fija a la izquierda */}
      <aside className="w-64 flex-shrink-0 h-full border-r border-white/10 bg-[#1e3f6d]">
        <Sidebar />
      </aside>

      {/* Contenido principal a la derecha */}
      <main className="flex-1 overflow-y-auto p-8 text-white">
        {children}
      </main>
    </div>
  )
}