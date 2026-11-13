'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FileUp, Loader2, Plus, Ruler, Trash2, X, ChevronRight, Pencil, Check, Layers, Square, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { ACCEPTED_DOC_ATTR, ACCEPTED_DOC_TYPES, compressImageIfNeeded, safeFileName } from '@/lib/utils/pdfRender'

const ZONAS = ['Sótano', 'Planta baja', 'Primera planta', 'Segunda planta', 'Tercera planta', 'Ático', 'Cubierta', 'Exterior']

const FORMULA_ICONS: Record<string, typeof Layers> = {
  ml_x_alto: Layers,
  largo_x_ancho: Square,
  suma_ml: Minus,
}

const FORMULA_LABELS: Record<string, string> = {
  ml_x_alto: 'ML × alto = m²',
  largo_x_ancho: 'Largo × Ancho = m²',
  suma_ml: 'Suma de ML',
}

// Fallback para planos migrados del campo tipo_sistema
const TIPO_SISTEMA_A_FORMULA: Record<string, string> = {
  trasdosados: 'ml_x_alto',
  techos: 'largo_x_ancho',
  cortineros: 'suma_ml',
}

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function getFormula(p: any): string {
  return p?.plano_tipos_sistema?.formula || TIPO_SISTEMA_A_FORMULA[p?.tipo_sistema] || 'ml_x_alto'
}

