'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Minus, Pencil, Plus, PenLine, Trash2, X, Maximize2, Check, MousePointerClick,
} from 'lucide-react'
import { toast } from 'sonner'
import { renderPdfToImageUrl } from '@/lib/utils/pdfRender'

type Formula = 'ml_x_alto' | 'largo_x_ancho' | 'suma_ml'
interface Tramo {
  id: string; metros: number; x1: number | null; y1: number | null; x2: number | null; y2: number | null
  metros_b?: number | null; x3?: number | null; y3?: number | null; x4?: number | null; y4?: number | null
}
interface Medicion { id: string; nombre: string; color: string; alto: number; plano_tramos: Tramo[] }
interface Pt { x: number; y: number }

const COLORES = [
  { n: 'Rosa', v: '#ec4899' }, { n: 'Azul', v: '#3b82f6' }, { n: 'Verde', v: '#22c55e' },
  { n: 'Naranja', v: '#f97316' }, { n: 'Amarillo', v: '#eab308' }, { n: 'Morado', v: '#a855f7' },
  { n: 'Cian', v: '#06b6d4' }, { n: 'Rojo', v: '#ef4444' },
]

// Fallback para planos migrados del campo tipo_sistema
const TIPO_SISTEMA_A_FORMULA: Record<string, Formula> = {
  trasdosados: 'ml_x_alto',
  techos: 'largo_x_ancho',
  cortineros: 'suma_ml',
}

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const parseNum = (s: string) => parseFloat(String(s).replace(',', '.'))
const sumML = (m: Medicion) => m.plano_tramos.reduce((a, t) => a + Number(t.metros || 0), 0)
// Techo nuevo: largo × ancho propios de cada techo. Techos antiguos (sin metros_b): largo × ancho de la medición.
const areaTecho = (m: Medicion, t: Tramo) => Number(t.metros || 0) * Number(t.metros_b != null ? t.metros_b : m.alto || 0)
const sumM2 = (m: Medicion, formula: Formula) => {
  if (formula === 'suma_ml') return 0
  if (formula === 'largo_x_ancho') return m.plano_tramos.reduce((a, t) => a + areaTecho(m, t), 0)
  return sumML(m) * Number(m.alto || 0)
}

const CFG: Record<Formula, { boton: string; altoLabel: string; altoPlaceholder: string; tramoLabel: string; tramoPlaceholder: string; sumarBtn: string; showAlto: boolean; showM2: boolean }> = {
  ml_x_alto: {
    boton: 'Nueva medición',
    altoLabel: 'Altura (m)',
    altoPlaceholder: 'Ej: 2,8',
    tramoLabel: 'Metros del tramo',
    tramoPlaceholder: 'Ej: 3,1',
    sumarBtn: 'Sumar',
    showAlto: true,
    showM2: true,
  },
  largo_x_ancho: {
    boton: 'Nueva medición',
    altoLabel: '',
    altoPlaceholder: '',
    tramoLabel: 'medida del lado',
    tramoPlaceholder: 'Ej: 4,2',
    sumarBtn: 'Siguiente lado',
    showAlto: false,
    showM2: true,
  },
  suma_ml: {
    boton: 'Nuevo cortinero',
    altoLabel: '',
    altoPlaceholder: '',
    tramoLabel: 'Metros de cortinero',
    tramoPlaceholder: 'Ej: 2,3',
    sumarBtn: 'Añadir tramo',
    showAlto: false,
    showM2: false,
  },
}

