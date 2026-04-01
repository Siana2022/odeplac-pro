'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle2, Clock, AlertTriangle, XCircle, Plus, X, 
  Loader2, CreditCard, ChevronDown, Euro, Calendar,
  TrendingUp, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function GestionCobrosPage() {
  const supabase = createClient();

  const [cobros, setCobros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCobro, setSelectedCobro] = useState<any>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showVencimientoModal, setShowVencimientoModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [pagoData, setPagoData] = useState({
    importe: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    metodo: 'transferencia',
    notas: '',
  });

  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState('');

  useEffect(() => {
    fetchCobros();
  }, []);

  const fetchCobros = async () => {
    setLoading(true);
    try {
      // Actualizar cobros vencidos automáticamente
      try { await supabase.rpc('actualizar_estado_cobro'); } catch {}

      const { data, error } = await supabase
        .from('cobros')
        .select(`
          *,
          facturas (
            numero_factura,
            cliente_nombre,
            obra,
            fecha_emision
          ),
          cobros_pagos (
            id, importe, fecha_pago, metodo, notas
          )
        `)
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;

      // Actualizar estados vencidos en cliente
      const cobrosActualizados = (data || []).map(c => ({
        ...c,
        estado: c.importe_cobrado >= c.importe_total ? 'cobrado'
          : c.importe_cobrado > 0 ? 'parcial'
          : c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date() ? 'vencido'
          : 'pendiente'
      }));

      setCobros(cobrosActualizados);
    } catch (err: any) {
      toast.error('Error al cargar cobros: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarPago = async () => {
    if (!pagoData.importe || !selectedCobro) return toast.error('Introduce el importe');
    const importe = parseFloat(pagoData.importe);
    if (importe <= 0) return toast.error('El importe debe ser mayor que 0');

    const pendiente = selectedCobro.importe_total - selectedCobro.importe_cobrado;
    if (importe > pendiente) return toast.error(`El importe máximo pendiente es ${pendiente.toFixed(2)} €`);

    setIsSaving(true);
    try {
      // Insertar pago
      const { error: errorPago } = await supabase.from('cobros_pagos').insert([{
        cobro_id: selectedCobro.id,
        importe,
        fecha_pago: pagoData.fecha_pago,
        metodo: pagoData.metodo,
        notas: pagoData.notas,
      }]);
      if (errorPago) throw errorPago;

      // Actualizar importe cobrado en cobros
      const nuevoCobrado = selectedCobro.importe_cobrado + importe;
      const nuevoEstado = nuevoCobrado >= selectedCobro.importe_total ? 'cobrado'
        : nuevoCobrado > 0 ? 'parcial' : 'pendiente';

      const { error: errorCobro } = await supabase
        .from('cobros')
        .update({
          importe_cobrado: nuevoCobrado,
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCobro.id);
      if (errorCobro) throw errorCobro;

      toast.success(`Pago de ${importe.toFixed(2)} € registrado correctamente`);
      setShowPagoModal(false);
      setPagoData({ importe: '', fecha_pago: new Date().toISOString().split('T')[0], metodo: 'transferencia', notas: '' });
      setSelectedCobro(null);
      fetchCobros();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const actualizarVencimiento = async () => {
    if (!nuevaFechaVencimiento || !selectedCobro) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cobros')
        .update({ fecha_vencimiento: nuevaFechaVencimiento, updated_at: new Date().toISOString() })
        .eq('id', selectedCobro.id);
      if (error) throw error;
      toast.success('Fecha de vencimiento actualizada');
      setShowVencimientoModal(false);
      setSelectedCobro(null);
      fetchCobros();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // KPIs
  const totalPendiente = cobros.filter(c => c.estado === 'pendiente' || c.estado === 'parcial' || c.estado === 'vencido')
    .reduce((a, c) => a + (c.importe_total - c.importe_cobrado), 0);
  const totalCobrado = cobros.reduce((a, c) => a + c.importe_cobrado, 0);
  const totalVencido = cobros.filter(c => c.estado === 'vencido')
    .reduce((a, c) => a + (c.importe_total - c.importe_cobrado), 0);
  const cobrosVencidos = cobros.filter(c => c.estado === 'vencido').length;

  const cobrosFiltrados = filtroEstado === 'todos' ? cobros : cobros.filter(c => c.estado === filtroEstado);

  const estadoConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pendiente: { label: 'Pendiente', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    parcial: { label: 'Pago Parcial', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: CreditCard },
    cobrado: { label: 'Cobrado', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    vencido: { label: 'Vencido', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertTriangle },
  };

  const diasHastaVencimiento = (fecha: string) => {
    const dias = Math.ceil((new Date(fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans">

      {/* MODAL REGISTRAR PAGO */}
      {showPagoModal && selectedCobro && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic text-white">
                Registrar <span className="text-emerald-400">Cobro</span>
              </h2>
              <button onClick={() => { setShowPagoModal(false); setSelectedCobro(null); }}>
                <X size={24} className="text-white/40 hover:text-white" />
              </button>
            </div>

            {/* Info factura */}
            <div className="bg-white/5 rounded-2xl p-4 mb-6 space-y-1">
              <p className="font-black text-white text-sm">{selectedCobro.facturas?.cliente_nombre}</p>
              <p className="text-[10px] text-white/40 uppercase font-bold">{selectedCobro.facturas?.numero_factura} — {selectedCobro.facturas?.obra}</p>
              <div className="flex gap-4 mt-2">
                <div>
                  <p className="text-[9px] text-white/30 uppercase">Total factura</p>
                  <p className="font-black text-white">{selectedCobro.importe_total.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/30 uppercase">Ya cobrado</p>
                  <p className="font-black text-emerald-400">{selectedCobro.importe_cobrado.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/30 uppercase">Pendiente</p>
                  <p className="font-black text-amber-400">{(selectedCobro.importe_total - selectedCobro.importe_cobrado).toFixed(2)} €</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Importe a cobrar (€) *</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">€</span>
                  <input
                    type="number" step="0.01" min="0"
                    max={selectedCobro.importe_total - selectedCobro.importe_cobrado}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white font-black text-xl outline-none focus:border-emerald-500 transition-all"
                    placeholder="0.00"
                    value={pagoData.importe}
                    onChange={e => setPagoData({ ...pagoData, importe: e.target.value })}
                  />
                </div>
                {/* Botón cobro total */}
                <button
                  onClick={() => setPagoData({ ...pagoData, importe: (selectedCobro.importe_total - selectedCobro.importe_cobrado).toFixed(2) })}
                  className="mt-2 text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest"
                >
                  + Cobrar total pendiente ({(selectedCobro.importe_total - selectedCobro.importe_cobrado).toFixed(2)} €)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Fecha de cobro</label>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500 transition-all"
                    value={pagoData.fecha_pago}
                    onChange={e => setPagoData({ ...pagoData, fecha_pago: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Método de pago</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer"
                      value={pagoData.metodo}
                      onChange={e => setPagoData({ ...pagoData, metodo: e.target.value })}
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Notas (opcional)</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500 transition-all"
                  placeholder="Ej: Pago 1 de 2, referencia transferencia..."
                  value={pagoData.notas}
                  onChange={e => setPagoData({ ...pagoData, notas: e.target.value })}
                />
              </div>

              <button
                onClick={registrarPago}
                disabled={isSaving || !pagoData.importe}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirmar Cobro</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR VENCIMIENTO */}
      {showVencimientoModal && selectedCobro && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic text-white">Cambiar Vencimiento</h2>
              <button onClick={() => { setShowVencimientoModal(false); setSelectedCobro(null); }}>
                <X size={24} className="text-white/40 hover:text-white" />
              </button>
            </div>
            <p className="text-white/50 text-sm mb-6">
              Factura <span className="font-black text-white">{selectedCobro.facturas?.numero_factura}</span> — {selectedCobro.facturas?.cliente_nombre}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Nueva fecha de vencimiento</label>
                <input
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
                  value={nuevaFechaVencimiento}
                  onChange={e => setNuevaFechaVencimiento(e.target.value)}
                />
              </div>
              <button
                onClick={actualizarVencimiento}
                disabled={isSaving || !nuevaFechaVencimiento}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : 'Guardar Fecha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            Gestión de <span className="text-emerald-400">Cobros</span>
          </h1>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mt-1">
            Control de facturación y pagos pendientes
          </p>
        </div>
        <Link href="/dashboard/facturas" className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all">
          <ArrowRight size={20} className="text-blue-300" />
          <span className="text-xs font-bold uppercase tracking-widest">Facturas</span>
        </Link>
      </div>

      {/* ALERTA VENCIDOS */}
      {cobrosVencidos > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 mb-8 flex items-center gap-4 animate-in slide-in-from-top-2">
          <div className="p-3 bg-red-500/20 rounded-2xl">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <p className="font-black text-red-400 uppercase tracking-widest text-sm">
              ⚠ {cobrosVencidos} factura{cobrosVencidos !== 1 ? 's' : ''} vencida{cobrosVencidos !== 1 ? 's' : ''} sin cobrar
            </p>
            <p className="text-red-400/60 text-xs font-bold mt-0.5">
              Total vencido: {totalVencido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Cobrado', value: totalCobrado, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
          { label: 'Pendiente de Cobro', value: totalPendiente, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
          { label: 'Vencido sin Cobrar', value: totalVencido, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle },
          { label: 'Total Facturado', value: totalCobrado + totalPendiente, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Euro },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} border rounded-3xl p-6`}>
            <div className={`${kpi.color} mb-3`}><kpi.icon size={20} /></div>
            <p className={`text-2xl font-black ${kpi.color}`}>
              {kpi.value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {['todos', 'pendiente', 'parcial', 'vencido', 'cobrado'].map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filtroEstado === estado
                ? 'bg-white text-[#1e3d6b] shadow-lg'
                : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
            }`}
          >
            {estado === 'todos' ? 'Todos' :
             estado === 'pendiente' ? 'Pendientes' :
             estado === 'parcial' ? 'Parciales' :
             estado === 'vencido' ? `Vencidos ${cobrosVencidos > 0 ? `(${cobrosVencidos})` : ''}` :
             'Cobrados'}
          </button>
        ))}
      </div>

      {/* TABLA DE COBROS */}
      <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin h-12 w-12 text-emerald-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] italic opacity-70">
                  <th className="px-6 pb-2">Cliente / Factura</th>
                  <th className="px-6 pb-2">Obra</th>
                  <th className="px-6 pb-2 text-center">Vencimiento</th>
                  <th className="px-6 pb-2 text-center">Estado</th>
                  <th className="px-6 pb-2 text-right">Cobrado</th>
                  <th className="px-6 pb-2 text-right">Pendiente</th>
                  <th className="px-6 pb-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cobrosFiltrados.map(cobro => {
                  const config = estadoConfig[cobro.estado] || estadoConfig.pendiente;
                  const pendiente = cobro.importe_total - cobro.importe_cobrado;
                  const dias = cobro.fecha_vencimiento ? diasHastaVencimiento(cobro.fecha_vencimiento) : null;
                  const pct = cobro.importe_total > 0 ? (cobro.importe_cobrado / cobro.importe_total) * 100 : 0;

                  return (
                    <tr key={cobro.id} className={`${cobro.estado === 'vencido' ? 'bg-red-500/5' : cobro.estado === 'cobrado' ? 'bg-emerald-500/5' : 'bg-white/5'} hover:bg-white/10 transition-all`}>
                      <td className="px-6 py-5 rounded-l-2xl">
                        <p className="font-black text-white text-sm">{cobro.facturas?.cliente_nombre}</p>
                        <p className="text-[10px] text-white/40 font-mono">{cobro.facturas?.numero_factura}</p>
                        {/* Barra de progreso */}
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden w-32">
                          <div
                            className={`h-full rounded-full ${cobro.estado === 'cobrado' ? 'bg-emerald-400' : cobro.estado === 'vencido' ? 'bg-red-400' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-white/60 font-bold italic">{cobro.facturas?.obra || '—'}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {cobro.fecha_vencimiento ? (
                          <div>
                            <p className={`text-sm font-black ${dias !== null && dias < 0 ? 'text-red-400' : dias !== null && dias <= 7 ? 'text-amber-400' : 'text-white/60'}`}>
                              {new Date(cobro.fecha_vencimiento).toLocaleDateString('es-ES')}
                            </p>
                            {dias !== null && cobro.estado !== 'cobrado' && (
                              <p className={`text-[9px] font-black ${dias < 0 ? 'text-red-400' : dias <= 7 ? 'text-amber-400' : 'text-white/30'}`}>
                                {dias < 0 ? `Vencida hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setSelectedCobro(cobro); setNuevaFechaVencimiento(''); setShowVencimientoModal(true); }}
                            className="text-[9px] text-blue-400 font-black uppercase hover:text-white transition-all"
                          >
                            + Añadir fecha
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="font-black text-emerald-400">{cobro.importe_cobrado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className={`font-black ${pendiente > 0 ? 'text-amber-400' : 'text-white/20'}`}>
                          {pendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </p>
                        <p className="text-[9px] text-white/30 font-bold">
                          Total: {cobro.importe_total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </p>
                      </td>
                      <td className="px-6 py-5 rounded-r-2xl text-center">
                        <div className="flex justify-center gap-2">
                          {cobro.estado !== 'cobrado' && (
                            <button
                              onClick={() => { setSelectedCobro(cobro); setShowPagoModal(true); }}
                              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white p-3 rounded-xl transition-all shadow-lg"
                              title="Registrar cobro"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedCobro(cobro); setNuevaFechaVencimiento(cobro.fecha_vencimiento || ''); setShowVencimientoModal(true); }}
                            className="bg-white/10 text-white/60 hover:bg-blue-500 hover:text-white p-3 rounded-xl transition-all"
                            title="Cambiar vencimiento"
                          >
                            <Calendar size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {cobrosFiltrados.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-white/20 font-black uppercase italic tracking-widest">
                      Sin cobros para el filtro seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}