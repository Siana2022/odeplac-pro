'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Package, Trash2, Edit3, Loader2 } from "lucide-react"
import Link from 'next/link'
import { toast } from 'sonner'

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchMateriales()
  }, [])

  const fetchMateriales = async () => {
    setLoading(true)
    console.log("🔍 [DEBUG] Iniciando petición a Supabase...");
    
    try {
      // Consulta ultra-simple: traemos todo de la tabla materiales
      const { data, error } = await supabase
        .from('materiales')
        .select('*') 
        .order('created_at', { ascending: false })

      if (error) {
        console.error("❌ [ERROR SUPABASE]:", error.message);
        toast.error("Error al leer la base de datos");
      } else {
        console.log("✅ [EXITO] Materiales recibidos de la DB:", data?.length);
        setMateriales(data || [])
      }
    } catch (err) {
      console.error("❌ [ERROR CRITICO]:", err);
    } finally {
      setLoading(false)
    }
  }

  // Lógica de filtrado por nombre o categoría
  const filtrados = materiales.filter(m => 
    m.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Catálogo</h1>
          <p className="text-blue-200/60 font-medium">Precios de venta y stock actual</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/dashboard/materiales/tarifas" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full rounded-2xl border-white/10 text-white hover:bg-white/5 h-12">
              Sincronizar Tarifas
            </Button>
          </Link>
          <Button className="flex-1 md:flex-none bg-[#295693] text-white rounded-2xl px-6 font-bold shadow-lg h-12">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Material
          </Button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-4 text-zinc-400" size={20} />
          <input 
            className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:ring-2 ring-[#295693] transition-all"
            placeholder="Buscar materiales..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-2xl border-white/10 text-white w-14 h-14 shrink-0">
          <Filter size={20} />
        </Button>
      </div>

      {/* ESTADOS DE CARGA Y LISTADO */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/50">
          <Loader2 className="animate-spin h-10 w-10 mb-4 text-[#295693]" />
          <p className="font-bold tracking-widest text-xs uppercase">Conectando con el almacén...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] py-24 text-center">
          <Package className="mx-auto h-16 w-16 text-white/10 mb-4" />
          <h3 className="text-white font-bold text-xl">No hay materiales a la vista</h3>
          <p className="text-zinc-500 mt-2 max-w-xs mx-auto">Sube un PDF de proveedor en la sección de Tarifas para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map((m) => (
            <div key={m.id} className="bg-white rounded-[32px] p-6 shadow-xl border border-zinc-100 group hover:border-[#295693] transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-zinc-100 rounded-2xl text-[#295693]">
                    <Package size={24} />
                  </div>
                  <span className="bg-zinc-100 text-[9px] font-black px-3 py-1 rounded-full text-zinc-500 uppercase">
                    {m.categoria || 'General'}
                  </span>
                </div>
                
                <h3 className="font-bold text-zinc-800 text-lg leading-tight mb-4 group-hover:text-[#295693] transition-colors">
                  {m.nombre}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end border-t border-zinc-50 pt-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">PVP Venta</p>
                    <p className="text-3xl font-black text-green-600 tracking-tight">
                      {Number(m.precio_venta || 0).toFixed(2)}€
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Coste</p>
                    <p className="text-sm font-bold text-zinc-400">
                      {Number(m.precio_coste || 0).toFixed(2)}€
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 bg-zinc-50 text-zinc-600 rounded-xl font-bold text-xs h-10 hover:bg-zinc-100">
                    <Edit3 size={14} className="mr-2" /> Editar
                  </Button>
                  <Button variant="secondary" className="bg-red-50 text-red-500 rounded-xl font-bold h-10 w-10 hover:bg-red-100">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}