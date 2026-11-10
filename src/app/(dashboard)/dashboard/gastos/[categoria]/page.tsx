'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, Search, Loader2, Trash2, Eye, X, ReceiptText, TrendingUp, ArrowLeft, FileText,
  CheckCircle2, AlertCircle, Clock, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { getCategoria } from '@/lib/gastos'
import { ACCEPTED_DOC_ATTR, ACCEPTED_DOC_TYPES, compressImageIfNeeded, safeFileName } from '@/lib/utils/pdfRender'

const DELAY_MS = 7000 // 7s entre requests → ~8.5 req/min (límite: 10/min)

type ColaItem = {
  id: string
  file: File
  estado: 'pendiente' | 'procesando' | 'ok' | 'error'
  proveedor?: string
  total?: number
  error?: string
}

export default function GastosCategoriaPage() {
  const supabase = createClient()
  const params = useParams<{ categoria: string }>()
  const cat = getCategoria(params?.categoria)
  const [gastos, setGastos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGasto, setSelectedGasto] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [totalMes, setTotalMes] = useState(0)

  // Cola de subida masiva
  const [cola, setCola] = useState<ColaItem[]>([])
  const procesandoRef = useRef(false)

  useEffect(() => { if (cat) fetchGastos() }, [cat?.id])

  if (!cat) {
    return (
      <div className="p-10 text-white">
        <p className="mb-4">Categoría no encontrada.</p>
        <Link href="/dashboard/gastos" className="text-emerald-400 underline">Volver a Gastos</Link>
      </div>
    )
  }

  const fetchGastos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('gastos_materiales')
        .select('*')
        .eq('categoria', cat.id)
        .order('fecha_factura', { ascending: false })
      if (error) throw error
      setGastos(data || [])
      setTotalMes((data || []).reduce((acc, curr) => acc + Number(curr.total_gasto || 0), 0))
    } catch (error: any) {
      toast.error('Error al cargar gastos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const procesarArchivo = async (item: ColaItem): Promise<void> => {
    setCola(prev => prev.map(i => i.id === item.id ? { ...i, estado: 'procesando' } : i))

    try {
      const file = await compressImageIfNeeded(item.file)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoria', cat.id)

      const response = await fetch('/api/gemini/analizar-factura', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error al analizar la factura')
      const { factura } = result

      const fecha = new Date(factura.fecha)
      const path = `${cat.id}/${fecha.getFullYear()}/${crypto.randomUUID()}-${safeFileName(file.name)}`
      let archivo_path: string | null = null
      const { error: upErr } = await supabase.storage.from('facturas').upload(path, file, { contentType: file.type })
      if (!upErr) archivo_path = path

      const { error } = await supabase.from('gastos_materiales').insert([{
        categoria: cat.id,
        proveedor_nombre: factura.proveedor,
        fecha_factura: factura.fecha,
        numero_factura: factura.numero_factura,
        obra_referencia: cat.id === 'proveedores' ? factura.referencia_obra : null,
        subtotal: factura.base_imponible,
        iva: factura.iva_total,
        total_gasto: factura.total,
        desglose_materiales: factura.lineas_factura,
        mes_registro: fecha.getMonth() + 1,
        anio_registro: fecha.getFullYear(),
        archivo_path,
      }])

      if (error) {
        if (archivo_path) await supabase.storage.from('facturas').remove([archivo_path])
        throw new Error(error.message)
      }

      setCola(prev => prev.map(i => i.id === item.id
        ? { ...i, estado: 'ok', proveedor: factura.proveedor, total: factura.total }
        : i
      ))
    } catch (err: any) {
      setCola(prev => prev.map(i => i.id === item.id
        ? { ...i, estado: 'error', error: err.message }
        : i
      ))
    }
  }

  const ejecutarCola = async (items: ColaItem[]) => {
    if (procesandoRef.current) return
    procesandoRef.current = true

    for (let i = 0; i < items.length; i++) {
      await procesarArchivo(items[i])
      if (i < items.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_MS))
      }
    }

    procesandoRef.current = false
    fetchGastos()
  }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''

    const validos = files.filter(f => ACCEPTED_DOC_TYPES.includes(f.type))
    const invalidos = files.length - validos.length
    if (invalidos > 0) toast.warning(`${invalidos} archivo(s) ignorados (solo PDF e imágenes)`)
    if (!validos.length) return

    const nuevos: ColaItem[] = validos.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      estado: 'pendiente',
    }))

    setCola(prev => {
      const actualizados = [...prev, ...nuevos]
      if (!procesandoRef.current) {
        const pendientes = actualizados.filter(i => i.estado === 'pendiente')
        ejecutarCola(pendientes)
      }
      return actualizados
    })
  }

  const limpiarCola = () => {
    if (procesandoRef.current) return
    setCola([])
  }

  const colaActiva = cola.length > 0
  const colaProcesando = cola.some(i => i.estado === 'procesando')
  const colaPendientes = cola.filter(i => i.estado === 'pendiente' || i.estado === 'procesando').length
  const colaOk = cola.filter(i => i.estado === 'ok').length
  const colaError = cola.filter(i => i.estado === 'error').length

  const verOriginal = async (g: any) => {
    if (!g.archivo_path) return
    const { data, error } = await supabase.storage.from('facturas').createSignedUrl(g.archivo_path, 300)
    if (error || !data) return toast.error('No se pudo abrir el archivo')
    window.open(data.signedUrl, '_blank')
  }

  const eliminarGasto = async (g: any) => {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('gastos_materiales').delete().eq('id', g.id)
    if (!error) {
      if (g.archivo_path) await supabase.storage.from('facturas').remove([g.archivo_path])
      toast.success('Gasto eliminado')
      fetchGastos()
    } else {
      toast.error('Error al eliminar')
    }
  }

  const gastosFiltrados = gastos.filter(g =>
    g.proveedor_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    g.numero_factura?.toLowerCase().includes(filtro.toLowerCase()) ||
    g.obra_referencia?.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans relative">

      {/* MODAL DESGLOSE */}
      {isModalOpen && selectedGasto && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-8 text-white">
              <div>
                <h2 className="text-3xl font-black uppercase italic text-emerald-400">Detalle de Factura</h2>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-2">{selectedGasto.proveedor_nombre}</p>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                  Factura: {selectedGasto.numero_factura} — {new Date(selectedGasto.fecha_factura).toLocaleDateString('es-ES')}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white">
                <X size={24} />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto rounded-3xl border border-white/5 bg-black/40 mb-8 p-4">
              <table className="w-full text-left">
                <thead className="bg-white/5 sticky top-0 font-black uppercase text-[10px] text-emerald-400/70 tracking-widest italic">
                  <tr>
                    <th className="px-6 py-4">Material</th>
                    <th className="px-6 py-4 text-center">Cant.</th>
                    <th className="px-6 py-4 text-center">Unidad</th>
                    <th className="px-6 py-4 text-right">P. Unit.</th>
                    <th className="px-6 py-4 text-right">Dto.</th>
                    <th className="px-6 py-4 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedGasto.desglose_materiales?.length > 0 ? (
                    selectedGasto.desglose_materiales.map((m: any, i: number) => (
                      <tr key={i} className="text-sm hover:bg-white/5">
                        <td className="px-6 py-4 font-bold uppercase opacity-80">{m.descripcion || m.item || m.material || '—'}</td>
                        <td className="px-6 py-4 text-center font-black text-white">{m.cantidad || m.cant || 0}</td>
                        <td className="px-6 py-4 text-center text-white/50 text-[10px] uppercase">{m.unidad || '—'}</td>
                        <td className="px-6 py-4 text-right font-bold text-white/70">{parseFloat(m.precio_unitario || m.precio || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td className="px-6 py-4 text-right text-white/40 text-[10px]">{m.descuento ? `${m.descuento}%` : '—'}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-400">{parseFloat(m.importe || m.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="text-center py-10 text-white/20 italic">Sin desglose de líneas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 mb-1">Base Imponible</p>
                  <p className="text-xl font-black text-white">{Number(selectedGasto.subtotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 mb-1">IVA</p>
                  <p className="text-xl font-black text-white">{Number(selectedGasto.iva || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Total Factura</p>
                  <p className="text-3xl font-black italic tracking-tighter text-white">{Number(selectedGasto.total_gasto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
        <div>
          <Link href="/dashboard/gastos" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white mb-3 tracking-widest">
            <ArrowLeft size={14} /> Gastos
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Gastos · <span className={cat.text}>{cat.label}</span>
          </h1>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 px-10 text-right shadow-xl">
          <p className="text-[10px] font-black uppercase text-emerald-400 italic flex items-center gap-2 justify-end">
            <TrendingUp size={12} /> Total registrado
          </p>
          <p className="text-4xl font-black italic tracking-tighter">
            {totalMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* PANEL SUBIDA */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white/10 border border-white/20 rounded-[2.5rem] p-8 backdrop-blur-md sticky top-10">
            <div className="text-center mb-6">
              <ReceiptText size={48} className="mx-auto text-emerald-400 opacity-20 mb-2" />
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Subir Facturas</p>
              <p className="text-[9px] text-white/20 mt-1">Puedes seleccionar varios PDFs a la vez</p>
            </div>

            <label className={`w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
              colaProcesando
                ? 'opacity-50 cursor-default border-white/10'
                : 'hover:border-emerald-400 border-white/20 bg-white/5 hover:bg-white/10'
            }`}>
              <input
                type="file"
                className="hidden"
                onChange={handleFilesSelected}
                accept={ACCEPTED_DOC_ATTR}
                multiple
                disabled={colaProcesando}
              />
              {colaProcesando ? (
                <>
                  <Loader2 className="animate-spin text-emerald-400 h-10 w-10 mb-3" />
                  <span className="text-[9px] font-black uppercase text-emerald-400/60 text-center">
                    Procesando cola...
                  </span>
                </>
              ) : (
                <>
                  <Upload className="text-white/20 h-10 w-10 mb-3" />
                  <span className="text-[9px] font-black uppercase text-white/40 italic text-center">
                    Arrastra o pulsa para subir
                  </span>
                </>
              )}
            </label>

            {/* STATS RÁPIDAS */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span className="text-white/30">Facturas este mes</span>
                <span className="text-white font-black">
                  {gastos.filter(g => {
                    const hoy = new Date()
                    return g.mes_registro === hoy.getMonth() + 1 && g.anio_registro === hoy.getFullYear()
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span className="text-white/30">Total facturas</span>
                <span className="text-white font-black">{gastos.length}</span>
              </div>
            </div>
          </div>

          {/* COLA DE SUBIDA */}
          {colaActiva && (
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-3">
              {/* Cabecera cola */}
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">
                  Cola · {colaOk}/{cola.length}
                </p>
                {!colaProcesando && (
                  <button onClick={limpiarCola} className="text-[9px] font-black uppercase text-white/20 hover:text-red-400 transition-all">
                    Limpiar
                  </button>
                )}
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${cola.length ? (colaOk + colaError) / cola.length * 100 : 0}%` }}
                />
              </div>

              {/* Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cola.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-[10px]">
                    <div className="shrink-0">
                      {item.estado === 'ok' && <CheckCircle2 size={14} className="text-emerald-400" />}
                      {item.estado === 'error' && <AlertCircle size={14} className="text-red-400" />}
                      {item.estado === 'procesando' && <Loader2 size={14} className="animate-spin text-amber-400" />}
                      {item.estado === 'pendiente' && <Clock size={14} className="text-white/20" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {item.estado === 'ok' ? (
                        <p className="truncate font-black text-white/70">
                          {item.proveedor} · {item.total?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </p>
                      ) : item.estado === 'error' ? (
                        <p className="truncate text-red-400">{item.error || 'Error'}</p>
                      ) : (
                        <p className="truncate text-white/30">{item.file.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen final */}
              {!colaProcesando && colaPendientes === 0 && (
                <div className="pt-2 border-t border-white/10 text-[10px] font-black uppercase flex gap-4">
                  <span className="text-emerald-400">{colaOk} ok</span>
                  {colaError > 0 && <span className="text-red-400">{colaError} errores</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* TABLA */}
        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-sm">
          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar proveedor, nº factura u obra..."
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:border-emerald-500 text-white placeholder:text-white/20"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin h-12 w-12 text-emerald-400" />
            </div>
          ) : gastosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-white/10 font-black uppercase italic tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
              {filtro ? 'Sin resultados' : 'Sin facturas. Sube un PDF o una foto para empezar.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-emerald-400/60 italic tracking-[0.2em]">
                    <th className="px-6 pb-2">Fecha</th>
                    <th className="px-6 pb-2">Proveedor</th>
                    <th className="px-6 pb-2">Nº Factura</th>
                    <th className="px-6 pb-2">Obra / Ref.</th>
                    <th className="px-6 pb-2 text-right">Total</th>
                    <th className="px-6 pb-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map(g => (
                    <tr key={g.id} className="bg-white/5 hover:bg-white/10 transition-all">
                      <td className="px-6 py-5 rounded-l-2xl font-bold text-sm opacity-60">
                        {new Date(g.fecha_factura).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black uppercase text-sm tracking-tight">{g.proveedor_nombre}</div>
                      </td>
                      <td className="px-6 py-5 font-mono text-[11px] text-emerald-400 font-bold">{g.numero_factura}</td>
                      <td className="px-6 py-5 text-[11px] text-white/40 font-bold uppercase italic">{g.obra_referencia || '—'}</td>
                      <td className="px-6 py-5 text-right font-black text-xl italic tracking-tighter">
                        {Number(g.total_gasto).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="px-6 py-5 rounded-r-2xl text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => { setSelectedGasto(g); setIsModalOpen(true) }}
                            className="bg-white/10 text-white p-3 rounded-xl hover:bg-emerald-500 transition-all shadow-lg"
                            title="Ver desglose"
                          >
                            <Eye size={16} />
                          </button>
                          {g.archivo_path && (
                            <button
                              onClick={() => verOriginal(g)}
                              className="bg-white/10 text-white p-3 rounded-xl hover:bg-sky-500 transition-all shadow-lg"
                              title="Ver factura original"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => eliminarGasto(g)}
                            className="bg-red-500/10 text-red-400 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