export default function PlanoViewerPage() {
  const supabase = createClient()
  const { obraId, planoId } = useParams<{ obraId: string; planoId: string }>()

  const [plano, setPlano] = useState<any>(null)
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [dispW, setDispW] = useState(0)

  const [drawMode, setDrawMode] = useState(false)
  const [firstPoint, setFirstPoint] = useState<Pt | null>(null)
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [pending, setPending] = useState<{ a: Pt; b: Pt } | null>(null)
  const [metrosInput, setMetrosInput] = useState('')
  const [ladoA, setLadoA] = useState<{ a: Pt; b: Pt; metros: number } | null>(null)
  const metrosRef = useRef<HTMLInputElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const [modal, setModal] = useState<{ id: string | null } | null>(null)
  const [form, setForm] = useState({ nombre: '', alto: '', color: COLORES[0].v })
  const [saving, setSaving] = useState(false)

  const formula: Formula = ((plano?.plano_tipos_sistema?.formula) || TIPO_SISTEMA_A_FORMULA[plano?.tipo_sistema || ''] || 'ml_x_alto') as Formula
  const cfg = CFG[formula]
  const active = mediciones.find(m => m.id === activeId) || null

  /* ---------- Carga ---------- */
  const loadMediciones = useCallback(async () => {
    const { data, error } = await supabase
      .from('plano_mediciones')
      .select('*, plano_tramos(*)')
      .eq('plano_id', planoId)
      .order('created_at', { ascending: true })
    if (error) return toast.error('Error al cargar mediciones: ' + error.message)
    const lista = ((data || []) as Medicion[]).map(m => ({
      ...m,
      plano_tramos: [...(m.plano_tramos || [])].sort((a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || '')),
    }))
    setMediciones(lista)
    setActiveId(prev => prev ?? lista[0]?.id ?? null)
  }, [planoId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    const init = async () => {
      const { data: p, error } = await supabase
        .from('planos').select('*, obras(titulo), plano_tipos_sistema(*)').eq('id', planoId).single()
      if (error || !p) { setLoading(false); return }
      setPlano(p)
      await loadMediciones()
      setLoading(false)

      try {
        const { data: signed, error: sErr } = await supabase.storage.from('planos').createSignedUrl(p.archivo_path, 3600)
        if (sErr || !signed) throw new Error(sErr?.message || 'No se pudo acceder al archivo')

        if (p.mime_type === 'application/pdf') {
          const r = await renderPdfToImageUrl(signed.signedUrl)
          objectUrl = r.imageUrl
          if (!cancelled) setImgUrl(r.imageUrl)
        } else if (!cancelled) {
          setImgUrl(signed.signedUrl)
        }
      } catch (e: any) {
        if (!cancelled) setImgError(e.message || 'No se pudo cargar el plano')
      }
    }
    init()
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [planoId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setDispW(el.getBoundingClientRect().width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [imgSize])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFirstPoint(null); setPending(null); setLadoA(null); setDrawMode(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---------- Totales ---------- */
  const totales = useMemo(() => {
    const ml = mediciones.reduce((a, m) => a + sumML(m), 0)
    const m2 = mediciones.reduce((a, m) => a + sumM2(m, formula), 0)
    return { ml, m2 }
  }, [mediciones, formula])

  /* ---------- Mediciones (CRUD) ---------- */
  const abrirModal = (m?: Medicion) => {
    if (m) setForm({ nombre: m.nombre, alto: String(m.alto).replace('.', ','), color: m.color })
    else setForm({ nombre: '', alto: '', color: COLORES[mediciones.length % COLORES.length].v })
    setModal({ id: m?.id ?? null })
  }

  const guardarMedicion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('Escribe el nombre del sistema')

    let alto = 0
    if (cfg.showAlto) {
      alto = parseNum(form.alto)
      if (!(alto > 0)) return toast.error(`Indica el ${cfg.altoLabel.toLowerCase()} (ej: ${cfg.altoPlaceholder.replace('Ej: ', '')})`)
    }

    setSaving(true)
    // En techos no se pide ancho: al editar se conserva el ancho antiguo para techos previos.
    const payload: { nombre: string; color: string; alto?: number } = { nombre: form.nombre.trim(), color: form.color }
    if (cfg.showAlto) payload.alto = alto
    else if (!modal?.id) payload.alto = 0
    if (modal?.id) {
      const { error } = await supabase.from('plano_mediciones').update(payload).eq('id', modal.id)
      setSaving(false)
      if (error) return toast.error('Error: ' + error.message)
      setMediciones(prev => prev.map(m => (m.id === modal.id ? { ...m, ...payload } : m)))
    } else {
      const { data, error } = await supabase
        .from('plano_mediciones').insert([{ plano_id: planoId, ...payload }]).select('*').single()
      setSaving(false)
      if (error || !data) return toast.error('Error: ' + (error?.message || ''))
      setMediciones(prev => [...prev, { ...(data as any), plano_tramos: [] }])
      setActiveId(data.id)
      setDrawMode(true)
    }
    setModal(null)
  }

  const eliminarMedicion = async (m: Medicion) => {
    if (!confirm(`¿Eliminar "${m.nombre}" y sus tramos?`)) return
    const { error } = await supabase.from('plano_mediciones').delete().eq('id', m.id)
    if (error) return toast.error('Error: ' + error.message)
    setMediciones(prev => prev.filter(x => x.id !== m.id))
    if (activeId === m.id) setActiveId(null)
  }

  /* ---------- Tramos ---------- */
  const guardarTramo = async () => {
    if (!active) return toast.error('Primero selecciona o crea una medición')
    const metros = parseNum(metrosInput)
    if (!(metros > 0)) return toast.error(`Introduce los metros (ej: 3,1)`)

    // Techos: primer lado en memoria, el techo se guarda al introducir el segundo lado
    if (formula === 'largo_x_ancho' && !ladoA) {
      if (!pending) return toast.error('Dibuja primero el trazo del primer lado')
      setLadoA({ a: pending.a, b: pending.b, metros })
      setPending(null)
      setMetrosInput('')
      setDrawMode(true)
      return
    }

    const row: Record<string, any> = {
      medicion_id: active.id,
      metros: formula === 'largo_x_ancho' ? ladoA!.metros : metros,
      x1: formula === 'largo_x_ancho' ? ladoA!.a.x : pending?.a.x ?? null,
      y1: formula === 'largo_x_ancho' ? ladoA!.a.y : pending?.a.y ?? null,
      x2: formula === 'largo_x_ancho' ? ladoA!.b.x : pending?.b.x ?? null,
      y2: formula === 'largo_x_ancho' ? ladoA!.b.y : pending?.b.y ?? null,
    }
    if (formula === 'largo_x_ancho') {
      if (!pending) return toast.error('Dibuja el trazo del segundo lado')
      row.metros_b = metros
      row.x3 = pending.a.x; row.y3 = pending.a.y
      row.x4 = pending.b.x; row.y4 = pending.b.y
    }
    const { data, error } = await supabase.from('plano_tramos').insert([row]).select('*').single()
    if (error || !data) return toast.error('Error al guardar: ' + (error?.message || ''))

    setMediciones(prev => prev.map(m => (m.id === active.id ? { ...m, plano_tramos: [...m.plano_tramos, data as Tramo] } : m)))
    setPending(null)
    setLadoA(null)
    setMetrosInput('')
  }

  const eliminarTramo = async (m: Medicion, t: Tramo) => {
    const { error } = await supabase.from('plano_tramos').delete().eq('id', t.id)
    if (error) return toast.error('Error: ' + error.message)
    setMediciones(prev => prev.map(x => (x.id === m.id ? { ...x, plano_tramos: x.plano_tramos.filter(y => y.id !== t.id) } : x)))
  }

  /* ---------- Dibujo ---------- */
  const toPoint = (e: React.MouseEvent<SVGSVGElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
  }

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawMode) return
    if (!active) return toast.error('Primero crea o selecciona una medición')
    if (pending) return
    const p = toPoint(e)
    if (!firstPoint) {
      setFirstPoint(p)
    } else {
      setPending({ a: firstPoint, b: p })
      setFirstPoint(null)
      setCursor(null)
      setTimeout(() => metrosRef.current?.focus(), 50)
    }
  }

  /* ---------- Render ---------- */
  if (loading) return <div className="flex justify-center py-32"><Loader2 className="animate-spin h-12 w-12 text-emerald-400" /></div>
  if (!plano) return <div className="p-10 text-white">Plano no encontrado. <Link className="underline text-emerald-400" href={`/dashboard/planos/${obraId}`}>Volver</Link></div>

  const W = imgSize?.w || 1000
  const H = imgSize?.h || 1000
  const unit = dispW > 0 ? W / dispW : 1
  const px = (n: number) => n * unit

  const renderLinea = (key: string, { a, b, color, dashed = false, bold = false, label }: { a: Pt; b: Pt; color: string; dashed?: boolean; bold?: boolean; label?: string }) => {
    const x1 = a.x * W, y1 = a.y * H, x2 = b.x * W, y2 = b.y * H
    return (
      <g key={key}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={px(bold ? 5 : 4)} strokeLinecap="round"
          strokeDasharray={dashed ? `${px(8)} ${px(6)}` : undefined} opacity={0.9} />
        <circle cx={x1} cy={y1} r={px(4)} fill={color} />
        <circle cx={x2} cy={y2} r={px(4)} fill={color} />
        {label && (
          <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - px(8)} fontSize={px(13)} fontWeight={800} textAnchor="middle"
            fill={color} stroke="#fff" strokeWidth={px(3)} paintOrder="stroke">
            {label}
          </text>
        )}
      </g>
    )
  }

  const formulaMedicion = (m: Medicion) => {
    const ml = sumML(m)
    if (formula === 'suma_ml') {
      const tramos = m.plano_tramos.map(t => fmt(Number(t.metros))).join(' + ')
      return tramos
        ? <span className="text-[11px] font-bold text-white/60 break-words">{tramos} = <span className="text-white font-black">{fmt(ml)} ml</span></span>
        : null
    }
    if (formula === 'largo_x_ancho') {
      if (!m.plano_tramos.length) return null
      return (
        <div className="space-y-1">
          {m.plano_tramos.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-1.5 bg-black/30 rounded-lg pl-2 pr-1 py-1 text-[11px] font-bold text-white/70">
              <span className="flex-1 min-w-0 break-words">
                Techo {idx + 1}: {fmt(Number(t.metros))} × {fmt(Number(t.metros_b != null ? t.metros_b : m.alto))} = <span className="font-black" style={{ color: m.color }}>{fmt(areaTecho(m, t))} m²</span>
              </span>
              <button onClick={() => eliminarTramo(m, t)} className="text-white/30 hover:text-red-400"><X size={12} /></button>
            </div>
          ))}
        </div>
      )
    }
    // ml_x_alto
    const tramos = m.plano_tramos.map(t => fmt(Number(t.metros))).join(' + ')
    return tramos
      ? <span className="text-[11px] font-bold text-white/60 break-words">
          {tramos} = <span className="text-white font-black">{fmt(ml)} ml</span>
          {' '}× {fmt(Number(m.alto))} = <span className="font-black" style={{ color: m.color }}>{fmt(ml * Number(m.alto))} m²</span>
        </span>
      : null
  }

  const labelMedicion = (m: Medicion) => {
    const ml = sumML(m)
    const m2 = sumM2(m, formula)
    if (formula === 'suma_ml') return `${fmt(ml)} ml`
    if (formula === 'largo_x_ancho') return `${fmt(m2)} m²`
    return `${fmt(ml)} ml · ${fmt(m2)} m²`
  }

  const tipoNombrePanel = plano?.plano_tipos_sistema?.nombre
    || (plano?.tipo_sistema === 'trasdosados' ? 'Mediciones'
      : plano?.tipo_sistema === 'techos' ? 'Techos'
      : 'Cortineros')

  const medicionLabelModal = formula === 'ml_x_alto' ? 'Sistema / nombre' : formula === 'largo_x_ancho' ? 'Nombre del techo' : 'Nombre del cortinero'
  const medicionPlaceholderModal = formula === 'ml_x_alto' ? 'Ej: Tabique 70/600 doble placa' : formula === 'largo_x_ancho' ? 'Ej: Techo habitación principal' : 'Ej: Cortinero salón'

  return (
    <div className="w-full p-4 lg:p-6 text-white font-sans flex flex-col gap-4 lg:h-screen">
      {/* CABECERA */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="min-w-0">
          <Link href={`/dashboard/planos/${obraId}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white tracking-widest">
            <ArrowLeft size={14} /> {plano.obras?.titulo || 'Obra'}
          </Link>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter truncate">
            {plano.nombre} {plano.zona && <span className="text-emerald-400 text-base not-italic">· {plano.zona}</span>}
          </h1>
          <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mt-0.5">
            {plano?.plano_tipos_sistema?.nombre || cfg.boton.replace('Nuevo ', '').replace('Nueva ', '')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {formula !== 'largo_x_ancho' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-right">
              <p className="text-[9px] font-black uppercase text-white/40">ML plano</p>
              <p className="font-black italic text-lg leading-tight">{fmt(totales.ml)}</p>
            </div>
          )}
          {formula !== 'suma_ml' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-2 text-right">
              <p className="text-[9px] font-black uppercase text-emerald-400">Total m²</p>
              <p className="font-black italic text-lg leading-tight">{fmt(totales.m2)}</p>
            </div>
          )}
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-white text-[#1e3d6b] px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl"
          >
            <Plus size={16} /> {cfg.boton}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 flex-1 min-h-0">
        {/* VISOR */}
        <div className="relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col min-h-[60vh]">
          <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-black/20">
            <button
              onClick={() => { setDrawMode(d => !d); setFirstPoint(null); setPending(null); setLadoA(null) }}
              disabled={!active}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all disabled:opacity-30 ${drawMode ? 'bg-emerald-400 text-[#0f172a]' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <PenLine size={14} /> {drawMode ? 'Dibujando...' : formula === 'largo_x_ancho' ? 'Añadir techo' : 'Dibujar tramo'}
            </button>
            <span className="text-[10px] font-bold uppercase text-white/40 hidden sm:block">
              {!drawMode ? 'Activa el modo dibujo'
                : formula === 'largo_x_ancho'
                  ? (pending ? `Escribe la medida del ${ladoA ? 'segundo' : 'primer'} lado`
                    : firstPoint ? `Clic en el punto final del ${ladoA ? 'segundo' : 'primer'} lado`
                    : `Clic en el punto inicial del ${ladoA ? 'segundo' : 'primer'} lado`)
                  : pending ? `Escribe los ${cfg.tramoLabel.toLowerCase()}` : firstPoint ? 'Haz clic en el punto final' : 'Haz clic en el punto inicial'}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><Minus size={14} /></button>
              <span className="text-[11px] font-black w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, +(z + 0.25).toFixed(2)))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><Plus size={14} /></button>
              <button onClick={() => setZoom(1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" title="Ajustar"><Maximize2 size={14} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-neutral-200">
            {imgError ? (
              <div className="p-10 text-center text-red-500 font-bold">{imgError}</div>
            ) : !imgUrl ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-neutral-500 gap-3">
                <Loader2 className="animate-spin" /> <span className="text-xs font-bold uppercase">Leyendo plano...</span>
              </div>
            ) : (
              <div className="relative" style={{ width: `${zoom * 100}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={plano.nombre}
                  draggable={false}
                  className="block w-full h-auto select-none bg-white"
                  onLoad={e => setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                />
                {imgSize && (
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    className={`absolute inset-0 w-full h-full ${drawMode && !pending ? 'cursor-crosshair' : ''}`}
                    onClick={onSvgClick}
                    onMouseMove={e => { if (firstPoint) setCursor(toPoint(e)) }}
                  >
                    {mediciones.flatMap(m =>
                      m.plano_tramos.flatMap(t => {
                        const lineas = []
                        if (t.x1 != null && t.y1 != null && t.x2 != null && t.y2 != null) {
                          lineas.push(renderLinea(t.id, { a: { x: Number(t.x1), y: Number(t.y1) }, b: { x: Number(t.x2), y: Number(t.y2) },
                            color: m.color, bold: m.id === activeId, label: fmt(Number(t.metros)) }))
                        }
                        if (t.x3 != null && t.y3 != null && t.x4 != null && t.y4 != null) {
                          lineas.push(renderLinea(t.id + '-b', { a: { x: Number(t.x3), y: Number(t.y3) }, b: { x: Number(t.x4), y: Number(t.y4) },
                            color: m.color, bold: m.id === activeId, label: fmt(Number(t.metros_b)) }))
                        }
                        return lineas
                      })
                    )}
                    {ladoA && active && renderLinea('ladoA', { a: ladoA.a, b: ladoA.b, color: active.color, bold: true, label: fmt(ladoA.metros) })}
                    {pending && active && renderLinea('pending', { a: pending.a, b: pending.b, color: active.color, dashed: true, bold: true })}
                    {firstPoint && !cursor && <circle cx={firstPoint.x * W} cy={firstPoint.y * H} r={px(5)} fill={active?.color} />}
                    {firstPoint && cursor && active && renderLinea('rubber', { a: firstPoint, b: cursor, color: active.color, dashed: true })}
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANEL MEDICIONES */}
        <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
            {tipoNombrePanel} ({mediciones.length})
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mediciones.length === 0 && (
              <div className="text-center py-12 text-white/20 text-xs font-black uppercase italic border-2 border-dashed border-white/10 rounded-2xl px-4">
                <MousePointerClick className="mx-auto mb-2" />
                Pulsa «{cfg.boton}» para empezar
              </div>
            )}

            {mediciones.map(m => {
              const ml = sumML(m)
              const m2 = sumM2(m, formula)
              const isActive = m.id === activeId
              return (
                <div
                  key={m.id}
                  onClick={() => { setActiveId(m.id); setPending(null); setFirstPoint(null); setLadoA(null) }}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${isActive ? 'bg-white/10' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                  style={isActive ? { borderColor: m.color } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <span className="h-4 w-4 rounded-full mt-1 shrink-0" style={{ background: m.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase text-sm leading-tight break-words">{m.nombre}</p>
                      {cfg.showAlto && (
                        <p className="text-[10px] font-bold uppercase text-white/40">
                          Altura: {fmt(Number(m.alto))} m
                        </p>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); abrirModal(m) }} className="p-1.5 text-white/30 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); eliminarMedicion(m) }} className="p-1.5 text-red-400/50 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>

                  <div className={`grid gap-2 mt-3 ${cfg.showM2 && formula !== 'largo_x_ancho' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {formula !== 'largo_x_ancho' && (
                      <div className="bg-black/30 rounded-xl p-2 text-center">
                        <p className="text-[9px] font-black uppercase text-white/40">
                          {formula === 'suma_ml' ? 'Total ML' : 'ML'}
                        </p>
                        <p className="font-black italic">{fmt(ml)}</p>
                      </div>
                    )}
                    {cfg.showM2 && (
                      <div className="rounded-xl p-2 text-center" style={{ background: m.color + '22' }}>
                        <p className="text-[9px] font-black uppercase text-white/50">Total m²</p>
                        <p className="font-black italic">{fmt(m2)}</p>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                      {m.plano_tramos.length > 0 && (
                        <>
                          <div className="text-[11px]">{formulaMedicion(m)}</div>
                          {formula !== 'largo_x_ancho' && (
                            <div className="flex flex-wrap gap-1.5">
                              {m.plano_tramos.map(t => (
                                <span key={t.id} className="inline-flex items-center gap-1 bg-black/30 rounded-lg pl-2 pr-1 py-1 text-[11px] font-black">
                                  {fmt(Number(t.metros))}
                                  <button onClick={() => eliminarTramo(m, t)} className="text-white/30 hover:text-red-400"><X size={12} /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex gap-2">
                        <input
                          ref={metrosRef}
                          inputMode="decimal"
                          value={metrosInput}
                          onChange={e => setMetrosInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarTramo() } }}
                          placeholder={cfg.tramoPlaceholder}
                          className={`flex-1 min-w-0 bg-black/40 border rounded-xl px-3 py-2 text-sm font-bold outline-none ${pending ? 'border-emerald-400' : 'border-white/10 focus:border-white/40'}`}
                        />
                        <button
                          onClick={guardarTramo}
                          className="px-3 rounded-xl font-black text-[#0f172a] flex items-center gap-1 text-xs uppercase"
                          style={{ background: m.color }}
                        >
                          <Check size={14} /> {cfg.sumarBtn}
                        </button>
                      </div>
                      {formula === 'largo_x_ancho' && (
                        <p className="text-[10px] font-black uppercase text-white/40">
                          {ladoA ? `Lado 1: ${fmt(ladoA.metros)} m · falta el segundo lado` : 'Cada techo = 2 trazos (largo y ancho)'}
                        </p>
                      )}
                      {(pending || ladoA) && (
                        <button onClick={() => { setPending(null); setLadoA(null) }} className="text-[10px] font-black uppercase text-white/40 hover:text-white">
                          {ladoA ? 'Cancelar este techo' : 'Descartar trazo'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL MEDICIÓN */}
      {modal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <form onSubmit={guardarMedicion} className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-black uppercase italic text-emerald-400">
                {modal.id ? 'Editar' : cfg.boton}
              </h2>
              <button type="button" onClick={() => setModal(null)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><X size={20} /></button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{medicionLabelModal}</label>
              <input
                autoFocus
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder={medicionPlaceholderModal}
                className="mt-2 w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500"
              />
            </div>

            {cfg.showAlto && (
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{cfg.altoLabel}</label>
                <input
                  inputMode="decimal"
                  value={form.alto}
                  onChange={e => setForm(f => ({ ...f, alto: e.target.value }))}
                  placeholder={cfg.altoPlaceholder}
                  className="mt-2 w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Color de la etiqueta</label>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {COLORES.map(c => (
                  <button
                    type="button"
                    key={c.v}
                    title={c.n}
                    onClick={() => setForm(f => ({ ...f, color: c.v }))}
                    className={`h-9 w-9 rounded-full border-4 transition-all ${form.color === c.v ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c.v }}
                  />
                ))}
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-9 w-9 rounded-full bg-transparent cursor-pointer" title="Otro color" />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-400 text-[#0f172a] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : modal.id ? 'Guardar cambios' : 'Crear y empezar a medir'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
