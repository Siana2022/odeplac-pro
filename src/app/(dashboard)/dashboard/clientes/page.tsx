'use client'

import { useState, useEffect } from 'react';
import { Plus, Search, UserPlus, Loader2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function ClientesPage() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  
  // Estado del formulario ajustado a tus columnas reales
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    nif_cif: ''
  });

  const supabase = createClient();

  // Cargar clientes de la base de datos
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Error al cargar:', error);
      toast.error('No se pudo cargar la lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // Guardar cliente usando solo las columnas que existen en tu tabla
  const handleSave = async () => {
    if (!formData.nombre) return toast.error('El nombre es obligatorio');
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .insert([{
          nombre: formData.nombre, 
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          nif_cif: formData.nif_cif
          // Eliminado usuario_id porque no existe en tu tabla según el SQL Editor
        }]);

      if (error) throw error;

      toast.success('¡Cliente guardado correctamente!');
      setShowModal(false);
      // Limpiar formulario
      setFormData({ nombre: '', email: '', telefono: '', direccion: '', nif_cif: '' });
      fetchClientes();
    } catch (error: any) {
      console.error('Error al guardar:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-blue-100/60 text-sm">Base de datos oficial de Odeplac Pro.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-white text-[#295693] px-4 py-2 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 text-xs font-semibold uppercase text-blue-100/60 tracking-wider">Nombre / Empresa</th>
              <th className="p-4 text-xs font-semibold uppercase text-blue-100/60 tracking-wider">Email</th>
              <th className="p-4 text-xs font-semibold uppercase text-blue-100/60 tracking-wider">Teléfono</th>
              <th className="p-4 text-xs font-semibold uppercase text-blue-100/60 tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/90">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-300 mb-2" />
                  <span className="text-blue-100/40 text-sm">Consultando base de datos...</span>
                </td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-blue-100/40 italic">
                  No hay clientes. Pulsa "Nuevo Cliente" para registrar el primero.
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-white">{c.nombre}</div>
                    <div className="text-[10px] text-blue-200/50 uppercase">{c.nif_cif || 'Sin NIF'}</div>
                  </td>
                  <td className="p-4 text-blue-100/70 text-sm">{c.email || '-'}</td>
                  <td className="p-4 text-blue-100/70 text-sm">{c.telefono || '-'}</td>
                  <td className="p-4 text-right">
                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg transition-all">
                      Ficha
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Nuevo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1e3d6b]/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#295693] border border-white/20 w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UserPlus className="text-blue-300" /> Nuevo Cliente
              </h2>
              <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-all">
                <Plus className="rotate-45" size={28} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200/60 uppercase ml-1 tracking-widest">Nombre o Razón Social</label>
                <input 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20 transition-all" 
                  placeholder="Ej: Construcciones Juanjo S.L." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-blue-200/60 uppercase ml-1 tracking-widest">NIF / CIF</label>
                  <input 
                    value={formData.nif_cif}
                    onChange={e => setFormData({...formData, nif_cif: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20" 
                    placeholder="B12345678" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-blue-200/60 uppercase ml-1 tracking-widest">Teléfono</label>
                  <input 
                    value={formData.telefono}
                    onChange={e => setFormData({...formData, telefono: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20" 
                    placeholder="600 000 000" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200/60 uppercase ml-1 tracking-widest">Email</label>
                <input 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20" 
                  placeholder="contacto@cliente.com" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-blue-200/60 uppercase ml-1 tracking-widest">Dirección completa</label>
                <input 
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20" 
                  placeholder="Calle Ejemplo 123, Madrid" 
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-white text-[#295693] py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 active:scale-95 transition-all shadow-xl flex justify-center items-center gap-3"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Guardar Cliente</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}