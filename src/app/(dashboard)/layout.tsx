export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-transparent"> {/* Cambiado bg-white o bg-zinc por bg-transparent */}
      {/* Tu Sidebar aquí */}
      <main className="flex-1 overflow-y-auto p-8 bg-transparent">
        {children}
      </main>
    </div>
  )
}