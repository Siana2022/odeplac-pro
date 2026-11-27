'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Download, Loader2, Printer } from 'lucide-react'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function pad(n: number) { return String(n).padStart(2, '0') }

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${pad(m)}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${pad(m)}-${pad(last)}`
  return { y, m, start, end, days: last }
}

function dayOfWeek(y: number, m: number, d: number) {
  return (new Date(y, m - 1, d).getDay() + 6) % 7 // 0 = lunes
}

export default function InformeTrabajadoresPage() {
  const supabase = createClient()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [horas, setHoras] = useState<any[]>([])
  const [obras, setObras] = useState<any[]>([])

  const range = useMemo(() => monthRange(month), [month])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [{ data: t }, { data: h }, { data: o }] = await Promise.all([
        supabase.from('trabajadores').select('id, nombre, activo').order('nombre'),
        supabase.from('obra_horas')
          .select('id, fecha, trabajador, trabajador_id, horas, obra_id')
          .gte('fecha', range.start)
          .lte('fecha', range.end),
        supabase.from('obras').select('id, titulo'),
      ])
      if (cancelled) return
      if (!t || !h) toast.error('No se pudo cargar el informe')
      setTrabajadores(t || [])
      setHoras(h || [])
      setObras(o || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [range.start, range.end]) // eslint-disable-line react-hooks/exhaustive-deps

  const obraTitulo = useMemo(() => {
    const map = new Map<string, string>()
    obras.forEach(o => map.set(o.id, o.titulo))
    return map
  }, [obras])

  const filas = useMemo(() => {
    type Fila = { key: string; nombre: string; activo: boolean; dias: Map<number, { obras: string[]; horas: number }> }
    const map = new Map<string, Fila>()

    const addFila = (key: string, nombre: string, activo = true) => {
      if (!map.has(key)) map.set(key, { key, nombre, activo, dias: new Map() })
      return map.get(key)!
    }

    // Todos los trabajadores activos salen aunque no tengan horas ese mes
    trabajadores.filter(t => t.activo).forEach(t => addFila(t.id, t.nombre, true))

    horas.forEach(h => {
      const fecha = String(h.fecha || '').slice(0, 10)
      const dia = Number(fecha.slice(8, 10))
      if (!dia || dia < 1 || dia > range.days) return
      const key = h.trabajador_id || ('nombre:' + String(h.trabajador || '').trim().toLowerCase())
      const nombre = h.trabajador || trabajadores.find(t => t.id === h.trabajador_id)?.nombre || 'Sin nombre'
      const fila = addFila(key, nombre, trabajadores.find(t => t.id === h.trabajador_id)?.activo ?? true)
      const actual = fila.dias.get(dia) || { obras: [], horas: 0 }
      const titulo = obraTitulo.get(h.obra_id) || 'Obra'
      if (!actual.obras.includes(titulo)) actual.obras.push(titulo)
      actual.horas += Number(h.horas || 0)
      fila.dias.set(dia, actual)
    })

    return Array.from(map.values()).sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1
      return a.nombre.localeCompare(b.nombre, 'es')
    })
  }, [trabajadores, horas, obraTitulo, range.days])

  const descargarCsv = () => {
    const rows: string[] = [['Fecha', 'Trabajador', 'Obra', 'Horas'].join(';')]
    horas.forEach(h => {
      rows.push([
        String(h.fecha || '').slice(0, 10),
        h.trabajador || '',
        obraTitulo.get(h.obra_id) || '',
        String(h.horas ?? ''),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Informe_trabajadores_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalHoras = horas.reduce((a, h) => a + Number(h.horas || 0), 0)

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 lg:p-8 text-white font-sans">
      <Link href="/dashboard/trabajadores" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white mb-3 tracking-widest">
        <ArrowLeft size={14} /> Trabajadores
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Informe mensual</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mt-1">
            Días, trabajadores y obra · {totalHoras.toLocaleString('es-ES')} h
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
            <CalendarDays size={15} className="text-emerald-400" />
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value || new Date().toISOString().slice(0, 7))}
              className="bg-transparent text-white text-sm font-bold outline-none [color-scheme:dark]"
            />
          </div>
          <button onClick={descargarCsv} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-emerald-400" /></div>
      ) : filas.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl text-white/30 font-black uppercase italic tracking-widest">
          No hay trabajadores ni jornadas en este mes
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
          <table className="min-w-[1280px] w-full text-xs border-collapse">
            <thead>
              <tr className="bg-black/30">
                <th className="sticky left-0 z-10 bg-[#1e3d6b] p-3 text-left text-[9px] font-black uppercase tracking-widest text-white/50 min-w-[150px]">
                  Trabajador
                </th>
                {Array.from({ length: range.days }, (_, i) => i + 1).map(d => {
                  const dow = dayOfWeek(range.y, range.m, d)
                  const finde = dow >= 5
                  return (
                    <th key={d} className={`p-1.5 text-center text-[8px] font-black uppercase ${finde ? 'text-red-300/60 bg-red-500/5' : 'text-white/40'}`}>
                      {DIAS[dow]}<br />{d}
                    </th>
                  )
                })}
                <th className="p-2 text-center text-[8px] font-black uppercase text-emerald-400 min-w-[60px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const total = Array.from(f.dias.values()).reduce((a, x) => a + x.horas, 0)
                return (
                  <tr key={f.key} className="border-t border-white/5">
                    <td className="sticky left-0 z-10 bg-[#1e3d6b] p-3 font-black uppercase italic truncate max-w-[180px]">
                      {f.nombre}
                      {!f.activo && <span className="ml-2 text-[8px] text-white/30 not-italic">INACTIVO</span>}
                    </td>
                    {Array.from({ length: range.days }, (_, i) => i + 1).map(d => {
                      const dow = dayOfWeek(range.y, range.m, d)
                      const dato = f.dias.get(d)
                      return (
                        <td
                          key={d}
                          title={dato ? dato.obras.join(' · ') : ''}
                          className={`p-1 align-top text-center border-l border-white/5 ${dow >= 5 ? 'bg-red-500/5' : ''}`}
                        >
                          {dato ? (
                            <>
                              <div className="text-[9px] font-black text-white/80 leading-tight">
                                {dato.obras.map(o => o.split(' ').slice(0, 2).join(' ')).join(' / ')}
                              </div>
                              <div className="text-[8px] text-emerald-400 font-bold">{dato.horas}h</div>
                            </>
                          ) : null}
                        </td>
                      )
                    })}
                    <td className="p-1 text-center font-black text-emerald-400 text-[10px]">{total || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-white/25">
        Pasa el ratón por una celda para ver la obra completa. El CSV incluye una fila por jornada.
      </p>
    </div>
  )
}
