'use client'

import { useEffect, useState } from 'react';
import { Briefcase, Users, Box, BarChart3, TrendingUp, TrendingDown, Euro, ShoppingCart, ArrowRight, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function DashboardPage() {
  const supabase = createClient();

  const [stats, setStats] = useState({
    totalObras: 0,
    obrasCurso: 0,
    totalClientes: 0,
    totalMateriales: 0,
    totalFacturas: 0,
    facturacionTotal: 0,
    gastoMateriales: 0,
    margenBruto: 0,
    margenPct: 0,
  });

  const [facturacionMensual, setFacturacionMensual] = useState<any[]>([]);
  const [obrasPipeline, setObrasPipeline] = useState<any[]>([]);
  const [ultimasFacturas, setUltimasFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // KPIs principales
        const [
          { count: totalObras },
          { count: obrasCurso },
          { count: totalClientes },
          { count: totalMateriales },
          { count: totalFacturas },
        ] = await Promise.all([
          supabase.from('obras').select('*', { count: 'exact', head: true }),
          supabase.from('obras').select('*', { count: 'exact', head: true }).eq('estado', 'curso'),
          supabase.from('clientes').select('*', { count: 'exact', head: true }),
          supabase.from('materiales').select('*', { count: 'exact', head: true }),
          supabase.from('facturas').select('*', { count: 'exact', head: true }),
        ]);

        // Facturación y gastos
        const { data: facturacionData } = await supabase
          .from('facturas')
          .select('subtotal')
          .gt('subtotal', 0);

        const { data: gastosData } = await supabase
          .from('gastos_materiales')
          .select('total_gasto');

        const facturacionTotal = facturacionData?.reduce((a, f) => a + (f.subtotal || 0), 0) || 0;
        const gastoMateriales = gastosData?.reduce((a, g) => a + (g.total_gasto || 0), 0) || 0;
        const margenBruto = facturacionTotal - gastoMateriales;
        const margenPct = facturacionTotal > 0 ? (margenBruto / facturacionTotal) * 100 : 0;

        setStats({
          totalObras: totalObras || 0,
          obrasCurso: obrasCurso || 0,
          totalClientes: totalClientes || 0,
          totalMateriales: totalMateriales || 0,
          totalFacturas: totalFacturas || 0,
          facturacionTotal,
          gastoMateriales,
          margenBruto,
          margenPct,
        });

        // Facturación últimos 6 meses
        const { data: mensual } = await supabase
          .from('facturas')
          .select('fecha_emision, subtotal')
          .gt('subtotal', 0)
          .gte('fecha_emision', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
          .order('fecha_emision', { ascending: true });

        // Agrupar por mes
        const porMes: Record<string, number> = {};
        mensual?.forEach(f => {
          const mes = new Date(f.fecha_emision).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
          porMes[mes] = (porMes[mes] || 0) + (f.subtotal || 0);
        });
        setFacturacionMensual(Object.entries(porMes).map(([mes, total]) => ({ mes, total })));

        // Obras del pipeline
        const { data: obras } = await supabase
          .from('obras')
          .select('*, clientes(nombre)')
          .order('updated_at', { ascending: false })
          .limit(5);
        setObrasPipeline(obras || []);

        // Últimas facturas
        const { data: facturas } = await supabase
          .from('facturas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
        setUltimasFacturas(facturas || []);

      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const maxFacturacion = Math.max(...facturacionMensual.map(m => m.total), 1);

  const estadoColor: Record<string, string> = {
    lead: 'bg-zinc-100 text-zinc-500',
    presupuesto: 'bg-blue-100 text-blue-600',
    curso: 'bg-amber-100 text-amber-600',
    terminado: 'bg-emerald-100 text-emerald-600',
  };

  const estadoLabel: Record<string, string> = {
    lead: 'Lead',
    presupuesto: 'Presupuesto',
    curso: 'En Curso',
    terminado: 'Terminado',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-white/40 font-black uppercase tracking-widest text-sm animate-pulse">
          Cargando datos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">

      {/* CABECERA */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">Odeplac Pro</h1>
        <p className="text-blue-100/50 mt-1 uppercase text-[10px] font-bold tracking-[0.3em]">
          Resumen de Operaciones — {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
        </p>
      </div>

      {/* ── FILA 1: KPIs PRINCIPALES ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Facturación */}
        <div className="col-span-2 bg-[#1e3d6b] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-5">
            <Euro size={120} />
          </div>
          <p className="text-blue-200/60 text-[10px] font-black uppercase tracking-widest mb-2">Facturación Total</p>
          <p className="text-5xl font-black text-white tracking-tighter">
            {stats.facturacionTotal.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
          </p>
          <div className="flex items-center gap-6 mt-4">
            <div>
              <p className="text-[9px] text-blue-200/40 uppercase font-bold">Gasto materiales</p>
              <p className="text-lg font-black text-red-300">
                -{stats.gastoMateriales.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
              </p>
            </div>
            <div>
              <p className="text-[9px] text-blue-200/40 uppercase font-bold">Margen bruto</p>
              <p className="text-lg font-black text-emerald-400">
                +{stats.margenBruto.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
              </p>
            </div>
            <div className="ml-auto">
              <div className="bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-2xl">
                <p className="text-[9px] text-emerald-400/70 uppercase font-bold">Rentabilidad</p>
                <p className="text-2xl font-black text-emerald-400">{stats.margenPct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Obras */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl relative overflow-hidden hover:bg-white/15 transition-all">
          <div className="absolute -right-3 -top-3 opacity-5"><Briefcase size={80} /></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-300"><Briefcase size={22} /></div>
            <span className="text-[9px] font-black bg-amber-400/20 text-amber-300 px-2 py-1 rounded-lg uppercase">
              {stats.obrasCurso} activas
            </span>
          </div>
          <p className="text-4xl font-black text-white">{stats.totalObras}</p>
          <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest mt-1">Obras Totales</p>
        </div>

        {/* Clientes */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl relative overflow-hidden hover:bg-white/15 transition-all">
          <div className="absolute -right-3 -top-3 opacity-5"><Users size={80} /></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300"><Users size={22} /></div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
              <TrendingUp size={10} /> Activos
            </div>
          </div>
          <p className="text-4xl font-black text-white">{stats.totalClientes}</p>
          <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest mt-1">Clientes</p>
        </div>
      </div>

      {/* ── FILA 2: KPIs SECUNDARIOS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Materiales en catálogo', value: stats.totalMateriales, icon: Box, color: 'text-amber-400', bg: 'bg-amber-500/20', link: '/dashboard/materiales' },
          { label: 'Facturas emitidas', value: stats.totalFacturas, icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-500/20', link: '/dashboard/facturas' },
          { label: 'Gasto en materiales', value: `${stats.gastoMateriales.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €`, icon: ShoppingCart, color: 'text-red-400', bg: 'bg-red-500/20', link: '/dashboard/gastos' },
          { label: 'Margen medio obra', value: `${stats.margenPct.toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20', link: '/dashboard/presupuestos' },
        ].map((card) => (
          <Link key={card.label} href={card.link}>
            <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem] hover:bg-white/10 transition-all cursor-pointer group">
              <div className={`p-2 rounded-xl ${card.bg} ${card.color} w-fit mb-3`}>
                <card.icon size={18} />
              </div>
              <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
              <p className="text-blue-100/40 text-[9px] font-bold uppercase tracking-widest mt-1">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── FILA 3: GRÁFICA + PIPELINE ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfica de barras facturación mensual */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Facturación Mensual</h2>
              <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest">Últimos 6 meses</p>
            </div>
            <Link href="/dashboard/facturas" className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          {facturacionMensual.length > 0 ? (
            <div className="flex items-end gap-3 h-40">
              {facturacionMensual.map((m, i) => {
                const pct = (m.total / maxFacturacion) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <p className="text-[8px] text-white/50 font-bold">
                      {m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : m.total.toFixed(0)}€
                    </p>
                    <div className="w-full flex items-end" style={{ height: '80px' }}>
                      <div
                        className="w-full bg-blue-500 rounded-t-xl transition-all hover:bg-blue-400"
                        style={{ height: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-white/40 font-bold uppercase">{m.mes}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/20 font-black uppercase text-xs">
              Sin datos de facturación
            </div>
          )}
        </div>

        {/* Distribución por estado */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
          <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2">Pipeline</h2>
          <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest mb-6">Estado de obras</p>

          {['lead', 'presupuesto', 'curso', 'terminado'].map(estado => {
            const count = obrasPipeline.filter(o => o.estado === estado).length;
            const total = obrasPipeline.length || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={estado} className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-white/60 uppercase">{estadoLabel[estado]}</span>
                  <span className="text-[10px] font-black text-white">{count}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      estado === 'lead' ? 'bg-zinc-400' :
                      estado === 'presupuesto' ? 'bg-blue-400' :
                      estado === 'curso' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <Link href="/dashboard/obras" className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
            Ver Pipeline <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── FILA 4: OBRAS RECIENTES + ÚLTIMAS FACTURAS ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Obras recientes */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Obras Recientes</h2>
            <Link href="/dashboard/obras" className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {obrasPipeline.slice(0, 5).map(obra => (
              <div key={obra.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">{obra.titulo}</p>
                  <p className="text-[10px] text-blue-100/40 font-bold uppercase mt-0.5">{obra.clientes?.nombre || 'Sin cliente'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${estadoColor[obra.estado] || 'bg-white/10 text-white/50'}`}>
                    {estadoLabel[obra.estado] || obra.estado}
                  </span>
                  <p className="text-sm font-black text-white">
                    {(obra.total_presupuesto || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
                  </p>
                </div>
              </div>
            ))}
            {obrasPipeline.length === 0 && (
              <p className="text-white/20 text-xs font-bold uppercase text-center py-6">Sin obras registradas</p>
            )}
          </div>
        </div>

        {/* Últimas facturas */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Últimas Facturas</h2>
            <Link href="/dashboard/facturas" className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {ultimasFacturas.map(f => (
              <div key={f.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                <div>
                  <p className="text-sm font-black text-white font-mono">{f.numero_factura}</p>
                  <p className="text-[10px] text-blue-100/40 font-bold uppercase mt-0.5">{f.cliente_nombre}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${f.subtotal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {(f.subtotal * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-[9px] text-white/30 font-bold">
                    {new Date(f.fecha_emision).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
            {ultimasFacturas.length === 0 && (
              <p className="text-white/20 text-xs font-bold uppercase text-center py-6">Sin facturas registradas</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}