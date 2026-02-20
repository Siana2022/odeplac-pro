'use client'

import { useState, useEffect } from 'react';
import { Settings, UserPlus, Building2, Save, Loader2, Users, X, Mail, Lock, Phone, Globe, MapPin, Edit2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { adminCreateUser } from '@/app/auth/actions'; 
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [empresa, setEmpresa] = useState({
    nombre_fiscal: 'Odeplac Pro S.L.',
    cif: 'B12345678',
    direccion: 'Calle de la Innovación, 42',
    telefono: '600 000 000',
    email: 'info@odeplac.com',
    web: 'www.odeplac.com'
  });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rol: 'cliente',
    cliente_id: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from('perfiles').select('*, clientes:cliente_id(nombre)').order('created_at', { ascending: false });
      const { data: c } = await supabase.from('clientes').select('id, nombre').order('nombre');
      setUsuarios(p || []);
      setClientes(c || []);
    } catch (error) {
      toast.error('Error al sincronizar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        email: user.email,
        password: '', 
        rol: user.rol,
        cliente_id: user.cliente_id || ''
      });
    } else {
      setEditingId(null);
      setFormData({ email: '', password: '', rol: 'cliente', cliente_id: '' });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.email) return toast.error('El email es obligatorio');
    setLoading(true);
    
    try {
      if (editingId) {
        // ACTUALIZAR PERFIL EXISTENTE
        const { error } = await supabase
          .from('perfiles')
          .update({
            rol: formData.rol,
            cliente_id: formData.rol === 'cliente' ? formData.cliente_id : null
          })
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Acceso actualizado correctamente');
      } else {
        // CREAR NUEVO USUARIO EN AUTH Y LUEGO PERFIL
        if (!formData.password) throw new Error('La contraseña es obligatoria para nuevos accesos');

        const { data: authData, error: authError } = await adminCreateUser(
          formData.email,
          formData.password,
          { rol: formData.rol }
        );

        if (authError) throw authError;

        // --- CORRECCIÓN PARA VERCEL (TypeScript Check) ---
        if (!authData?.user) {
          throw new Error('No se pudo obtener la información del usuario creado.');
        }

        const { error: perfilError } = await supabase
          .from('perfiles')
          .insert({
            id: authData.user.id, // Ahora TypeScript sabe que user existe
            email: formData.email,
            nombre: formData.email.split('@')[0].toUpperCase(), 
            rol: formData.rol,
            cliente_id: formData.rol === 'cliente' ? formData.cliente_id : null
          });

        if (perfilError) throw perfilError;
        toast.success('¡Acceso creado y vinculado!');
      }
      
      setShowUserModal(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Configuración</h1>
        <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de accesos y parámetros globales</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* BLOQUE: DATOS ODEPLAC */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-zinc-100">
            <div className="flex items-center gap-3 text-[#295693] mb-8">
              <Building2 size={20} />
              <h2 className="font-black uppercase text-xs tracking-widest italic">Datos Odeplac</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Nombre Fiscal', key: 'nombre_fiscal' },
                { label: 'CIF / NIF', key: 'cif' },
                { label: 'Dirección Almacén', key: 'direccion' },
                { label: 'Teléfono', key: 'telefono' },
                { label: 'Email', key: 'email' },
                { label: 'Web', key: 'web' },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase ml-2">{field.label}</label>
                  <input 
                    value={(empresa as any)[field.key]}
                    onChange={(e) => setEmpresa({...empresa, [field.key]: e.target.value})}
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-3 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
              <button className="w-full bg-[#295693] text-white py-4 rounded-[2rem] font-black text-[10px] uppercase shadow-lg mt-4 hover:bg-blue-700 transition-all">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>

        {/* BLOQUE: USUARIOS CON ACCESO */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-zinc-100 min-h-[500px]">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3 text-[#295693]">
                <Users size={20} />
                <h2 className="font-black uppercase text-xs tracking-widest italic">Usuarios con Acceso</h2>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="bg-[#295693] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <UserPlus size={14} /> Crear Acceso
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuarios.map(user => (
                <div key={user.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-lg ${user.rol === 'admin' ? 'bg-red-500' : 'bg-[#295693]'}`}>
                      {user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-800 uppercase italic leading-none">{user.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[8px] font-black bg-white border border-zinc-200 text-blue-500 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                          {user.rol}
                        </span>
                        {user.clientes?.nombre && (
                          <span className="text-[8px] font-black bg-blue-100 text-[#295693] px-2 py-0.5 rounded-md uppercase tracking-tighter">
                            {user.clientes.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleOpenModal(user)} className="text-zinc-300 hover:text-[#295693] p-2 hover:bg-white rounded-xl transition-all">
                    <Edit2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL VINCULAR/EDITAR ACCESO */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e3d6b]/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 space-y-8 shadow-2xl animate-in zoom-in-95 border border-white/20">
            <div className="flex justify-between items-center text-[#295693]">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                {editingId ? 'Editar Acceso' : 'Nuevo Acceso'}
              </h2>
              <button onClick={() => setShowUserModal(false)}><X size={32} className="text-zinc-300 hover:text-zinc-900" /></button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Email del Usuario</label>
                <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                   <input 
                    type="email"
                    disabled={!!editingId}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500 disabled:opacity-50"
                    placeholder="ejemplo@odeplac.com"
                  />
                </div>
              </div>

              {!editingId && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Contraseña de acceso</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                    <input 
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Rol del sistema</label>
                <select 
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="cliente">CLIENTE (Acceso limitado)</option>
                  <option value="admin">ADMINISTRADOR (Acceso total)</option>
                </select>
              </div>

              {formData.rol === 'cliente' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-2">Vincular a Ficha de Cliente</label>
                  <select 
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                    className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-sm font-bold text-[#295693] outline-none appearance-none shadow-inner"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                onClick={handleSaveUser}
                disabled={loading}
                className="w-full bg-[#295693] text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : editingId ? 'GUARDAR CAMBIOS' : 'CREAR Y VINCULAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}