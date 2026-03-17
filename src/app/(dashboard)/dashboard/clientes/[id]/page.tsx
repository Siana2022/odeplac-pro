'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, Phone, Hash, Save, Trash2, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function FichaClientePage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cliente, setCliente] = useState<any>(null);

  useEffect(() => {
    async function fetchCliente() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast.error("No se encontró el cliente");
        router.push('/dashboard/clientes');
      } else {
        setCliente(data);
      }
      setLoading(false);
    }
    fetchCliente();
  }, [id, supabase, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    const { error } = await supabase
      .from('clientes')
      .update({
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
        nif_cif: cliente.nif_cif,
        direccion: cliente.direccion
      })
      .eq('id', id);

    if (error) {
      toast.error("Error al actualizar: " + error.message);
    } else {
      toast.success("Ficha actualizada correctamente");
    }
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres eliminar a este cliente?")) return;
    
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Error al eliminar");
    } else {
      toast.success("Cliente eliminado");
      router.push('/dashboard/clientes');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen text-white">
      <Loader2 className="animate-spin text-blue-400 mb-4" size={48} />
      <p className="font-bold uppercase tracking-widest text-xs opacity-50">Cargando ficha...</p>
    </div>
  );

  if (!cliente) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <button onClick={() => router.push('/dashboard/clientes')} className="flex items-center gap-2 text-blue-200/40 hover:text-white mb-8 transition-all group">
        <ArrowLeft size={18} /> 
        <span className="text-xs font-bold uppercase tracking-widest">Volver a Clientes</span>
      </button>

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Ficha Técnica</h1>
        <button onClick={handleDelete} className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-3 rounded-2xl transition-all flex items-center gap-2 border border-red-500/20 font-bold text-[10px] uppercase tracking-widest">
          <Trash2 size={16} /> Eliminar Registro
        </button>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">Nombre / Razón Social</label>
          <div className="relative">
            <User className="absolute left-5 top-5 text-blue-300/30" size={20} />
            <input 
              className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold"
              value={cliente.nombre || ''}
              onChange={(e) => setCliente({...cliente, nombre: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">CIF / NIF</label>
          <div className="relative">
            <Hash className="absolute left-5 top-5 text-blue-300/30" size={20} />
            <input 
              className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold"
              value={cliente.nif_cif || ''}
              onChange={(e) => setCliente({...cliente, nif_cif: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">Email</label>
          <div className="relative">
            <Mail className="absolute left-5 top-5 text-blue-300/30" size={20} />
            <input 
              className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold"
              value={cliente.email || ''}
              onChange={(e) => setCliente({...cliente, email: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">Teléfono</label>
          <div className="relative">
            <Phone className="absolute left-5 top-5 text-blue-300/30" size={20} />
            <input 
              className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold"
              value={cliente.telefono || ''}
              onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
            />
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">Dirección</label>
          <div className="relative">
            <MapPin className="absolute left-5 top-5 text-blue-300/30" size={20} />
            <input 
              className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold"
              value={cliente.direccion || ''}
              onChange={(e) => setCliente({...cliente, direccion: e.target.value})}
            />
          </div>
        </div>

        <div className="md:col-span-2 pt-6">
          <button 
            type="submit"
            disabled={updating}
            className="w-full bg-white text-[#1e3d6b] p-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 hover:bg-blue-50 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50"
          >
            {updating ? <Loader2 className="animate-spin" /> : <Save size={22} />}
            Actualizar Datos
          </button>
        </div>
      </form>
    </div>
  );
}