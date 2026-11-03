'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CATEGORIAS, MESES, eur } from '@/lib/gastos'

interface Gasto {
  id: string
  categoria: string | null
  proveedor_nombre: string | null
  numero_factura: string | null
  fecha_factura: string
  total_gasto: number
}

interface ProveedorAgg {
  key: string
  nombre: string
  total: number
  facturas: Gasto[]
}

/** Normaliza el nombre para agrupar "ISOTERM S.L." y "Isoterm, SL" como el mismo proveedor */
const claveProveedor = (nombre?: string | null) =>
  (nombre || 'SIN PROVEEDOR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(S\s?L\s?U?|S\s?A|SLL|SOCIEDAD LIMITADA)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const iso = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`

function agrupar(gastos: Gasto[]) {
  const porCat: Record<string, { total: number; proveedores: ProveedorAgg[] }> = {}
  for (const c of CATEGORIAS) porCat[c.id] = { total: 0, proveedores: [] }

  for (const g of gastos) {
    const cat = porCat[g.categoria || 'proveedores'] || porCat.proveedores
    const key = claveProveedor(g.proveedor_nombre)
    let prov = cat.proveedores.find(p => p.key === key)
    if (!prov) {
      prov = { key, nombre: (g.proveedor_nombre || 'Sin proveedor').trim(), total: 0, facturas: [] }
      cat.proveedores.push(prov)
    }
    const importe = Number(g.total_gasto || 0)
    prov.total += importe
    prov.facturas.push(g)
    cat.total += importe
  }
  for (const c of Object.values(porCat)) c.proveedores.sort((a, b) => b.total - a.total)
  return porCat
}

export default function InformeGastosPage() {
  const supabase = createClient()
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [loading, setLoading] = useState(true)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [gastosPrev, setGastosPrev] = useState<Gasto[]>([])
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({})
  const [provAbierto, setProvAbierto] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const prevY = mes === 1 ? anio - 1 : anio
      const prevM = mes === 1 ? 12 : mes - 1
      const nextY = mes === 12 ? anio + 1 : anio
      const nextM = mes === 12 ? 1 : mes + 1

      const { data, error } = await supabase
        .from('gastos_materiales')
        .select('id, categoria, proveedor_nombre, numero_factura, fecha_factura, total_gasto')
        .gte('fecha_factura', iso(prevY, prevM))
        .lt('fecha_factura', iso(nextY, nextM))
        .order('fecha_factura', { ascending: true })

      if (error) {
        toast.error('Error al cargar el informe: ' + error.message)
        setLoading(false)
        return
      }
      const todos = (data || []) as Gasto[]
      const actual = iso(anio, mes)
      setGastos(todos.filter(g => g.fecha_factura >= actual))
      setGastosPrev(todos.filter(g => g.fecha_factura < actual))
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio])

  const agg = useMemo(() => agrupar(gastos), [gastos])
  const aggPrev = useMemo(() => agrupar(gastosPrev), [gastosPrev])
  const totalMes = CATEGORIAS.reduce((a, c) => a + agg[c.id].total, 0)
  const totalPrev = CATEGORIAS.reduce((a, c) => a + aggPrev[c.id].total, 0)

  const cambiarMes = (delta: number) => {
    let m = mes + delta
    let y = anio
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMes(m); setAnio(y)
  }

  const esMesActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()
  const diasMes = new Date(anio, mes, 0).getDate()
  const proyGasolina = esMesActual && agg.gasolina.total > 0
    ? (agg.gasolina.total / hoy.getDate()) * diasMes
    : null

  const pct = (parte: number, todo: number) => (todo > 0 ? (parte / todo) * 100 : 0)

  const Delta = ({ actual, prev }: { actual: number; prev: number }) => {
    if (!prev) return null
    const d = ((actual - prev) / prev) * 100
    const sube = d > 0
    const Icon = sube ? TrendingUp : TrendingDown
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-black ${sube ? 'text-red-400' : 'text-emerald-400'}`}>
        <Icon size={12} /> {sube ? '+' : ''}{d.toFixed(0)}% vs mes anterior
      </span>
    )
  }

  const descargarPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Informe de gastos - ${MESES[mes - 1]} ${anio}`, 14, 18)
    doc.setFontSize(11)
    doc.text(`Total del mes: ${eur(totalMes)}`, 14, 26)

    let y = 34
    for (const c of CATEGORIAS) {
      const cat = agg[c.id]
      if (cat.proveedores.length === 0) continue
      autoTable(doc, {
        startY: y,
        head: [[`${c.label.toUpperCase()}`, 'Facturas', 'Total', '% categoria']],
        body: [
          ...cat.proveedores.map(p => [
            p.nombre, String(p.facturas.length), eur(p.total), `${pct(p.total, cat.total).toFixed(1)}%`,
          ]),
          [{ content: `TOTAL ${c.label.toUpperCase()}`, styles: { fontStyle: 'bold' } }, '', { content: eur(cat.total), styles: { fontStyle: 'bold' } }, ''],
        ],
        headStyles: { fillColor: [30, 61, 107] },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
    doc.save(`informe_gastos_${anio}-${String(mes).padStart(2, '0')}.pdf`)
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto p-6 lg:p-10 text-white font-sans">
      <Link href="/dashboard/gastos" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white mb-3 tracking-widest">
        <ArrowLeft size={14} /> Gastos
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
          Informe <span className="text-emerald-400">mensual</span>
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl">
            <button onClick={() => cambiarMes(-1)} className="p-3 hover:text-emerald-400"><ChevronLeft size={18} /></button>
            <span className="px-3 font-black uppercase text-sm min-w-[150px] text-center">{MESES[mes - 1]} {anio}</span>
            <button onClick={() => cambiarMes(1)} className="p-3 hover:text-emerald-400"><ChevronRight size={18} /></button>
          </div>
          <button
            onClick={descargarPDF}
            disabled={loading || totalMes === 0}
            className="flex items-center gap-2 bg-white text-[#1e3d6b] px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-emerald-400" /></div>
      ) : (
        <>
          {/* RESUMEN */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Gasto total del mes</p>
                <p className="text-5xl font-black italic tracking-tighter">{eur(totalMes)}</p>
              </div>
              <Delta actual={totalMes} prev={totalPrev} />
            </div>

            {totalMes > 0 && (
              <>
                <div className="flex h-3 rounded-full overflow-hidden bg-black/30">
                  {CATEGORIAS.map(c => (
                    <div key={c.id} className={c.bar} style={{ width: `${pct(agg[c.id].total, totalMes)}%` }} title={c.label} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                  {CATEGORIAS.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-[11px] font-bold">
                      <span className={`h-2.5 w-2.5 rounded-full ${c.bar}`} />
                      <span className="text-white/60 uppercase">{c.label}</span>
                      <span className="font-black">{eur(agg[c.id].total)}</span>
                      <span className="text-white/30">({pct(agg[c.id].total, totalMes).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {totalMes === 0 && (
            <div className="text-center py-16 text-white/20 font-black uppercase italic tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
              No hay facturas registradas en {MESES[mes - 1]} {anio}
            </div>
          )}

          {/* CAPÍTULOS */}
          <div className="space-y-4">
            {CATEGORIAS.map(c => {
              const cat = agg[c.id]
              if (cat.proveedores.length === 0) return null
              const open = abiertas[c.id] ?? true
              const maxProv = cat.proveedores[0]?.total || 1

              return (
                <div key={c.id} className={`border ${c.border} rounded-[2rem] overflow-hidden bg-white/[0.03]`}>
                  <button
                    onClick={() => setAbiertas(s => ({ ...s, [c.id]: !open }))}
                    className={`w-full flex items-center gap-4 p-6 text-left ${c.bg}`}
                  >
                    <div className={`h-12 w-12 rounded-2xl bg-black/20 flex items-center justify-center ${c.text}`}>
                      <c.Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-black uppercase italic">{c.label}</h2>
                      <div className="flex flex-wrap gap-x-4 items-center">
                        <span className="text-[10px] font-bold uppercase text-white/40">
                          {cat.proveedores.length} {c.id === 'proveedores' ? 'proveedores' : 'conceptos'} · {pct(cat.total, totalMes).toFixed(0)}% del mes
                        </span>
                        <Delta actual={cat.total} prev={aggPrev[c.id].total} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-white/40">Total</p>
                      <p className={`text-2xl font-black italic ${c.text}`}>{eur(cat.total)}</p>
                    </div>
                    <ChevronDown className={`transition-transform text-white/40 ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {open && (
                    <div className="p-4 sm:p-6 space-y-3">
                      {c.id === 'gasolina' && (
                        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm font-bold flex flex-wrap justify-between gap-2">
                          <span>Gasto de gasolina del mes: <span className="text-amber-400 font-black">{eur(cat.total)}</span></span>
                          {proyGasolina && (
                            <span className="text-white/60">
                              Estimación a fin de mes: <span className="text-amber-400 font-black">{eur(proyGasolina)}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {cat.proveedores.map(p => {
                        const k = `${c.id}:${p.key}`
                        const pOpen = provAbierto[k]
                        return (
                          <div key={k} className="bg-black/20 rounded-2xl">
                            <button
                              onClick={() => setProvAbierto(s => ({ ...s, [k]: !pOpen }))}
                              className="w-full p-4 text-left"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="font-black uppercase text-sm truncate">{p.nombre}</p>
                                  <p className="text-[10px] font-bold uppercase text-white/30">
                                    {p.facturas.length} {p.facturas.length === 1 ? 'factura' : 'facturas'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[9px] font-black uppercase text-white/30">Total</p>
                                  <p className="font-black italic text-lg">{eur(p.total)}</p>
                                </div>
                              </div>
                              <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className={`h-full ${c.bar}`} style={{ width: `${(p.total / maxProv) * 100}%` }} />
                              </div>
                              <p className="text-[10px] font-bold text-white/30 mt-1 text-right">
                                {pct(p.total, cat.total).toFixed(1)}% de {c.label.toLowerCase()}
                              </p>
                            </button>

                            {pOpen && (
                              <div className="px-4 pb-4">
                                <table className="w-full text-left text-xs">
                                  <thead className="text-[9px] uppercase text-white/30">
                                    <tr><th className="py-1">Fecha</th><th>Nº factura</th><th className="text-right">Importe</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {p.facturas.map(f => (
                                      <tr key={f.id}>
                                        <td className="py-2 text-white/60">{new Date(f.fecha_factura).toLocaleDateString('es-ES')}</td>
                                        <td className="font-mono text-emerald-400">{f.numero_factura}</td>
                                        <td className="text-right font-black">{eur(f.total_gasto)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
