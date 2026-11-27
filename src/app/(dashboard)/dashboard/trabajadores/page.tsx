'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { HardHat, Plus, Pencil, Check, X, Loader2, CalendarDays, UserCheck, UserX } from 'lucide-react'

export default function TrabajadoresPage() {
  const supabase = createClient()
  const [lista, setLista] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState('')
  const [saving, setSaving] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from('trabajadores').select('*').order('nombre')
    if (error) toast.error('Error al cargar trabajadores: ' + error.message)
    setLista(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const nombre = nuevo.trim()
    if (!nombre) return toast.error('Escribe el nombre')
    setSaving(true)
    const { error } = await supabase.from('trabajadores').insert([{ nombre }])
    setSaving(false)
    if (error) {
      if (error.code === '23505') return toast.error('Ya existe un trabajador con ese nombre')
      return toast.error('Error: ' + error.message)
    }
    setNuevo('')
    toast.success('Trabajador añadido')
    load()
  }

  const renombrar = async (t: any) => {
    const nombre = editNombre.trim()
    if (!nombre || nombre === t.nombre) { setEditandoId(null); return }
    const { error } = await supabase.from('trabajadores').update({ nombre, updated_at: new Date().toISOString() }).eq('id', t.id)
    if (error) return toast.error('Error al renombrar: ' + error.message)
    toast.success('Nombre actualizado')
    setEditandoId(null)
    load()
  }

  const cambiarActivo = async (t: any) => {
    const { error } = await supabase.from('trabajadores')
      .update({ activo: !t.activo, updated_at: new Date().toISOString() })
      .eq('id', t.id)
    if (error) return toast.error('Error: ' + error.message)
    toast.success(t.activo ? 'Trabajador desactivado' : 'Trabajador activado')
    load()
  }

  const activos = lista.filter(t => t.activo).length

  return (
    <div className="w-full max-w-4xl mx-auto p-6 lg:p-10 text-white font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <HardHat size={20} />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Trabajadores</h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            {lista.length} en total · {activos} activos
          </p>
        </div>
        <Link
          href="/dashboard/trabajadores/informe"
          className="flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 px-5 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 hover:text-[#0f172a] transition-all"
        >
          <CalendarDays size={16} /> Informe mensual
        </Link>
      </div>

      <form onSubmit={crear} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          placeholder="Nombre del trabajador..."
          className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 placeholder:text-white/20"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-white text-[#1e3d6b] px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 hover:text-white transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Añadir
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-emerald-400" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl text-white/30 font-black uppercase italic tracking-widest">
          Todavía no hay trabajadores
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(t => (
            <div key={t.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${t.activo ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-60'}`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${t.activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                <HardHat size={18} />
              </div>

              <div className="flex-1 min-w-0">
                {editandoId === t.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renombrar(t); if (e.key === 'Escape') setEditandoId(null) }}
                      className="flex-1 min-w-0 bg-black/40 border border-emerald-400 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                    />
                    <button onClick={() => renombrar(t)} className="p-2 bg-emerald-400 text-[#0f172a] rounded-lg"><Check size={14} /></button>
                    <button onClick={() => setEditandoId(null)} className="p-2 bg-white/10 rounded-lg"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <p className="font-black uppercase italic truncate">{t.nombre}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </p>
                  </>
                )}
              </div>

              {editandoId !== t.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditandoId(t.id); setEditNombre(t.nombre) }}
                    className="p-2 rounded-xl text-white/30 hover:bg-white/10 hover:text-white transition-all"
                    title="Renombrar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => cambiarActivo(t)}
                    className={`p-2 rounded-xl transition-all ${t.activo ? 'text-amber-400/70 hover:bg-amber-500/10' : 'text-emerald-400/70 hover:bg-emerald-500/10'}`}
                    title={t.activo ? 'Desactivar' : 'Activar'}
                  >
                    {t.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-white/25 leading-relaxed">
        Los trabajadores no se borran para no perder las jornadas ya registradas. Si alguien deja la empresa, se desactiva.
      </p>
    </div>
  )
}
