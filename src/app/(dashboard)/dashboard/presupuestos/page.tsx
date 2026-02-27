'use client'

import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Loader2, FileUp, UserPlus, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function GestionPresupuestos() {
  const supabase = createClient();
  
  // Estados de la página
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');

  // Estados del Modal (Copiados de ClientesPage)
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    nif_cif: ''
  });

  // 1. Cargar clientes de la base de datos
  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Error al cargar:', error);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // 2. Guardar nuevo cliente (Lógica de tu Modal)
  const handleSaveCliente = async () => {
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
        }]);

      if (error) throw error;

      toast.success('¡Cliente guardado correctamente!');
      setShowModal(false);
      setFormData({ nombre: '', email: '', telefono: '', direccion: '', nif_cif: '' });
      
      // Recargar lista y seleccionar automáticamente al nuevo cliente
      await fetchClientes();
      setClienteSeleccionado(formData.nombre);
      
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Procesar Presupuesto con n8n
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!clienteSeleccionado) {
      toast.error("Selecciona un cliente de la lista");
      return;
    }

    setIsUploading(true);
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    form.append('clienteManual', clienteSeleccionado);
    form.append('crearCliente', 'false');

    try {
      const response = await fetch('/api/presupuestos', {
        method: 'POST',
        body: form,
      });
      
      if (!response.ok) throw new Error('Error en el servidor');
      const data = await response.json();
      setResult(data);
      toast.success("Presupuesto analizado con éxito");
    } catch (error) {
      toast.error("Error al procesar el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Gestión de Presupuestos</h1>
          <p className="text-blue-100/60 text-sm">Generación inteligente basada en mediciones de albañilería.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white">
        
        {/* Columna Izquierda: Ajustes */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Selector de Cliente */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase text-blue-300 flex items-center gap-2 tracking-widest">
                  <Users size={12} /> Cliente del Proyecto
                </label>
                <button 
                  onClick={() => setShowModal(true)}
                  className="text-[10px] text-white/50 hover:text-white underline transition-all flex items-center gap-1"
                >
                  <UserPlus size={10} /> + Crear Nuevo
                </button>
              </div>

              <select 
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-400 appearance-none cursor-pointer"
                value={clienteSeleccionado}
                onChange={(e) => setClienteSeleccionado(e.target.value)}
              >
                <option value="" className="bg-[#1e3d6b]">-- Seleccionar cliente --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.nombre} className="bg-[#1e3d6b]">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Zona de Carga */}
            <div>
              <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
                <FileUp size={16} className="text-blue-300" />
                Archivo de Albañilería
              </h3>
              
              <label className={`
                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                ${isUploading ? 'bg-white/5 border-white/10' : 'bg-white/5 border-white/20 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10'}
                ${!clienteSeleccionado ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}
              `}>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  accept=".pdf" 
                  disabled={isUploading || !clienteSeleccionado} 
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-blue-300 mb-2 h-10 w-10" />
                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">IA Analizando...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="text-white/30 mb-3 h-10 w-10" />
                    <span className="text-xs font-bold text-white/90 text-center uppercase tracking-tight">
                      {clienteSeleccionado ? "Cargar PDF Técnico" : "Selecciona Cliente"}
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resultados */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-50 border-b border-zinc-200 p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">PROYECTO DETECTADO</span>
                  <p className="font-bold text-[#1e3d6b] text-xl uppercase tracking-tighter">{result.obra || 'Obra Sin Nombre'}</p>
                </div>
                <div className="bg-green-100 text-green-700 text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-2 border border-green-200">
                  <CheckCircle size={14} /> EXTRACCIÓN OK
                </div>
              </div>

              <div className="p-8">
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 mb-8">
                  <p className="text-[10px] text-zinc-400 uppercase font-black mb-1">Cliente Solicitante</p>
                  <p className="font-bold text-zinc-800 text-xl">{result.cliente}</p>
                </div>

                <table className="w-full text-sm mb-8">
                  <thead>
                    <tr className="text-zinc-400 border-b border-zinc-100 text-[10px] uppercase font-black">
                      <th className="py-3 text-left">Partida / Descripción</th>
                      <th className="py-3 text-right">Medición</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {result.partidas?.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 text-zinc-700 font-medium">{p.item}</td>
                        <td className="py-4 text-right">
                          <span className="font-black text-[#1e3d6b] text-base">{p.cantidad}</span>
                          <span className="ml-1 text-[10px] text-zinc-400 font-bold uppercase">{p.unidad}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <a 
                  href={result.pdfUrl}
                  target="_blank"
                  className="flex items-center justify-center gap-3 w-full bg-[#1e3d6b] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#295693] transition-all shadow-xl shadow-blue-900/20"
                >
                  <FileText size={18} /> DESCARGAR PRESUPUESTO OFICIAL
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[450px] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/20 bg-white/5 text-center px-10">
              <FileText size={60} className="mb-6 opacity-10 animate-pulse" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Esperando archivo para procesar...</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Nuevo Cliente (IDÉNTICO AL DE CLIENTES PAGE) */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1e3d6b]/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#295693] border border-white/20 w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UserPlus className="text-blue-300" /> Nuevo Cliente
              </h2>
              <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-all">
                <Plus className="rotate-45" size={28} />
              </button>
            </div>
            
            <div className="space-y-4 text-left">
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
              onClick={handleSaveCliente}
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