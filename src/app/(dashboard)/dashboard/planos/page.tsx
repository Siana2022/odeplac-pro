'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Search, Ruler, ChevronRight, Building2, Settings2, Plus, Trash2, X, Layers, Square, Minus } from 'lucide-react'
import { toast } from 'sonner'

const ESTADOS: Record<string, string> = {
  lead: 'Lead',
  presupuesto: 'Presupuesto',
  curso: 'En curso',
  terminado: 'Terminado',
}

const FORMULAS = [
  { id: 'ml_x_alto',      label: 'ML × alto = m²',     desc: 'Para trasdosados y tabiques', Icon: Layers },
  { id: 'largo_x_ancho',  label: 'Largo × Ancho = m²', desc: 'Para falsos techos',           Icon: Square },
  { id: 'suma_ml',         label: 'Suma de ML',          desc: 'Para cortineros y lineales',  Icon: Minus  },
]

export default function MedicionPlanosPage() {
  const supabase = createClient()
  const [obras, setObras] = useState<any[]>([])
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  const [tipos, setTipos] = useState<any[]>([])
  const [tiposModal, setTiposModal] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaDesc, setNuevaDesc] = useState('')
  const [nuevaFormula, setNuevaFormula] = useState('ml_x_alto')
  const [savingTipo, setSavingTipo] = useState(false)

  const loadTipos = async () => {
    const { data } = await supabase
      .from('plano_tipos_sistema')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })
    setTipos(data || [])
  }

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
      await loadTipos()
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

  const agregarTipo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) return toast.error('Escribe el nombre del tipo')
    setSavingTipo(true)
    const { error } = await supabase.from('plano_tipos_sistema').insert([{
      nombre: nuevoNombre.trim(),
      descripcion: nuevaDesc.trim() || null,
      formula: nuevaFormula,
      orden: tipos.length + 10,
    }])
    setSavingTipo(false)
    if (error) return toast.error('Error al crear: ' + error.message)
    toast.success('Tipo añadido')
    setNuevoNombre('')
    setNuevaDesc('')
    setNuevaFormula('ml_x_alto')
    await loadTipos()
  }

  const eliminarTipo = async (t: any) => {
    if (!confirm(`¿Eliminar el tipo "${t.nombre}"? Los planos existentes que lo usen seguirán funcionando.`)) return
    const { error } = await supabase.from('plano_tipos_sistema').delete().eq('id', t.id)
    if (error) return toast.error('Error al eliminar: ' + error.message)
    toast.success('Tipo eliminado')
    await loadTipos()
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto p-6 lg:p-10 text-white font-sans">
      <div className="mb-8 flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Medición de <span className="text-emerald-400">planos</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2">
            Selecciona la obra para medir sus planos
          </p>
        </div>
        <button
          onClick={() => setTiposModal(true)}
          className="flex items-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 px-4 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
        >
          <Settings2 size={16} /> Gestionar tipos
        </button>
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

      {/* MODAL GESTIONAR TIPOS */}
      {tiposModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-black uppercase italic text-emerald-400">Tipos de sistema</h2>
              <button onClick={() => setTiposModal(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><X size={20} /></button>
            </div>

            <div className="space-y-2">
              {tipos.map(t => {
                const f = FORMULAS.find(f => f.id === t.formula) || FORMULAS[0]
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <f.Icon size={18} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm uppercase">{t.nombre}</p>
                      <p className="text-[10px] font-bold text-white/40">{t.descripcion || f.label}</p>
                    </div>
                    <button
                      onClick={() => eliminarTipo(t)}
                      className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
              {tipos.length === 0 && (
                <p className="text-center text-white/20 text-xs font-black uppercase italic py-4">Sin tipos definidos</p>
              )}
            </div>

            <form onSubmit={agregarTipo} className="space-y-4 border-t border-white/10 pt-5">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Añadir nuevo tipo</p>
              <input
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Nombre del tipo (ej: Trasdosado tipo B)"
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500"
              />
              <input
                value={nuevaDesc}
                onChange={e => setNuevaDesc(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500"
              />
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Fórmula de cálculo</label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {FORMULAS.map(f => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setNuevaFormula(f.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        nuevaFormula === f.id
                          ? 'border-emerald-400 bg-emerald-400/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <f.Icon size={16} className={nuevaFormula === f.id ? 'text-emerald-400' : 'text-white/30'} />
                      <div>
                        <p className="font-black text-sm uppercase tracking-wide">{f.label}</p>
                        <p className="text-[10px] font-bold text-white/40">{f.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={savingTipo}
                className="w-full bg-emerald-400 text-[#0f172a] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingTipo ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Añadir tipo</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
