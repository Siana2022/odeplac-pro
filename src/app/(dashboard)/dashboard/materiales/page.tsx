'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Package, Trash2, Edit3, Loader2, ArrowUpDown } from "lucide-react"
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
    try {
      const { data, error } = await supabase
        .from('materiales')
        .select('*') 
        .order('nombre', { ascending: true })

      if (error) {
        toast.error("Error al leer la base de datos")
      } else {
        setMateriales(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtrados = materiales.filter(m => 
    m.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight italic">CATÁLOGO</h1>
          <p className="text-blue-200/60 font-medium">Inventario técnico y tarifas de venta</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/dashboard/materiales/tarifas" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full rounded-2xl border-white/10 text-white hover:bg-white/5 h-12 px-6 font-bold">
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
            placeholder="Buscar por nombre, referencia o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-2xl border-white/10 text-white w-14 h-14 shrink-0 hover:bg-white/5">
          <Filter size={20} />
        </Button>
      </div>

      {/* LISTADO TIPO TABLA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/50">
          <Loader2 className="animate-spin h-10 w-10 mb-4 text-[#295693]" />
          <p className="font-bold tracking-widest text-xs uppercase italic">Consultando Almacén...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] py-24 text-center">
          <Package className="mx-auto h-16 w-16 text-white/10 mb-4" />
          <h3 className="text-white font-bold text-xl">Catálogo vacío</h3>
          <p className="text-zinc-500 mt-2">No se han encontrado materiales con ese nombre.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-zinc-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="p-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Material / Referencia</th>
                  <th className="p-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Categoría</th>
                  <th className="p-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">Coste (€)</th>
                  <th className="p-5 text-[10px] font-black uppercase text-[#295693] tracking-widest text-right">PVP Venta (€)</th>
                  <th className="p-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtrados.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#295693] group-hover:bg-[#295693] group-hover:text-white transition-colors">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800 text-sm leading-none mb-1">{m.nombre}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">{m.referencia_catalogo || 'SIN REF'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-sm">
                      <span className="bg-zinc-100 text-zinc-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                        {m.categoria || 'General'}
                      </span>
                    </td>
                    <td className="p-5 text-right font-bold text-zinc-500 text-sm">
                      {Number(m.precio_coste || 0).toFixed(2)}€
                    </td>
                    <td className="p-5 text-right font-black text-[#295693] text-lg italic">
                      {Number(m.precio_venta || 0).toFixed(2)}€
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-400 hover:text-[#295693] hover:bg-[#295693]/5">
                          <Edit3 size={18}/>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 size={18}/>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-50 p-4 text-center border-t border-zinc-100">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
               Total: {filtrados.length} materiales registrados
             </p>
          </div>
        </div>
      )}
    </div>
  )
}