'use client'

import { useEffect, useState } from 'react';
import { Briefcase, Users, Box, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    obras: 0,
    clientes: 0,
    materiales: 0,
    facturacion: 0
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      // Consultamos los conteos reales de tus tablas
      const { count: countObras } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true });
      
      const { count: countClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        obras: countObras || 0,
        clientes: countClientes || 0,
        materiales: 0, // Lo conectaremos cuando tengamos la tabla de materiales
        facturacion: 0 // Lo calcularemos de los presupuestos aceptados
      });
    }
    loadStats();
  }, []);

  const cards = [
    { name: 'Obras Activas', value: stats.obras, icon: Briefcase, color: 'text-blue-400' },
    { name: 'Clientes Totales', value: stats.clientes, icon: Users, color: 'text-emerald-400' },
    { name: 'Materiales Catálogo', value: stats.materiales, icon: Box, color: 'text-amber-400' },
    { name: 'Facturación Anual', value: `${(stats.facturacion / 1000).toFixed(1)}k€`, icon: BarChart3, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">Odeplac Pro</h1>
        <p className="text-blue-100/50 mt-1 uppercase text-[10px] font-bold tracking-[0.3em]">Resumen Inteligente de Operaciones</p>
      </div>

      {/* Grid de KPIs - Estilo Captura */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.name} className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl hover:bg-white/15 transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
              <card.icon size={100} />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-3 rounded-2xl bg-white/10 ${card.color} shadow-inner`}>
                <card.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                <TrendingUp size={10} /> +0%
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-1 relative z-10">{card.value}</div>
            <div className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest relative z-10">{card.name}</div>
          </div>
        ))}
      </div>

      {/* Actividad y Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Últimos Movimientos</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Briefcase size={22} />
                </div>
                <div>
                  <p className="text-sm text-white font-bold italic uppercase">Estado del Pipeline actualizado</p>
                  <p className="text-[10px] text-white/30 font-bold">RECIÉN AHORA</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                →
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e3d6b]/40 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center space-y-4 shadow-inner">
           <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center text-blue-300">
             <Box size={32} />
           </div>
           <div>
             <h3 className="text-white font-bold">Generador de Presupuestos</h3>
             <p className="text-blue-100/40 text-xs px-4 mt-2 font-medium">Crea un nuevo presupuesto basado en tu catálogo de materiales.</p>
           </div>
           <button className="w-full bg-white text-[#295693] py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform">
             Empezar Proyecto
           </button>
        </div>
      </div>
    </div>
  );
}