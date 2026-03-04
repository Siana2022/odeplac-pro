'use client'

import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Loader2, FileUp, UserPlus, Users, Plus, History } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link'; // Importante para la navegación

export default function GestionPresupuestos() {
  const supabase = createClient();
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', direccion: '', nif_cif: '' });

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    setClientes(data || []);
  };

  useEffect(() => { fetchClientes(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clienteSeleccionado) return toast.error("Selecciona un cliente primero");

    setIsUploading(true);
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    form.append('clienteManual', clienteSeleccionado);

    try {
      const response = await fetch('/api/presupuestos', { method: 'POST', body: form });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setResult(data);
      toast.success("Presupuesto calculado correctamente");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white">
      {/* Cabecera con Acceso al Historial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Gestión de Presupuestos</h1>
          <p className="text-blue-100/60 text-sm">IA Odeplac: Extracción de mediciones y costes de materiales.</p>
        </div>

        <Link 
          href="/dashboard/historial" 
          className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-4 rounded-2xl transition-all group active:scale-95"
        >
          <div className="bg-blue-500/20 p-2 rounded-lg text-blue-300 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <History size={20} />
          </div>
          <div className="text-left">
            <span className="block text-[10px] font-black uppercase tracking-widest text-blue-300">Consultar</span>
            <span className="block text-sm font-bold uppercase">Ver Historial</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Ajustes */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 space-y-6 shadow-xl">
            <div>
              <label className="text-[10px] font-black uppercase text-blue-300 flex items-center gap-2 mb-2 tracking-widest"><Users size={12} /> Cliente</label>
              <select className="w-full bg-[#1e3d6b] border border-white/20 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:outline-none transition-colors" value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-50 border-white/10' : 'hover:border-blue-400 border-white/20 bg-white/5'}`}>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={isUploading || !clienteSeleccionado} />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-blue-300 h-10 w-10 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Analizando...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="text-white/30 mb-3 h-10 w-10" />
                    <span className="text-xs font-bold uppercase tracking-tight">
                      {clienteSeleccionado ? "Subir Mediciones PDF" : "Selecciona Cliente"}
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
            <div className="bg-white text-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-50 p-6 border-b flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">PROYECTO DETECTADO</span>
                  <p className="font-bold text-[#1e3d6b] text-xl uppercase tracking-tighter">{result.obra || 'Obra Sin Nombre'}</p>
                </div>
                <div className="bg-green-100 text-green-700 text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-2 border border-green-200">
                  <CheckCircle size={14} /> EXTRACCIÓN OK
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase font-black mb-1">Cliente Asignado</p>
                    <p className="font-bold text-zinc-800 text-lg uppercase tracking-tight">{result.cliente}</p>
                  </div>
                  <div className="p-5 bg-[#1e3d6b] rounded-2xl border border-blue-900 shadow-xl shadow-blue-900/30">
                    <p className="text-[10px] text-blue-200/60 uppercase font-black mb-1">Total Materiales (PVP)</p>
                    <p className="font-black text-white text-2xl">{result.total_presupuesto} €</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm mb-8">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-100 text-[10px] uppercase font-black tracking-widest">
                        <th className="py-3 text-left w-12">Nº</th>
                        <th className="py-3 text-left">Descripción del Sistema</th>
                        <th className="py-3 text-right">Medición</th>
                        <th className="py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {result.partidas?.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="py-4 text-zinc-400 font-bold">{p.item}</td>
                          <td className="py-4">
                            <p className="font-bold text-zinc-700 leading-tight">{p.descripcion}</p>
                            <span className="text-[10px] text-blue-500 font-black uppercase tracking-tighter">
                              {p.tipo} {p.placa ? `| ${p.placa}` : ''}
                            </span>
                          </td>
                          <td className="py-4 text-right font-black text-zinc-800">
                            {p.medicion} <span className="text-[10px] text-zinc-400 uppercase ml-0.5">m²</span>
                          </td>
                          <td className="py-4 text-right font-black text-[#1e3d6b] text-lg">
                            {p.total_euros} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button className="w-full bg-[#1e3d6b] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#295693] transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3">
                  <FileText size={18} /> Descargar Presupuesto Oficial
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/20 bg-white/5 uppercase tracking-widest text-sm font-bold text-center px-6">
              <FileText size={60} className="mb-6 opacity-5 animate-pulse" />
              Esperando archivo técnico para procesar...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}