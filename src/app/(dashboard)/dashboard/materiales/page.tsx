'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Package, Trash2, Edit3 } from "lucide-react"
import Link from 'next/link'

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchMateriales()
  }, [])

  const fetchMateriales = async () => {
    setLoading(true)
    // Hacemos una consulta simple primero para asegurar que vemos algo
    const { data, error } = await supabase
      .from('materiales')
      .select(`
        *,
        proveedores (nombre)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error cargando materiales:", error)
    } else {
      setMateriales(data || [])
    }
    setLoading(false)
  }

  const filtrados = materiales.filter(m => 
    m.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Catálogo de Materiales</h1>
          <p className="text-blue-200/60 text-sm">Gestiona tus productos y precios de venta</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/materiales/tarifas">
            <Button variant="outline" className="rounded-2xl border-white/10 text-white hover:bg-white/5">
              Gestionar Tarifas
            </Button>
          </Link>
          <Button className="bg-[#295693] text-white rounded-2xl px-6 font-bold shadow-lg">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Material
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-zinc-400" size={20} />
          <input 
            className="w-full bg-white/10 border border-white/10 rounded-2xl p-3.5 pl-12 text-white outline-none focus:ring-2 ring-[#295693]"
            placeholder="Buscar por nombre o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-2xl border-white/10 text-white w-14 h-14">
          <Filter size={20} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 text-white/50">
          <Package className="animate-bounce h-12 w-12 mb-4" />
          <p className="font-bold">Cargando almacén...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl py-20 text-center">
          <Package className="mx-auto h-16 w-16 text-white/20 mb-4" />
          <h3 className="text-white font-bold text-xl">No hay materiales todavía</h3>
          <p className="text-zinc-400 mt-2">Sincroniza una tarifa para llenar el catálogo automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((m) => (
            <div key={m.id} className="bg-white rounded-3xl p-5 shadow-xl border border-zinc-100 group hover:border-[#295693] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-zinc-100 rounded-2xl text-[#295693]">
                  <Package size={24} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-zinc-400"><Edit3 size={16}/></Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-red-300"><Trash2 size={16}/></Button>
                </div>
              </div>
              
              <h3 className="font-black text-zinc-800 text-lg leading-tight mb-1">{m.nombre}</h3>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">
                {m.proveedores?.nombre || 'Proveedor Desconocido'} | {m.categoria}
              </p>

              <div className="flex items-end justify-between border-t pt-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Precio Venta</p>
                  <p className="text-2xl font-black text-green-600">{Number(m.precio_venta).toFixed(2)}€</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Coste</p>
                  <p className="text-sm font-bold text-zinc-500">{Number(m.precio_coste).toFixed(2)}€</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}