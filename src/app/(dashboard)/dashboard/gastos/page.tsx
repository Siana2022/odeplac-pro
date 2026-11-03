'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, ChevronRight, Loader2 } from 'lucide-react'
import { CATEGORIAS, MESES, eur } from '@/lib/gastos'

export default function GastosHomePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, { total: number; count: number }>>({})

  const hoy = new Date()
  const mes = hoy.getMonth() + 1
  const anio = hoy.getFullYear()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('gastos_materiales')
        .select('categoria, total_gasto')
        .eq('mes_registro', mes)
        .eq('anio_registro', anio)

      const acc: Record<string, { total: number; count: number }> = {}
      ;(data || []).forEach((g: any) => {
        const k = g.categoria || 'proveedores'
        acc[k] = acc[k] || { total: 0, count: 0 }
        acc[k].total += Number(g.total_gasto || 0)
        acc[k].count += 1
      })
      setStats(acc)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalMes = Object.values(stats).reduce((a, s) => a + s.total, 0)

  return (
    <div className="w-full max-w-[1100px] mx-auto p-6 lg:p-10 text-white font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            <span className="text-emerald-400">Gastos</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2">
            Elige la categoría de la factura que quieres registrar
          </p>
        </div>

        <Link
          href="/dashboard/gastos/informe"
          className="flex items-center gap-3 bg-white text-[#1e3d6b] px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl"
        >
          <BarChart3 size={18} /> Generar informe del mes
        </Link>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
            Gasto de {MESES[mes - 1]} {anio}
          </p>
          <p className="text-3xl font-black italic tracking-tighter">
            {loading ? <Loader2 className="animate-spin" /> : eur(totalMes)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CATEGORIAS.map(c => {
          const s = stats[c.id]
          return (
            <Link
              key={c.id}
              href={`/dashboard/gastos/${c.id}`}
              className={`group relative border ${c.border} ${c.bg} rounded-[2.5rem] p-8 hover:scale-[1.02] hover:bg-white/10 transition-all shadow-xl`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`h-14 w-14 rounded-2xl bg-black/20 flex items-center justify-center ${c.text}`}>
                  <c.Icon size={28} />
                </div>
                <ChevronRight className="text-white/20 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">{c.label}</h2>
              <p className="text-[11px] text-white/40 font-bold mt-1 min-h-[32px]">{c.descripcion}</p>
              <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                  {s?.count || 0} facturas este mes
                </span>
                <span className={`text-xl font-black italic ${c.text}`}>{eur(s?.total)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
