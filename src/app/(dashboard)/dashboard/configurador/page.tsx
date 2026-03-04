'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, Plus, Trash2, Save, Brain, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguradorSistemas() {
  const supabase = createClient();
  const [materiales, setMateriales] = useState<any[]>([]);
  const [sistemas, setSistemas] = useState<any[]>([]);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [palabrasClave, setPalabrasClave] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const { data: mat } = await supabase.from('materiales').select('*').order('nombre');
    // Traemos los sistemas y sus materiales vinculados
    const { data: sis, error } = await supabase
      .from('sistemas_maestros')
      .select(`
        *,
        sistema_composicion (
          id,
          material_id,
          cantidad_por_m2,
          materiales (nombre, precio_venta)
        )
      `);
    
    if (error) console.error("Error fetching:", error);
    setMateriales(mat || []);
    setSistemas(sis || []);
  };

  useEffect(() => { fetchData(); }, []);

  const crearSistema = async () => {
    if(!nombreNuevo) return;
    const { error } = await supabase.from('sistemas_maestros').insert([
      { nombre: nombreNuevo, palabras_clave: palabrasClave.split(',').map(s => s.trim()) }
    ]);
    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Sistema creado");
      setNombreNuevo(""); setPalabrasClave(""); fetchData();
    }
  };

  const añadirMaterialASistema = async (sistemaId: string, materialId: string) => {
    // Buscamos el material para tener su nombre en el log
    const mat = materiales.find(m => m.id === materialId);
    
    const { error } = await supabase.from('sistema_composicion').insert([
      { 
        sistema_maestro_id: sistemaId, 
        material_id: materialId, 
        cantidad_por_m2: 1,
        // Añadimos estos campos vacíos por si la DB aún los pide
        nombre_sistema: '', 
        placa_tipo: '' 
      }
    ]);

    if (error) {
      console.error("Detalle del error:", error);
      toast.error("No se pudo añadir: " + error.message);
    } else {
      toast.success(`${mat.nombre} añadido a la receta`);
      fetchData();
    }
  };

  const actualizarRatio = async (id: string, ratio: number) => {
    const { error } = await supabase.from('sistema_composicion').update({ cantidad_por_m2: ratio }).eq('id', id);
    if (error) toast.error("Error al actualizar ratio");
    else toast.success("Cantidad actualizada");
  };

  const eliminarMaterial = async (id: string) => {
    const { error } = await supabase.from('sistema_composicion').delete().eq('id', id);
    if (!error) { toast.success("Material quitado"); fetchData(); }
  };

  return (
    <div className="p-10 text-white max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
          <Brain size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Manual de Inteligencia</h1>
          <p className="text-blue-100/60">Configura qué materiales incluye cada sistema constructivo.</p>
        </div>
      </div>

      {/* Formulario de Creación */}
      <div className="bg-white/5 border border-white/10 p-8 rounded-3xl mb-12 backdrop-blur-sm">
        <h2 className="text-sm font-black mb-6 flex items-center gap-2 text-blue-400 uppercase tracking-widest"><Plus size={16}/> Definir Nuevo Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Nombre del Sistema</label>
            <input 
              placeholder="Ej: Tabique Estándar 15mm" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 text-white transition-all"
              value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Palabras Clave (IA)</label>
            <input 
              placeholder="Ej: tabique, habitaciones, pladur" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 text-white transition-all"
              value={palabrasClave} onChange={e => setPalabrasClave(e.target.value)}
            />
          </div>
        </div>
        <button onClick={crearSistema} className="mt-6 bg-blue-500 hover:bg-blue-600 px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20">
          Crear Sistema Maestro
        </button>
      </div>

      {/* Listado de Sistemas Maestros */}
      <div className="space-y-4">
        {sistemas.map(s => (
          <div key={s.id} className="bg-white rounded-[2rem] overflow-hidden shadow-2xl transition-all border border-zinc-100">
            <div 
              className={`p-6 cursor-pointer flex justify-between items-center transition-colors ${expandido === s.id ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
              onClick={() => setExpandido(expandido === s.id ? null : s.id)}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1e3d6b] text-white rounded-2xl"><Settings size={20}/></div>
                <div>
                  <h3 className="text-xl font-black uppercase text-[#1e3d6b] tracking-tighter">{s.nombre}</h3>
                  <div className="flex gap-2 mt-1">
                    {s.palabras_clave?.map((pc: string) => (
                      <span key={pc} className="text-[9px] bg-white border border-blue-100 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">{pc}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-zinc-400">{expandido === s.id ? <ChevronUp /> : <ChevronDown />}</div>
            </div>
            
            {expandido === s.id && (
              <div className="p-8 border-t bg-zinc-50/50 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Composición y Ratios</h4>
                  <div className="grid gap-3">
                    {s.sistema_composicion?.map((comp: any) => (
                      <div key={comp.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 group">
                        <div className="flex-1">
                          <p className="font-bold text-zinc-800 text-sm">{comp.materiales?.nombre}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">{comp.materiales?.precio_venta} €/unidad</p>
                        </div>
                        <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-xl border">
                          <input 
                            type="number" 
                            step="0.01"
                            defaultValue={comp.cantidad_por_m2}
                            onBlur={(e) => actualizarRatio(comp.id, parseFloat(e.target.value))}
                            className="w-16 bg-transparent text-center font-black text-blue-600 outline-none"
                          />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Cant / m²</span>
                        </div>
                        <button onClick={() => eliminarMaterial(comp.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200/50">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Añadir material a la receta:</label>
                  <select 
                    className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl outline-none focus:border-blue-500 text-zinc-600 font-bold transition-all appearance-none cursor-pointer"
                    onChange={(e) => añadirMaterialASistema(s.id, e.target.value)}
                    value=""
                  >
                    <option value="" disabled>Buscar en el catálogo de materiales...</option>
                    {materiales.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre} — ({m.precio_venta}€)</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}