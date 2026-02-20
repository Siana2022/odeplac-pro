'use client'

import { useState, useEffect } from 'react';
import { Plus, Truck, Edit2, Mail, Phone, User as UserIcon, X, Globe, MapPin, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    nombre: '', 
    persona_contacto: '', 
    email: '', 
    telefono: '', 
    web: '', 
    direccion: '' 
  });

  const supabase = createClient();

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setProveedores(data || []);
    } catch (error: any) {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProveedores(); }, []);

  const handleOpenModal = (proveedor?: any) => {
    if (proveedor) {
      setEditingId(proveedor.id);
      setFormData({
        nombre: proveedor.nombre || '',
        persona_contacto: proveedor.persona_contacto || '',
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        web: proveedor.web || '',
        direccion: proveedor.direccion || ''
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', persona_contacto: '', email: '', telefono: '', web: '', direccion: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre) return toast.error('El nombre es obligatorio');
    
    setIsSaving(true);
    try {
      if (editingId) {
        // ACTUALIZAR
        const { error } = await supabase
          .from('proveedores')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Proveedor actualizado con éxito');
      } else {
        // CREAR
        const { error } = await supabase
          .from('proveedores')
          .insert([formData]);
        if (error) throw error;
        toast.success('Proveedor registrado con éxito');
      }

      setShowModal(false);
      fetchProveedores();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase italic">Proveedores</h1>
          <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-[0.3em]">Directorio logístico Odeplac</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-white text-[#295693] px-8 py-3 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all text-xs uppercase"
        >
          + Nuevo Proveedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && proveedores.length === 0 ? (
          <div className="col-span-full py-20 text-center text-white/20 uppercase font-black italic tracking-widest animate-pulse">
            <Loader2 className="animate-spin mx-auto mb-4" size={40} />
            Sincronizando proveedores...
          </div>
        ) : proveedores.length === 0 ? (
          <div className="col-span-full py-20 text-center text-white/10 uppercase font-black italic tracking-widest border-2 border-dashed border-white/5 rounded-[3rem]">
            No hay proveedores registrados todavía
          </div>
        ) : (
          proveedores.map(p => (
            <div key={p.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-zinc-100 hover:ring-4 hover:ring-blue-400/20 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-blue-50 p-4 rounded-2xl text-[#295693] shadow-inner">
                  <Truck size={24} />
                </div>
                <button 
                  onClick={() => handleOpenModal(p)}
                  className="bg-zinc-50 hover:bg-[#295693] text-zinc-300 hover:text-white p-3 rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic mb-6 tracking-tighter leading-none">{p.nombre}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-zinc-500 text-[11px] font-black uppercase tracking-wider">
                  <UserIcon size={14} className="text-blue-500" /> {p.persona_contacto || 'SIN CONTACTO'}
                </div>
                {p.email && (
                  <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold">
                    <Mail size={14} className="text-blue-500/50" /> {p.email}
                  </div>
                )}
                {p.telefono && (
                  <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold">
                    <Phone size={14} className="text-blue-500/50" /> {p.telefono}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e3d6b]/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-[#295693] uppercase italic tracking-tighter">
                {editingId ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-300 hover:text-zinc-900 transition-colors">
                <X size={32} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest text-blue-600/60">Nombre Empresa</label>
                <input 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] transition-all"
                  placeholder="Ej: BricoPladur S.L." 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest text-blue-600/60">Persona de Contacto</label>
                <input 
                  value={formData.persona_contacto}
                  onChange={e => setFormData({...formData, persona_contacto: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] transition-all"
                  placeholder="Ej: Juan Antonio" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest text-blue-600/60">Correo Electrónico</label>
                <input 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] transition-all"
                  placeholder="ventas@proveedor.com" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest text-blue-600/60">Teléfono</label>
                <input 
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] transition-all"
                  placeholder="910 000 000" 
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest text-blue-600/60">Dirección Fiscal / Almacén</label>
                <input 
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] transition-all"
                  placeholder="Calle de la industria, 12. Polígono..." 
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-[#295693] text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : editingId ? 'GUARDAR CAMBIOS' : 'REGISTRAR PROVEEDOR'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}