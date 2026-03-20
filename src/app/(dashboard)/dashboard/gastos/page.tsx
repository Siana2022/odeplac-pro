'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, Search, Loader2, Trash2, Eye, X, ReceiptText, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

export default function GastosMaterialPage() {
  const supabase = createClient()
  const [gastos, setGastos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [totalMes, setTotalMes] = useState(0)
  const [selectedGasto, setSelectedGasto] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filtro, setFiltro] = useState('')

  useEffect(() => { fetchGastos() }, [])

  const fetchGastos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('gastos_materiales')
        .select('*')
        .order('fecha_factura', { ascending: false })

      if (error) throw error

      setGastos(data || [])
      const total = (data || []).reduce(
        (acc, curr) => acc + Number(curr.total_gasto || 0), 0
      )
      setTotalMes(total)
    } catch (error: any) {
      toast.error('Error al cargar gastos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ NUEVA FUNCIÓN: usa /api/gemini/analizar-factura en vez de n8n
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const toastId = toast.loading('🤖 Analizando factura...')

    try {
      // 1. Enviamos el PDF al servidor
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/gemini/analizar-factura', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al analizar la factura')
      }

      const { factura } = result

      // 2. Guardar en Supabase
      const { error } = await supabase.from('gastos_materiales').insert([{
        proveedor_nombre: factura.proveedor,
        fecha_factura: factura.fecha,
        numero_factura: factura.numero_factura,
        obra_referencia: factura.referencia_obra,
        subtotal: factura.base_imponible,
        iva: factura.iva_total,
        total_gasto: factura.total,
        desglose_materiales: factura.lineas_factura,
        mes_registro: new Date(factura.fecha).getMonth() + 1,
        anio_registro: new Date(factura.fecha).getFullYear()
      }])

      if (error) throw new Error(error.message)

      toast.success(
        `✅ Factura de ${factura.proveedor} registrada — ${factura.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`,
        { id: toastId }
      )
      fetchGastos()

    } catch (error: any) {
      toast.error('Error: ' + error.message, { id: toastId })
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('gastos_materiales').delete().eq('id', id)
    if (!error) {
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
                <h2 className="text-3xl font-black uppercase italic text-emerald-400">
                  Detalle de Factura
                </h2>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-2">
                  {selectedGasto.proveedor_nombre}
                </p>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                  Factura: {selectedGasto.numero_factura} — {new Date(selectedGasto.fecha_factura).toLocaleDateString('es-ES')}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* TABLA DE LÍNEAS */}
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
                        <td className="px-6 py-4 font-bold uppercase opacity-80">
                          {m.descripcion || m.item || m.material || '—'}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-white">
                          {m.cantidad || m.cant || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-white/50 text-[10px] uppercase">
                          {m.unidad || '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-white/70">
                          {parseFloat(m.precio_unitario || m.precio || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="px-6 py-4 text-right text-white/40 text-[10px]">
                          {m.descuento ? `${m.descuento}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-400">
                          {parseFloat(m.importe || m.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-white/20 italic">
                        Sin desglose de líneas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TOTALES */}
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 mb-1">Base Imponible</p>
                  <p className="text-xl font-black text-white">
                    {Number(selectedGasto.subtotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 mb-1">IVA</p>
                  <p className="text-xl font-black text-white">
                    {Number(selectedGasto.iva || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Total Factura</p>
                  <p className="text-3xl font-black italic tracking-tighter text-white">
                    {Number(selectedGasto.total_gasto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
          Gastos de <span className="text-emerald-400">Material</span>
        </h1>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 px-10 text-right shadow-xl">
          <p className="text-[10px] font-black uppercase text-emerald-400 italic flex items-center gap-2 justify-end">
            <TrendingUp size={12} /> Gasto Total Registrado
          </p>
          <p className="text-4xl font-black italic tracking-tighter">
            {totalMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* PANEL SUBIDA */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 border border-white/20 rounded-[2.5rem] p-8 backdrop-blur-md sticky top-10">
            <div className="text-center mb-6">
              <ReceiptText size={48} className="mx-auto text-emerald-400 opacity-20 mb-2" />
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                Subir Factura
              </p>
              <p className="text-[9px] text-white/20 mt-1">
                Cualquier proveedor · PDF
              </p>
            </div>

            <label className={`w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isUploading
                ? 'opacity-30 cursor-not-allowed border-white/10'
                : 'hover:border-emerald-400 border-white/20 bg-white/5 hover:bg-white/10'
            }`}>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf"
                disabled={isUploading}
              />
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin text-emerald-400 h-10 w-10 mb-3" />
                  <span className="text-[9px] font-black uppercase text-emerald-400/60">
                    Procesando...
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
                    const mes = new Date().getMonth() + 1
                    return g.mes_registro === mes
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span className="text-white/30">Total facturas</span>
                <span className="text-white font-black">{gastos.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-sm">
          {/* BUSCADOR */}
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
              {filtro ? 'Sin resultados' : 'Sin facturas. Sube un PDF para empezar.'}
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-3">
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
                    <td className="px-6 py-5 font-mono text-[11px] text-emerald-400 font-bold">
                      {g.numero_factura}
                    </td>
                    <td className="px-6 py-5 text-[11px] text-white/40 font-bold uppercase italic">
                      {g.obra_referencia || '—'}
                    </td>
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
                        <button
                          onClick={() => eliminarGasto(g.id)}
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
          )}
        </div>
      </div>
    </div>
  )
}