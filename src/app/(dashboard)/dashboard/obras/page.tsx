'use client'

import { useState, useEffect } from 'react';
import { Plus, X, User, Euro, Loader2, ArrowRight, Clock, AlertTriangle, CheckCircle2, MessageSquare, Calendar, Truck, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const COLUMNAS = [
  { id: 'lead', title: 'LEADS' },
  { id: 'presupuesto', title: 'PRESUPUESTOS' },
  { id: 'curso', title: 'EN CURSO' },
  { id: 'terminado', title: 'TERMINADOS' }
];

// Mapeo de iconos para que el historial quede profesional
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
  const [tipoSeguimiento, setTipoSeguimiento] = useState('comentario'); // Ajustado a tu DB
  const [isSavingNote, setIsSavingNote] = useState(false);

  const supabase = createClient();

  const fetchObras = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('*, clientes(nombre)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setObras(data || []);
    } catch (error: any) {
      toast.error('Error al cargar obras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchObras(); }, []);

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
          tipo: tipoSeguimiento, // Ahora coincide con el Check Constraint
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">PIPELINE</h1>
          <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de estados y seguimiento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[70vh]">
        {COLUMNAS.map(col => (
          <div key={col.id} className="flex flex-col gap-4">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl flex justify-between items-center border border-white/10 shadow-inner">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">{col.title}</span>
              <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-bold">
                {obras.filter(o => o.estado?.toLowerCase() === col.id).length}
              </span>
            </div>

            <div className="space-y-4">
              {obras.filter(o => o.estado?.toLowerCase() === col.id).map(obra => (
                <div 
                  key={obra.id} 
                  onClick={() => abrirSeguimiento(obra)}
                  className="bg-white rounded-[2rem] p-6 shadow-2xl border border-zinc-100 group hover:ring-4 hover:ring-blue-400/20 transition-all cursor-pointer relative"
                >
                  <h3 className="font-black text-zinc-900 leading-tight text-lg mb-4 group-hover:text-blue-600 transition-colors uppercase italic">
                    {obra.titulo}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                      <User size={12} className="text-blue-500" /> 
                      <span className="truncate">{obra.clientes?.nombre || 'Particular'}</span>
                    </div>

                    <div className="pt-4 border-t border-zinc-50 flex justify-between items-center">
                      <span className="text-xl font-black text-[#295693]">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(obra.total_presupuesto || 0)}
                      </span>
                      <select 
                        value={obra.estado?.toLowerCase()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => moverObra(obra.id, e.target.value)}
                        className="text-[9px] font-black bg-zinc-100 border-none rounded-xl px-3 py-1.5 outline-none text-zinc-500 hover:bg-blue-600 hover:text-white transition-all cursor-pointer uppercase"
                      >
                        {COLUMNAS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* PANEL DE SEGUIMIENTO PROFESIONAL */}
      {selectedObra && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1e3d6b]/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="bg-[#295693] p-10 text-white flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">{selectedObra.titulo}</h2>
                <p className="text-blue-200/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2 italic">
                  <User size={14} /> {selectedObra.clientes?.nombre}
                </p>
              </div>
              <button onClick={() => setSelectedObra(null)} className="bg-white/10 hover:bg-white text-white hover:text-[#295693] p-4 rounded-2xl transition-all shadow-lg">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-50">
              {/* Lado Izquierdo: Formulario con los tipos correctos */}
              <div className="w-full md:w-1/2 p-10 border-r border-zinc-200 flex flex-col gap-6 overflow-y-auto">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#295693]">
                        <MessageSquare size={18} />
                        <h3 className="font-black uppercase text-xs tracking-widest italic">Añadir al Diario de Obra</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                    {['comentario', 'logistica', 'retraso', 'hito'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setTipoSeguimiento(t)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase ${
                              tipoSeguimiento === t 
                              ? (t === 'retraso' ? 'bg-red-500 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg') 
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
                      placeholder="Escribe aquí la actualización de la obra..."
                      className="w-full h-48 bg-white border-2 border-zinc-100 rounded-[2rem] p-6 text-zinc-800 text-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none shadow-inner"
                    />

                    <button 
                      onClick={guardarSeguimiento}
                      disabled={isSavingNote || !nuevoMensaje}
                      className="w-full bg-[#295693] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isSavingNote ? <Loader2 className="animate-spin" /> : 'Registrar Seguimiento'}
                    </button>
                </div>
              </div>

              {/* Lado Derecho: Historial */}
              <div className="w-full md:w-1/2 p-10 bg-white overflow-y-auto flex flex-col gap-6">
                 <div className="flex items-center gap-2 text-zinc-400">
                    <Clock size={18} />
                    <h3 className="font-black uppercase text-xs tracking-widest italic">Historial de Seguimiento</h3>
                 </div>

                 <div className="space-y-6">
                    {seguimientos.length === 0 ? (
                        <div className="text-center py-20 text-zinc-200 italic font-bold uppercase text-[10px] tracking-[0.3em]">Sin registros previos</div>
                    ) : (
                        seguimientos.map((s) => (
                        <div key={s.id} className="relative pl-8 border-l-2 border-zinc-100 pb-2">
                            <div className={`absolute -left-[9px] top-0 p-1 rounded-full ${s.tipo === 'retraso' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                {ICONOS_TIPO[s.tipo] || <Clock size={10} />}
                            </div>
                            <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 shadow-sm">
                                <p className="text-sm text-zinc-800 font-bold leading-relaxed">{s.mensaje}</p>
                                <div className="flex items-center justify-between mt-4">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${s.tipo === 'retraso' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {s.tipo}
                                    </span>
                                    <span className="text-[9px] font-black text-zinc-300 uppercase tracking-tighter">
                                        {new Date(s.created_at).toLocaleString('es-ES')}
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