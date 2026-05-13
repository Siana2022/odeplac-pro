'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, TrendingDown, Euro, ShoppingCart, Loader2, Link2, X, ChevronDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RentabilidadPage() {
  const supabase = createClient();

  const [obras, setObras] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGasto, setSelectedGasto] = useState<any>(null);
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [obraSeleccionada, setObraSeleccionada] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: obrasData } = await supabase
        .from('obras')
        .select('*, clientes(nombre)')
        .order('titulo');

      const { data: gastosData } = await supabase
        .from('gastos_materiales')
        .select('*, obras:obra_id(id, titulo)')
        .order('fecha_factura', { ascending: false });

      setObras(obrasData || []);
      setGastos(gastosData || []);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const vincularGastoAObra = async () => {
    if (!selectedGasto || !obraSeleccionada) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('gastos_materiales')
        .update({ obra_id: obraSeleccionada || null })
        .eq('id', selectedGasto.id);
      if (error) throw error;
      toast.success('Gasto vinculado a la obra correctamente');
      setShowVincularModal(false);
      setSelectedGasto(null);
      setObraSeleccionada('');
      fetchData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular rentabilidad por obra
  const rentabilidadPorObra = obras.map(obra => {
    const gastosObra = gastos.filter(g => g.obra_id === obra.id);
    const costoMateriales = gastosObra.reduce((a, g) => a + (g.total_gasto || 0), 0);
    const facturado = obra.total_presupuesto || 0;
    const margen = facturado - costoMateriales;
    const margenPct = facturado > 0 ? (margen / facturado) * 100 : 0;

    return {
      ...obra,
      costoMateriales,
      facturado,
      margen,
      margenPct,
      numGastos: gastosObra.length,
    };
  }).filter(o => o.facturado > 0 || o.costoMateriales > 0)
    .sort((a, b) => b.facturado - a.facturado);

  // KPIs globales
  const totalFacturado = rentabilidadPorObra.reduce((a, o) => a + o.facturado, 0);
  const totalCostoMateriales = rentabilidadPorObra.reduce((a, o) => a + o.costoMateriales, 0);
  const totalMargen = totalFacturado - totalCostoMateriales;
  const margenGlobalPct = totalFacturado > 0 ? (totalMargen / totalFacturado) * 100 : 0;

  const gastosNoVinculados = gastos.filter(g => !g.obra_id);
  const totalNoVinculado = gastosNoVinculados.reduce((a, g) => a + (g.total_gasto || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin h-12 w-12 text-blue-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans">

      {/* MODAL VINCULAR GASTO A OBRA */}
      {showVincularModal && selectedGasto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic text-white">
                Vincular <span className="text-blue-400">Gasto a Obra</span>
              </h2>
              <button onClick={() => { setShowVincularModal(false); setSelectedGasto(null); }}>
                <X size={24} className="text-white/40 hover:text-white" />
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6">
              <p className="font-black text-white">{selectedGasto.proveedor_nombre}</p>
              <p className="text-[10px] text-white/40 font-mono">{selectedGasto.numero_factura}</p>
              <p className="font-black text-emerald-400 text-xl mt-1">
                {Number(selectedGasto.total_gasto).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Seleccionar Obra</label>
                <div className="relative">
                  <select
                    value={obraSeleccionada}
                    onChange={e => setObraSeleccionada(e.target.value)}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">Sin vincular (ALMACÉN)</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.titulo} — {o.clientes?.nombre || 'Sin cliente'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
                </div>
              </div>

              <button
                onClick={vincularGastoAObra}
                disabled={isSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <><Link2 size={16} /> Vincular Gasto</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">
          Informes de <span className="text-blue-400">Rentabilidad</span>
        </h1>
        <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mt-1">
          Coste real de materiales vs precio ofertado por obra
        </p>
      </div>

      {/* ALERTA GASTOS NO VINCULADOS */}
      {gastosNoVinculados.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 mb-8 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-2xl">
            <AlertCircle size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-black text-amber-400 uppercase tracking-widest text-sm">
              {gastosNoVinculados.length} gasto{gastosNoVinculados.length !== 1 ? 's' : ''} sin vincular a ninguna obra
            </p>
            <p className="text-amber-400/60 text-xs font-bold mt-0.5">
              {totalNoVinculado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € no están asignados a ninguna obra — el margen puede no ser exacto
            </p>
          </div>
          <p className="text-[10px] text-amber-400/60 font-bold uppercase">Vincúlalos abajo ↓</p>
        </div>
      )}

      {/* KPIs GLOBALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Facturado', value: `${totalFacturado.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €`, icon: Euro, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Coste Materiales', value: `${totalCostoMateriales.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €`, icon: ShoppingCart, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Margen Bruto', value: `${totalMargen.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €`, icon: totalMargen >= 0 ? TrendingUp : TrendingDown, color: totalMargen >= 0 ? 'text-emerald-400' : 'text-red-400', bg: totalMargen >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20' },
          { label: 'Rentabilidad Media', value: `${margenGlobalPct.toFixed(1)}%`, icon: TrendingUp, color: margenGlobalPct >= 30 ? 'text-emerald-400' : margenGlobalPct >= 15 ? 'text-amber-400' : 'text-red-400', bg: 'bg-white/5 border-white/10' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} border rounded-3xl p-6`}>
            <div className={`${kpi.color} mb-3`}><kpi.icon size={20} /></div>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TABLA RENTABILIDAD POR OBRA */}
        <div className="lg:col-span-2 bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-lg font-black text-white uppercase mb-6">Rentabilidad por Obra</h2>

          {rentabilidadPorObra.length === 0 ? (
            <div className="text-center py-16 text-white/20 font-black uppercase italic tracking-widest">
              Sin datos suficientes. Vincula gastos a obras para ver rentabilidad.
            </div>
          ) : (
            <div className="space-y-4">
              {rentabilidadPorObra.map(obra => (
                <div key={obra.id} className="bg-white/5 rounded-3xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black text-white uppercase tracking-tight">{obra.titulo}</p>
                      <p className="text-[10px] text-white/40 font-bold uppercase mt-0.5">
                        {obra.clientes?.nombre || 'Sin cliente'} · {obra.numGastos} gasto{obra.numGastos !== 1 ? 's' : ''} vinculado{obra.numGastos !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`text-lg font-black ${obra.margenPct >= 30 ? 'text-emerald-400' : obra.margenPct >= 15 ? 'text-amber-400' : obra.margenPct > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                      {obra.margenPct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Barra de progreso coste vs facturado */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase">
                      <span>Coste materiales</span>
                      <span>Precio ofertado</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${obra.costoMateriales > obra.facturado ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min((obra.costoMateriales / Math.max(obra.facturado, obra.costoMateriales)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/5 rounded-2xl p-3">
                      <p className="text-[9px] text-white/30 uppercase font-bold">Facturado</p>
                      <p className="font-black text-white text-sm">{obra.facturado.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3">
                      <p className="text-[9px] text-white/30 uppercase font-bold">Coste mat.</p>
                      <p className="font-black text-red-300 text-sm">{obra.costoMateriales.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${obra.margen >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-[9px] text-white/30 uppercase font-bold">Margen</p>
                      <p className={`font-black text-sm ${obra.margen >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {obra.margen >= 0 ? '+' : ''}{obra.margen.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL GASTOS NO VINCULADOS */}
        <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-lg font-black text-white uppercase mb-2">Gastos sin Obra</h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">
            Vincúlalos para mejorar el análisis
          </p>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {gastosNoVinculados.length === 0 ? (
              <div className="text-center py-10 text-emerald-400/60 font-black uppercase text-xs">
                ✓ Todos los gastos están vinculados
              </div>
            ) : (
              gastosNoVinculados.map(gasto => (
                <div key={gasto.id} className="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-white text-sm uppercase">{gasto.proveedor_nombre}</p>
                      <p className="text-[9px] text-white/30 font-mono">{gasto.numero_factura}</p>
                      <p className="text-[9px] text-white/30 font-bold">
                        {new Date(gasto.fecha_factura).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400">{Number(gasto.total_gasto).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                      <button
                        onClick={() => { setSelectedGasto(gasto); setObraSeleccionada(''); setShowVincularModal(true); }}
                        className="mt-2 text-[9px] font-black text-blue-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
                      >
                        <Link2 size={10} /> Vincular
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {gastosNoVinculados.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-bold uppercase text-[10px]">Total no vinculado</span>
                <span className="font-black text-amber-400">{totalNoVinculado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}