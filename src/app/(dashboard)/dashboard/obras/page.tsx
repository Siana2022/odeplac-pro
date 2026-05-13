'use client'

import { useState, useEffect } from 'react';
import { Plus, X, User, Euro, Loader2, ArrowRight, Clock, AlertTriangle, CheckCircle2, MessageSquare, Calendar, Truck, Flag, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const COLUMNAS = [
  { id: 'lead', title: 'LEADS' },
  { id: 'presupuesto', title: 'PRESUPUESTOS' },
  { id: 'curso', title: 'EN CURSO' },
  { id: 'terminado', title: 'TERMINADOS' }
];

const ICONOS_TIPO: Record<string, any> = {
  comentario: <MessageSquare size={10} />,
  logistica: <Truck size={10} />,
  retraso: <AlertTriangle size={10} />,
  hito: <Flag size={10} />
};

export default function PipelinePage() {
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObra, setSelectedObra] = useState<any>(null);
  const [seguimientos, setSeguimientos] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [tipoSeguimiento, setTipoSeguimiento] = useState('comentario');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ESTADOS PARA NUEVA OBRA
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [nuevaObra, setNuevaObra] = useState({
    titulo: '',
    cliente_id: '',
    estado: 'lead',
    total_presupuesto: 0
  });

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: dataObras, error: errorObras } = await supabase
        .from('obras')
        .select('*, clientes(nombre)')
        .order('updated_at', { ascending: false });
      
      if (errorObras) throw errorObras;
      setObras(dataObras || []);

      const { data: dataClientes } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre');
      
      setClientes(dataClientes || []);

    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCrearObra = async () => {
    if (!nuevaObra.titulo || !nuevaObra.cliente_id) {
      toast.error('Nombre de obra y cliente son obligatorios');
      return;
    }
    setIsCreating(true);
    try {
      const { error } = await supabase.from('obras').insert([nuevaObra]);
      if (error) throw error;
      toast.success('¡Obra creada con éxito!');
      setIsCrearModalOpen(false);
      setNuevaObra({ titulo: '', cliente_id: '', estado: 'lead', total_presupuesto: 0 });
      fetchData();
    } catch (error: any) {
      toast.error('Error al crear obra');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEliminarObra = async (id: string) => {
    try {
      // Primero eliminamos los seguimientos asociados
      await supabase.from('obra_seguimiento').delete().eq('obra_id', id);
      // Luego eliminamos la obra
      const { error } = await supabase.from('obras').delete().eq('id', id);
      if (error) throw error;
      toast.success('Obra eliminada correctamente');
      setConfirmDeleteId(null);
      setSelectedObra(null);
      fetchData();
    } catch (error: any) {
      toast.error('Error al eliminar la obra: ' + error.message);
    }
  };

  const moverObra = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('obras')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setObras(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o));
      toast.success(`Movido a ${nuevoEstado.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al mover');
    }
  };

  const abrirSeguimiento = async (obra: any) => {
    setSelectedObra(obra);
    const { data, error } = await supabase
      .from('obra_seguimiento')
      .select('*')
      .eq('obra_id', obra.id)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Error cargando seguimiento:", error);
    setSeguimientos(data || []);
  };

  const guardarSeguimiento = async () => {
    if (!nuevoMensaje.trim()) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from('obra_seguimiento')
        .insert([{
          obra_id: selectedObra.id,
          mensaje: nuevoMensaje,
          tipo: tipoSeguimiento,
          es_publico: true
        }]);
      if (error) throw error;
      toast.success('Nota registrada en el diario');
      setNuevoMensaje('');
      abrirSeguimiento(selectedObra);
    } catch (error: any) {
      toast.error(`Error de base de datos: ${error.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  if (loading && obras.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-white w-12 h-12" />
        <p className="text-white font-black italic uppercase tracking-widest">Cargando Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">Pipeline</h1>
          <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de estados y seguimiento</p>
        </div>
        
        <button 
          onClick={() => setIsCrearModalOpen(true)}
          className="bg-white text-[#295693] px-8 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-b-4 border-zinc-300"
        >
          <Plus size={18} strokeWidth={3} /> Nueva Obra
        </button>
      </div>

      {/* PIPELINE */}
      <div className="flex flex-row overflow-x-auto lg:grid lg:grid-cols-4 gap-8 min-h-[75vh] pb-20 snap-x snap-mandatory lg:overflow-x-visible scrollbar-hide">
        {COLUMNAS.map(col => (
          <div key={col.id} className="flex flex-col gap-6 min-w-[85vw] md:min-w-[45vw] lg:min-w-0 snap-center">
            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-[2.5rem] flex justify-between items-center border border-white/10 shadow-inner">
              <span className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em] italic">{col.title}</span>
              <span className="bg-blue-500 text-white text-[10px] px-4 py-1.5 rounded-full font-black shadow-lg">
                {obras.filter(o => o.estado?.toLowerCase() === col.id).length}
              </span>
            </div>

            <div className="space-y-6">
              {obras.filter(o => o.estado?.toLowerCase() === col.id).map(obra => (
                <div 
                  key={obra.id} 
                  className="bg-white rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100 group hover:ring-8 hover:ring-blue-500/10 transition-all relative"
                >
                  {/* Botón eliminar */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(obra.id); }}
                    className="absolute top-4 right-4 p-2 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar obra"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div onClick={() => abrirSeguimiento(obra)} className="cursor-pointer">
                    <h3 className="font-black text-zinc-900 leading-[1.1] text-xl mb-5 group-hover:text-blue-600 transition-colors uppercase italic break-words pr-8">
                      {obra.titulo}
                    </h3>
                    
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 text-zinc-400 text-[10px] font-black uppercase tracking-widest bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <User size={14} className="text-blue-600" /> 
                        <span className="truncate">{obra.clientes?.nombre || 'Particular'}</span>
                      </div>

                      <div className="pt-6 border-t border-zinc-100 space-y-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter mb-1 italic">Presupuesto</span>
                          <span className="text-2xl font-black text-[#295693] tracking-tighter">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(obra.total_presupuesto || 0)}
                          </span>
                        </div>
                        
                        <div className="relative w-full" onClick={e => e.stopPropagation()}>
                          <select 
                            value={obra.estado?.toLowerCase()}
                            onChange={(e) => moverObra(obra.id, e.target.value)}
                            className="w-full text-[10px] font-black bg-[#295693] text-white border-none rounded-2xl px-5 py-3 outline-none hover:bg-blue-600 transition-all cursor-pointer uppercase shadow-lg appearance-none"
                          >
                            {COLUMNAS.map(c => <option key={c.id} value={c.id} className="bg-white text-zinc-900">{c.title}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {obras.filter(o => o.estado?.toLowerCase() === col.id).length === 0 && (
                <div className="h-40 border-4 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em] italic">Vacío</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CONFIRMAR BORRADO */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic">¿Eliminar Obra?</h3>
              <p className="text-zinc-500 text-sm mt-2">Esta acción no se puede deshacer. Se eliminarán también todos los seguimientos asociados.</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-4 border-2 border-zinc-200 rounded-2xl font-black text-zinc-600 hover:bg-zinc-50 transition-all text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminarObra(confirmDeleteId)}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all text-xs uppercase shadow-lg"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR OBRA */}
      {isCrearModalOpen && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-[#1e3d6b]/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#295693] p-10 text-white flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Nueva Obra</h2>
                <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest italic mt-1">Alta de proyecto</p>
              </div>
              <button onClick={() => setIsCrearModalOpen(false)} className="bg-white/10 hover:bg-white text-white hover:text-[#295693] p-4 rounded-3xl transition-all shadow-xl">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 bg-zinc-50/50">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-[#295693] ml-4 tracking-widest italic">Nombre de la Obra</label>
                <input 
                  type="text"
                  placeholder="Ej: Reforma Vivienda"
                  className="w-full bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 outline-none focus:border-blue-500 transition-all font-bold text-lg"
                  onChange={(e) => setNuevaObra({...nuevaObra, titulo: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-[#295693] ml-4 tracking-widest italic">Asignar Cliente</label>
                <div className="relative">
                  <select 
                    className="w-full bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 outline-none focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer text-lg"
                    onChange={(e) => setNuevaObra({...nuevaObra, cliente_id: e.target.value})}
                  >
                    <option value="">Selecciona cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-[#295693] ml-4 tracking-widest italic">Estado Inicial</label>
                  <select 
                    className="w-full bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 font-bold outline-none cursor-pointer"
                    onChange={(e) => setNuevaObra({...nuevaObra, estado: e.target.value})}
                  >
                    {COLUMNAS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-[#295693] ml-4 tracking-widest italic">Ppto. Estimado</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 font-bold outline-none"
                    onChange={(e) => setNuevaObra({...nuevaObra, total_presupuesto: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <button 
                onClick={handleCrearObra}
                disabled={isCreating}
                className="w-full bg-[#295693] text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-3 border-b-8 border-blue-900"
              >
                {isCreating ? <Loader2 className="animate-spin" /> : 'Confirmar Alta de Obra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL DE SEGUIMIENTO (MODAL) */}
      {selectedObra && (
        <div className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center bg-[#1e3d6b]/95 backdrop-blur-md p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-[95vh] sm:h-[88vh] rounded-t-[4rem] sm:rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-[#295693] p-8 sm:p-12 text-white flex justify-between items-center shrink-0">
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter truncate max-w-[220px] sm:max-w-none">
                  {selectedObra.titulo}
                </h2>
                <div className="flex items-center gap-4">
                    <p className="text-blue-200/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2 italic">
                        <User size={16} /> {selectedObra.clientes?.nombre}
                    </p>
                    <span className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedObra.estado}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setSelectedObra(null); setConfirmDeleteId(selectedObra.id); }}
                  className="bg-red-500/20 hover:bg-red-500 text-white p-4 rounded-[2rem] transition-all"
                  title="Eliminar obra"
                >
                  <Trash2 size={20} />
                </button>
                <button onClick={() => setSelectedObra(null)} className="bg-white/10 hover:bg-white text-white hover:text-[#295693] p-4 sm:p-6 rounded-[2rem] transition-all">
                  <X size={28} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-50">
              <div className="w-full md:w-2/5 p-8 sm:p-12 border-r border-zinc-200 flex flex-col gap-8 overflow-y-auto">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 text-[#295693]">
                        <MessageSquare size={20} />
                        <h3 className="font-black uppercase text-[11px] tracking-[0.2em] italic">Nuevo Registro</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                    {['comentario', 'logistica', 'retraso', 'hito'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setTipoSeguimiento(t)}
                          className={`px-4 py-3 rounded-2xl text-[9px] font-black tracking-widest transition-all uppercase ${
                              tipoSeguimiento === t 
                              ? (t === 'retraso' ? 'bg-red-500 text-white shadow-xl' : 'bg-blue-600 text-white shadow-xl') 
                              : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          {t}
                        </button>
                    ))}
                    </div>

                    <textarea 
                      value={nuevoMensaje}
                      onChange={(e) => setNuevoMensaje(e.target.value)}
                      placeholder="Actualización diaria..."
                      className="w-full h-40 sm:h-56 bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 text-zinc-800 text-base outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                    />

                    <button 
                      onClick={guardarSeguimiento}
                      disabled={isSavingNote || !nuevoMensaje}
                      className="w-full bg-[#295693] text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-50"
                    >
                      {isSavingNote ? <Loader2 className="animate-spin mx-auto" /> : 'Publicar en Bitácora'}
                    </button>
                </div>
              </div>

              <div className="w-full md:w-3/5 p-8 sm:p-12 bg-white overflow-y-auto flex flex-col gap-10">
                 <div className="flex items-center gap-3 text-zinc-400">
                    <Clock size={20} />
                    <h3 className="font-black uppercase text-[11px] tracking-[0.2em] italic">Bitácora</h3>
                 </div>

                 <div className="space-y-8">
                    {seguimientos.length === 0 ? (
                        <div className="text-center py-20 border-4 border-dashed border-zinc-50 rounded-[3rem]">
                            <p className="text-zinc-200 italic font-black uppercase text-xs tracking-[0.4em]">Sin registros</p>
                        </div>
                    ) : (
                        seguimientos.map((s) => (
                        <div key={s.id} className="relative pl-12 border-l-4 border-zinc-100 pb-4">
                            <div className={`absolute -left-[14px] top-0 p-2 rounded-2xl shadow-lg ${s.tipo === 'retraso' ? 'bg-red-500 text-white' : 'bg-[#295693] text-white'}`}>
                                {ICONOS_TIPO[s.tipo] || <Clock size={14} />}
                            </div>
                            <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 shadow-sm">
                                <p className="text-sm sm:text-base text-zinc-800 font-bold leading-relaxed">{s.mensaje}</p>
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-200/50">
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${s.tipo === 'retraso' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#295693]'}`}>
                                        {s.tipo}
                                    </span>
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                        {new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        ))
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}