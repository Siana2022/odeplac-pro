'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Search, Ruler, ChevronRight, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const ESTADOS: Record<string, string> = {
  lead: 'Lead',
  presupuesto: 'Presupuesto',
  curso: 'En curso',
  terminado: 'Terminado',
}

export default function MedicionPlanosPage() {
  const supabase = createClient()
  const [obras, setObras] = useState<any[]>([])
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    const load = async () => {
      const [obrasRes, planosRes] = await Promise.all([
        supabase.from('obras').select('id, titulo, estado, clientes(nombre)').order('updated_at', { ascending: false }),
        supabase.from('planos').select('obra_id'),
      ])
      if (obrasRes.error) toast.error('Error al cargar obras: ' + obrasRes.error.message)
      setObras(obrasRes.data || [])

      const c: Record<string, number> = {}
      ;(planosRes.data || []).forEach((p: any) => { c[p.obra_id] = (c[p.obra_id] || 0) + 1 })
      setConteo(c)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = useMemo(() => {
    const f = filtro.toLowerCase()
    return obras.filter(o =>
      o.titulo?.toLowerCase().includes(f) || o.clientes?.nombre?.toLowerCase().includes(f)
    )
  }, [obras, filtro])

  return (
    <div className="w-full max-w-[1100px] mx-auto p-6 lg:p-10 text-white font-sans">
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
          Medición de <span className="text-emerald-400">planos</span>
        </h1>
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2">
          Selecciona la obra para medir sus planos
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar obra o cliente..."
          className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:border-emerald-500 text-white placeholder:text-white/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-12 w-12 text-emerald-400" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-20 text-white/10 font-black uppercase italic tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
          {filtro ? 'Sin resultados' : 'No hay obras. Crea una en el Pipeline.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtradas.map(o => (
            <Link
              key={o.id}
              href={`/dashboard/planos/${o.id}`}
              className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 hover:border-emerald-400/40 transition-all flex items-center gap-4"
            >
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Building2 size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black uppercase italic truncate">{o.titulo}</h2>
                <p className="text-[10px] font-bold uppercase text-white/40 truncate">
                  {o.clientes?.nombre || 'Sin cliente'} · {ESTADOS[o.estado?.toLowerCase()] || o.estado}
                </p>
                <p className="text-[10px] font-black uppercase text-emerald-400/70 mt-1 flex items-center gap-1">
                  <Ruler size={12} /> {conteo[o.id] || 0} {conteo[o.id] === 1 ? 'plano' : 'planos'}
                </p>
              </div>
              <ChevronRight className="text-white/20 group-hover:text-white transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