export default function PlanosObraPage() {
  const supabase = createClient()
  const { obraId } = useParams<{ obraId: string }>()
  const router = useRouter()

  const [obra, setObra] = useState<any>(null)
  const [planos, setPlanos] = useState<any[]>([])
  const [totales, setTotales] = useState<Record<string, { ml: number; m2: number }>>({})
  const [tipos, setTipos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nuevo plano
  const [modal, setModal] = useState(false)
  const [zona, setZona] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipoId, setTipoId] = useState<string>('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Renombrar
  const [renombrando, setRenombrando] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')

  const load = async () => {
    const [obraRes, planosRes, tiposRes] = await Promise.all([
      supabase.from('obras').select('id, titulo, clientes(nombre)').eq('id', obraId).single(),
      supabase.from('planos').select('*, plano_tipos_sistema(*)').eq('obra_id', obraId).order('created_at', { ascending: true }),
      supabase.from('plano_tipos_sistema').select('*').order('orden', { ascending: true }).order('created_at', { ascending: true }),
    ])
    setObra(obraRes.data)
    const lista = planosRes.data || []
    setPlanos(lista)
    const tiposList = tiposRes.data || []
    setTipos(tiposList)
    setTipoId(prev => prev || tiposList[0]?.id || '')

    if (lista.length > 0) {
      const { data: meds } = await supabase
        .from('plano_mediciones')
        .select('plano_id, alto, plano_tramos(*)')
        .in('plano_id', lista.map((p: any) => p.id))

      const t: Record<string, { ml: number; m2: number }> = {}
      ;(meds || []).forEach((m: any) => {
        const ml = (m.plano_tramos || []).reduce((a: number, x: any) => a + Number(x.metros || 0), 0)
        t[m.plano_id] = t[m.plano_id] || { ml: 0, m2: 0 }
        t[m.plano_id].ml += ml
        const plano = lista.find((p: any) => p.id === m.plano_id)
        const formula = getFormula(plano)
        if (formula === 'largo_x_ancho') {
          t[m.plano_id].m2 += (m.plano_tramos || []).reduce(
            (a: number, x: any) => a + Number(x.metros || 0) * Number(x.metros_b != null ? x.metros_b : m.alto || 0), 0)
        } else if (formula !== 'suma_ml') {
          t[m.plano_id].m2 += ml * Number(m.alto || 0)
        }
      })
      setTotales(t)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [obraId])

  const abrirModal = () => {
    setZona('')
    setNombre('')
    setTipoId(tipos[0]?.id || '')
    setArchivo(null)
    setModal(true)
  }

  const onZona = (z: string) => {
    setNombre(prev => (!prev || prev === zona ? (z ? `Plano ${z.toLowerCase()}` : '') : prev))
    setZona(z)
  }

  const guardarPlano = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) return toast.error('Selecciona el archivo del plano')
    if (!nombre.trim()) return toast.error('Escribe el nombre del plano')
    if (!ACCEPTED_DOC_TYPES.includes(archivo.type)) return toast.error('Formato no admitido (PDF, JPG, PNG o WEBP)')
    if (archivo.size > 50 * 1024 * 1024) return toast.error('El archivo no puede superar 50MB')
    if (!tipoId) return toast.error('Selecciona el tipo de sistema')

    setSaving(true)
    try {
      const file = await compressImageIfNeeded(archivo, 4000, 0.9)
      const path = `${obraId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from('planos').upload(path, file, { contentType: file.type })
      if (upErr) throw new Error(upErr.message)

      const tipoSel = tipos.find(t => t.id === tipoId)
      const formulaToTipoSistema: Record<string, string> = {
        ml_x_alto: 'trasdosados', largo_x_ancho: 'techos', suma_ml: 'cortineros',
      }
      const tipoSistemaLegacy = formulaToTipoSistema[tipoSel?.formula || 'ml_x_alto'] || 'trasdosados'

      const { data: nuevo, error } = await supabase.from('planos').insert([{
        obra_id: obraId,
        nombre: nombre.trim(),
        zona: zona || null,
        archivo_path: path,
        mime_type: file.type,
        tipo_sistema: tipoSistemaLegacy,
        tipo_id: tipoId,
      }]).select('id').single()

      if (error) {
        await supabase.storage.from('planos').remove([path])
        throw new Error(error.message)
      }
      toast.success('Plano añadido')
      setModal(false)
      router.push(`/dashboard/planos/${obraId}/${nuevo.id}`)
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const eliminarPlano = async (p: any) => {
    if (!confirm(`¿Eliminar "${p.nombre}" y todas sus mediciones?`)) return
    const { error } = await supabase.from('planos').delete().eq('id', p.id)
    if (error) return toast.error('Error al eliminar: ' + error.message)
    await supabase.storage.from('planos').remove([p.archivo_path])
    toast.success('Plano eliminado')
    load()
  }

  const renombrarPlano = async (p: any) => {
    if (!nuevoNombre.trim()) return setRenombrando(null)
    if (nuevoNombre.trim() === p.nombre) return setRenombrando(null)
    const { error } = await supabase.from('planos').update({ nombre: nuevoNombre.trim() }).eq('id', p.id)
    if (error) return toast.error('Error al renombrar')
    toast.success('Nombre actualizado')
    setRenombrando(null)
    load()
  }

  const totalObra = Object.values(totales).reduce((a, t) => ({ ml: a.ml + t.ml, m2: a.m2 + t.m2 }), { ml: 0, m2: 0 })

  return (
    <div className="w-full max-w-[1100px] mx-auto p-6 lg:p-10 text-white font-sans">
      <Link href="/dashboard/planos" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white mb-3 tracking-widest">
        <ArrowLeft size={14} /> Obras
      </Link>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-emerald-400" /></div>
      ) : !obra ? (
        <p>Obra no encontrada.</p>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">{obra.titulo}</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2">{obra.clientes?.nombre || 'Sin cliente'}</p>
            </div>
            <button
              onClick={abrirModal}
              className="flex items-center gap-2 bg-white text-[#1e3d6b] px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl"
            >
              <Plus size={18} /> Añadir nuevo plano
            </button>
          </div>

          {planos.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">ML totales</p>
                <p className="text-3xl font-black italic">{fmt(totalObra.ml)} <span className="text-sm text-white/40">ml</span></p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5">
                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Total m²</p>
                <p className="text-3xl font-black italic">{fmt(totalObra.m2)} <span className="text-sm text-white/40">m²</span></p>
              </div>
            </div>
          )}

          {planos.length === 0 ? (
            <div className="text-center py-20 text-white/20 font-black uppercase italic tracking-widest border-2 border-dashed border-white/10 rounded-3xl">
              Esta obra aún no tiene planos
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {planos.map(p => {
                const t = totales[p.id]
                const formula = getFormula(p)
                const tipoNombre = p.plano_tipos_sistema?.nombre
                  || (p.tipo_sistema === 'trasdosados' ? 'Trasdosados / Tabiques'
                    : p.tipo_sistema === 'techos' ? 'Falsos techos'
                    : 'Cortineros')
                const esRenombrando = renombrando === p.id
                return (
                  <div key={p.id} className="relative group bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:border-emerald-400/40 transition-all">
                    <div className="flex items-center gap-4 p-6 pr-20">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Ruler size={26} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {esRenombrando ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={nuevoNombre}
                              onChange={e => setNuevoNombre(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') renombrarPlano(p); if (e.key === 'Escape') setRenombrando(null) }}
                              className="bg-black/40 border border-emerald-400 rounded-xl px-3 py-1.5 text-sm font-bold outline-none flex-1 min-w-0"
                            />
                            <button onClick={() => renombrarPlano(p)} className="p-1.5 bg-emerald-400 text-[#0f172a] rounded-lg"><Check size={14} /></button>
                            <button onClick={() => setRenombrando(null)} className="p-1.5 bg-white/10 rounded-lg"><X size={14} /></button>
                          </div>
                        ) : (
                          <Link href={`/dashboard/planos/${obraId}/${p.id}`} className="block">
                            <h2 className="font-black uppercase italic truncate">{p.nombre}</h2>
                          </Link>
                        )}
                        <p className="text-[10px] font-bold uppercase text-white/40">{p.zona || 'Sin zona'} · {tipoNombre}</p>
                        <p className="text-[11px] font-black text-emerald-400 mt-1">
                          {fmt(t?.ml || 0)} ml
                          {formula !== 'suma_ml' && ` · ${fmt(t?.m2 || 0)} m²`}
                        </p>
                      </div>
                      {!esRenombrando && (
                        <Link href={`/dashboard/planos/${obraId}/${p.id}`} className="text-white/20 group-hover:text-white">
                          <ChevronRight />
                        </Link>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex gap-1">
                      <button
                        onClick={() => { setRenombrando(p.id); setNuevoNombre(p.nombre) }}
                        className="p-2 rounded-xl text-white/30 hover:bg-white/10 hover:text-white transition-all"
                        title="Renombrar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => eliminarPlano(p)}
                        className="p-2 rounded-xl text-red-400/50 hover:bg-red-500 hover:text-white transition-all"
                        title="Eliminar plano"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL AÑADIR PLANO */}
      {modal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <form onSubmit={guardarPlano} className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-black uppercase italic text-emerald-400">Nuevo plano</h2>
              <button type="button" onClick={() => setModal(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><X size={20} /></button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">¿Qué tipo de sistema vas a medir?</label>
              <div className="grid grid-cols-1 gap-2 mt-3">
                {tipos.map(t => {
                  const Icon = FORMULA_ICONS[t.formula] || Layers
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTipoId(t.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        tipoId === t.id
                          ? 'border-emerald-400 bg-emerald-400/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <Icon size={18} className={tipoId === t.id ? 'text-emerald-400' : 'text-white/30'} />
                      <div>
                        <p className="font-black text-sm uppercase tracking-wide">{t.nombre}</p>
                        <p className="text-[10px] font-bold text-white/40">{t.descripcion || FORMULA_LABELS[t.formula]}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">¿De qué zona es?</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ZONAS.map(z => (
                  <button
                    type="button"
                    key={z}
                    onClick={() => onZona(zona === z ? '' : z)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${zona === z ? 'bg-emerald-400 text-[#0f172a]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Nombre del plano</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Plano primera planta"
                className="mt-2 w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <label className="block border-2 border-dashed border-white/20 hover:border-emerald-400 rounded-2xl p-6 text-center cursor-pointer bg-white/5 transition-all">
              <input type="file" className="hidden" accept={ACCEPTED_DOC_ATTR} onChange={e => setArchivo(e.target.files?.[0] || null)} />
              <FileUp className="mx-auto text-white/30 mb-2" />
              <span className="text-xs font-black uppercase text-white/60">
                {archivo ? archivo.name : 'Selecciona el PDF del plano (o foto del escaneo)'}
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-400 text-[#0f172a] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="animate-spin" size={16} /> Subiendo...</> : 'Guardar y abrir plano'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
