'use client'

import React, { useState, useEffect } from "react";
import { Search, Plus, X, Briefcase, Users, Box, Loader2, CheckCircle } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function QuickActions() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const supabase = createClient();

  // Datos para el formulario
  const [formData, setFormData] = useState({
    titulo: '',
    cliente_id: '',
    total_presupuesto: '',
    estado: 'lead'
  });

  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase.from('clientes').select('id, nombre');
      if (data) setClientes(data);
    };
    fetchClientes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('obras').insert([formData]);
      if (error) throw error;
      toast.success('Obra creada correctamente');
      setShowModal(false);
      setFormData({ titulo: '', cliente_id: '', total_presupuesto: '', estado: 'lead' });
      window.location.reload(); // Recargamos para ver los cambios
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* BUSCADOR INTELIGENTE */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar en Odeplac Pro..."
            className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder:text-blue-100/40 outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium italic"
          />
        </div>

        {/* BOTÓN AÑADIR */}
        <button 
          onClick={() => setShowModal(true)}
          className="bg-white text-[#295693] px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-blue-50 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Nueva Obra</span>
        </button>
      </div>

      {/* MODAL / DRAWER RESPONSIVO */}
      {showModal && (
        <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-[#1e3d6b]/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black italic uppercase text-[#295693] tracking-tighter">Nueva Entrada</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Añadir proyecto al Pipeline</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-zinc-100 rounded-2xl text-zinc-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Título de la Reforma</label>
                <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input 
                      required
                      value={formData.titulo}
                      onChange={e => setFormData({...formData, titulo: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-[#295693] transition-all font-bold text-zinc-800"
                      placeholder="Ej: Reforma Local Gran Vía" 
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Presupuesto (€)</label>
                  <input 
                    type="number"
                    value={formData.total_presupuesto}
                    onChange={e => setFormData({...formData, total_presupuesto: e.target.value})}
                    className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-[#295693] font-bold"
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Estado Inicial</label>
                  <select 
                    value={formData.estado}
                    onChange={e => setFormData({...formData, estado: e.target.value})}
                    className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-[#295693] font-bold uppercase text-xs"
                  >
                    <option value="lead">Lead</option>
                    <option value="presupuesto">Presupuesto</option>
                    <option value="curso">En Curso</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Cliente Asignado</label>
                <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <select 
                      required
                      value={formData.cliente_id}
                      onChange={e => setFormData({...formData, cliente_id: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl outline-none focus:border-[#295693] font-bold appearance-none"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#295693] text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-800 transition-all flex justify-center items-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Crear Obra</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}