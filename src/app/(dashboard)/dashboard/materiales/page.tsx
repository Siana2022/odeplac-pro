'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { 
  Plus, Search, FileText, TrendingUp, MoreHorizontal, 
  Trash2, Edit3, Filter, Tag, Percent
} from "lucide-react"
import Link from 'next/link'
import { toast } from 'sonner'

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchMateriales = async () => {
    setLoading(true)
    // Traemos los materiales incluyendo el nombre del proveedor
    const { data, error } = await supabase
      .from('materiales')
      .select(`
        *,
        proveedores (nombre)
      `)
      .order('nombre')

    if (error) {
      toast.error("Error al cargar materiales")
    } else {
      setMateriales(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMateriales()
  }, [])

  const filteredMateriales = materiales.filter(m => 
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  const eliminarMaterial = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este material?")) return
    const { error } = await supabase.from('materiales').delete().eq('id', id)
    if (!error) {
      toast.success("Material eliminado")
      fetchMateriales()
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      {/* CABECERA DINÁMICA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">Catálogo & Comparador</h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/materiales/tarifas">
            <Button variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10 gap-2">
              <FileText size={18} /> Gestionar Tarifas PDF
            </Button>
          </Link>
          <Button className="bg-white text-[#295693] hover:bg-zinc-100 rounded-xl font-bold gap-2">
            <Plus size={18} /> Nuevo Material
          </Button>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-3.5 text-white/40 group-focus-within:text-white transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o tipología (ej: Montante 48)..."
          className="w-full bg-white/10 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-white/20 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLA DE MATERIALES ACTUALIZADA */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10">
                <th className="px-6 py-5">Material / Ref</th>
                <th className="px-6 py-5">Tipología</th>
                <th className="px-6 py-5">Proveedor / Catálogo</th>
                <th className="px-6 py-5 text-right">Coste</th>
                <th className="px-6 py-5 text-center">Margen</th>
                <th className="px-6 py-5 text-right text-green-400">PVP (Venta)</th>
                <th className="px-6 py-5 text-center">Unidad</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-white/20 italic">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : filteredMateriales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-white/20 italic">
                    No se han encontrado materiales con esos criterios.
                  </td>
                </tr>
              ) : filteredMateriales.map((m) => (
                <tr key={m.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5">
                    <p className="text-white font-bold text-sm leading-tight">{m.nombre}</p>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter mt-1">{m.referencia_catalogo || 'Sin Ref'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-blue-300 uppercase tracking-wider">
                      <Tag size={10} /> {m.categoria || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-white/60 text-sm font-medium">
                    {m.proveedores?.nombre}
                  </td>
                  <td className="px-6 py-5 text-right text-white/80 font-mono text-sm">
                    {Number(m.precio_coste).toFixed(2)}€
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[11px] font-black text-white/40 flex items-center justify-center gap-0.5">
                      <Percent size={10} /> {m.margen_beneficio || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-green-400 font-black text-base">
                      {Number(m.precio_venta || m.precio_coste).toFixed(2)}€
                    </p>
                  </td>
                  <td className="px-6 py-5 text-center text-white/40 text-[10px] font-bold uppercase">
                    {m.unidad}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-lg">
                        <Edit3 size={16} />
                      </Button>
                      <Button 
                        onClick={() => eliminarMaterial(m.id)}
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESUMEN RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total Referencias</p>
          <p className="text-3xl font-black text-white">{materiales.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 border-l-green-500/30">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Rentabilidad Media</p>
          <p className="text-3xl font-black text-green-400">
            {materiales.length > 0 
              ? Math.round(materiales.reduce((acc, curr) => acc + (curr.margen_beneficio || 0), 0) / materiales.length) 
              : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}