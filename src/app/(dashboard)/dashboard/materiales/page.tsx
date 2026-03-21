'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, Trash2, BrainCircuit, Loader2, ChevronRight, 
  Truck, Tag, Undo2, Plus, X, Percent, History, Edit2, Save, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { analizarTarifaPDF } from '@/lib/gemini';

export default function MaterialesPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [editandoMaterial, setEditandoMaterial] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Filtro por proveedor
  const [proveedorFiltro, setProveedorFiltro] = useState('todos');

  const [showHistory, setShowHistory] = useState(false);
  const [lotes, setLotes] = useState<any[]>([]);

  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Perfilería');
  const [porcentajeIncremento, setPorcentajeIncremento] = useState(20);
  const [etiquetasParaSubida, setEtiquetasParaSubida] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchMateriales();
    fetchProveedores();
    fetchLotes();
  }, []);

  const fetchProveedores = async () => {
    const { data } = await supabase.from('proveedores').select('*').order('nombre');
    setProveedores(data || []);
  };

  const fetchMateriales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('materiales')
      .select('*, proveedores(nombre)')
      .order('created_at', { ascending: false });
    if (!error) setMateriales(data || []);
    setLoading(false);
  };

  const fetchLotes = async () => {
    const { data } = await supabase
      .from('materiales')
      .select('lote_subida, created_at, proveedores(nombre)')
      .not('lote_subida', 'is', null);
    
    const grupos = data?.reduce((acc: any, curr: any) => {
      if (!acc[curr.lote_subida]) {
        acc[curr.lote_subida] = { id: curr.lote_subida, fecha: curr.created_at, proveedor: curr.proveedores?.nombre || 'Desconocido', cantidad: 0 };
      }
      acc[curr.lote_subida].cantidad++;
      return acc;
    }, {});
    setLotes(Object.values(grupos || {}).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProveedor) return toast.error("Selecciona un proveedor antes de analizar");

    setUploading(true);
    const toastId = toast.loading(`🤖 IA analizando y aplicando +${porcentajeIncremento}%...`);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const datosIA = await analizarTarifaPDF(base64, file.type);
          if (!datosIA || !Array.isArray(datosIA) || datosIA.length === 0) {
            toast.error("La IA no pudo extraer materiales del PDF", { id: toastId });
            setUploading(false);
            return;
          }
          const loteId = `LOTE-${Date.now()}`;
          const factor = 1 + (porcentajeIncremento / 100);
          const etiquetasManuales = etiquetasParaSubida.split(',').map((t: string) => t.trim().toLowerCase()).filter((t: string) => t !== "");

          const materialesParaInsertar = datosIA.map((item: any) => {
            const materialData: any = {
              nombre: item.nombre,
              precio_coste: item.precio_coste,
              precio_venta: parseFloat((item.precio_coste * factor).toFixed(2)),
              margen_beneficio: porcentajeIncremento,
              unidad: item.unidad,
              marca: item.marca,
              especificaciones: item.especificaciones,
              proveedor_id: selectedProveedor,
              categoria: selectedCategoria,
              lote_subida: loteId,
              etiquetas: [...(item.etiquetas_sugeridas || []), ...etiquetasManuales, selectedCategoria.toLowerCase()]
            };
            if (item.codigo && item.codigo.trim() !== '') materialData.codigo = item.codigo.trim();
            return materialData;
          });

          const { error: insertError } = await supabase.from('materiales').upsert(materialesParaInsertar, { onConflict: 'nombre,proveedor_id', ignoreDuplicates: false });
          if (insertError) throw new Error(insertError.message);
          toast.success(`✅ ${materialesParaInsertar.length} materiales importados correctamente`, { id: toastId });
          fetchMateriales();
          fetchLotes();
        } catch (innerError: any) {
          toast.error("Error al guardar: " + innerError.message, { id: toastId });
        } finally {
          setUploading(false);
          if (e.target) e.target.value = '';
        }
      };
      reader.onerror = () => {
        toast.error("Error al leer el archivo PDF", { id: toastId });
        setUploading(false);
        if (e.target) e.target.value = '';
      };
    } catch (error: any) {
      toast.error("Error: " + error.message, { id: toastId });
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const añadirEtiqueta = async () => {
    if (!nuevaEtiqueta.trim() || !selectedItem) return;
    const etiqueta = nuevaEtiqueta.trim().toLowerCase();
    const nuevasEtiquetas = [...(selectedItem.etiquetas || []), etiqueta];
    const { error } = await supabase.from('materiales').update({ etiquetas: nuevasEtiquetas }).eq('id', selectedItem.id);
    if (!error) {
      const updatedItem = { ...selectedItem, etiquetas: nuevasEtiquetas };
      setSelectedItem(updatedItem);
      setMateriales(materiales.map(m => m.id === selectedItem.id ? updatedItem : m));
      setNuevaEtiqueta('');
      toast.success("Etiqueta añadida");
    }
  };

  // GUARDAR EDICIÓN DE MATERIAL
  const guardarEdicion = async () => {
    const { error } = await supabase
      .from('materiales')
      .update({
        nombre: editForm.nombre,
        unidad: editForm.unidad,
        precio_coste: parseFloat(editForm.precio_coste),
        precio_venta: parseFloat(editForm.precio_venta),
        margen_beneficio: parseFloat(editForm.margen_beneficio),
      })
      .eq('id', selectedItem.id);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Material actualizado");
      setEditandoMaterial(false);
      const updated = { ...selectedItem, ...editForm };
      setSelectedItem(updated);
      setMateriales(materiales.map(m => m.id === selectedItem.id ? {...m, ...editForm} : m));
    }
  };

  const borrarLote = async (loteId: string) => {
    if (!confirm("¿Seguro que quieres borrar todos los materiales de esta subida?")) return;
    const { error } = await supabase.from('materiales').delete().eq('lote_subida', loteId);
    if (!error) { toast.success("Subida eliminada correctamente"); fetchMateriales(); fetchLotes(); }
    else toast.error("Error al borrar el lote");
  };

  // Proveedores únicos con materiales
  const proveedoresConMateriales = Array.from(
    new Set(materiales.map(m => m.proveedor_id))
  ).map(id => {
    const m = materiales.find(x => x.proveedor_id === id);
    return { id, nombre: m?.proveedores?.nombre || 'Sin proveedor' };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Filtrado combinado: texto + proveedor
  const materialesFiltrados = materiales.filter(m => {
    const s = filtro.toLowerCase();
    const matchTexto = m.nombre?.toLowerCase().includes(s) || 
           m.codigo?.toLowerCase().includes(s) ||
           m.proveedores?.nombre?.toLowerCase().includes(s) || 
           m.etiquetas?.some((t: any) => t.toLowerCase().includes(s));
    const matchProveedor = proveedorFiltro === 'todos' || m.proveedor_id === proveedorFiltro;
    return matchTexto && matchProveedor;
  });

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Odeplac <span className="text-emerald-400">Stock</span></h1>
          <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de Tarifas e Incrementos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white/10 p-3 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2 px-4 border-r border-white/10">
            <Truck size={16} className="text-blue-300" />
            <select value={selectedProveedor} onChange={e => setSelectedProveedor(e.target.value)} className="bg-transparent text-white text-[10px] font-black uppercase outline-none cursor-pointer">
              <option value="" className="text-zinc-900 font-bold uppercase">Proveedor...</option>
              {proveedores.map(p => <option key={p.id} value={p.id} className="text-zinc-900 font-bold uppercase">{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-4 border-r border-white/10">
            <Percent size={16} className="text-emerald-400" />
            <input type="number" value={porcentajeIncremento} onChange={e => setPorcentajeIncremento(Number(e.target.value))} className="bg-transparent text-white text-[11px] font-black w-8 outline-none" />
          </div>
          <div className="flex items-center gap-2 px-4 border-r border-white/10">
            <Tag size={16} className="text-amber-400" />
            <input type="text" placeholder="ETIQUETAS..." value={etiquetasParaSubida} onChange={e => setEtiquetasParaSubida(e.target.value)} className="bg-transparent text-white text-[9px] font-black w-32 outline-none placeholder:text-white/50 uppercase" />
          </div>
          <label className={`flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-2xl cursor-pointer transition-all shadow-lg ${uploading || !selectedProveedor ? 'opacity-40 cursor-not-allowed' : ''}`}>
            {uploading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
            <span className="text-[10px] font-black uppercase">Analizar PDF</span>
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={uploading || !selectedProveedor} />
          </label>
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-all">
            <History size={20} />
            <span className="text-[10px] font-black uppercase pr-2">Historial</span>
          </button>
          <button onClick={async () => {
            const { data: ultimo } = await supabase.from('materiales').select('lote_subida').order('created_at', { ascending: false }).limit(1).single();
            if (ultimo?.lote_subida && confirm("¿Borrar última subida?")) {
              await supabase.from('materiales').delete().eq('lote_subida', ultimo.lote_subida);
              fetchMateriales(); fetchLotes(); toast.success("Lote eliminado");
            }
          }} className="p-3 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all">
            <Undo2 size={20} />
          </button>
        </div>
      </header>

      {/* PANEL DE HISTORIAL */}
      {showHistory && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md bg-white h-full p-10 shadow-2xl animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-10 border-b pb-6">
              <h2 className="text-2xl font-black text-zinc-900 uppercase italic leading-none">Historial de Subidas</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X /></button>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
              {lotes.length === 0 && <p className="text-zinc-400 italic text-sm text-center py-10">No hay registros de subidas.</p>}
              {lotes.map((lote: any) => (
                <div key={lote.id} className="p-5 bg-zinc-50 rounded-[2rem] border border-zinc-100 flex justify-between items-center group hover:border-red-200 transition-all shadow-sm">
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase mb-1">{lote.proveedor}</p>
                    <p className="text-sm font-black text-zinc-800 uppercase italic leading-none">{new Date(lote.fecha).toLocaleDateString()} - {new Date(lote.fecha).toLocaleTimeString()}</p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">{lote.cantidad} productos</p>
                  </div>
                  <button onClick={() => borrarLote(lote.id)} className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE MATERIALES */}
      <div className="bg-white rounded-[3.5rem] p-8 shadow-2xl border border-zinc-100">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="BUSCAR MATERIAL, CÓDIGO O PROVEEDOR..."
              className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-[2rem] p-5 pl-14 text-sm font-bold uppercase outline-none focus:border-blue-500 text-zinc-900 placeholder:text-zinc-600 shadow-inner" />
          </div>

          {/* Filtro por proveedor */}
          <div className="relative">
            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <select
              value={proveedorFiltro}
              onChange={e => setProveedorFiltro(e.target.value)}
              className="bg-zinc-50 border-2 border-zinc-200 rounded-[2rem] p-5 pl-12 pr-10 text-sm font-black uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer text-zinc-800 min-w-[200px]"
            >
              <option value="todos">Todos los proveedores</option>
              {proveedoresConMateriales.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
          </div>
        </div>

        {/* Contador */}
        {(filtro || proveedorFiltro !== 'todos') && (
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">
            {materialesFiltrados.length} resultado{materialesFiltrados.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] font-black text-zinc-900 uppercase tracking-widest italic opacity-60">
                <th className="px-8 pb-2 text-left">Producto / Fabricante</th>
                <th className="px-6 pb-2 text-left">Código</th>
                <th className="px-4 pb-2 text-center">Unidad</th>
                <th className="px-6 pb-2 text-left">Proveedor</th>
                <th className="px-8 pb-2 text-right">Coste</th>
                <th className="px-8 pb-2 text-right text-[#295693]">P. Venta</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-zinc-300" size={40} /></td></tr>
              ) : materialesFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-zinc-300 font-black uppercase italic tracking-widest">
                  {filtro || proveedorFiltro !== 'todos' ? 'Sin resultados para los filtros actuales' : 'Sin materiales. Sube un PDF para empezar.'}
                </td></tr>
              ) : (
                materialesFiltrados.map(m => (
                  <tr key={m.id} onClick={() => { setSelectedItem(m); setEditForm({...m}); setEditandoMaterial(false); }} className="bg-zinc-50 hover:bg-white hover:shadow-2xl transition-all cursor-pointer group">
                    <td className="px-8 py-6 rounded-l-[2rem] border-y border-l border-zinc-100">
                      <p className="font-black text-zinc-950 text-sm uppercase leading-none tracking-tight">{m.nombre}</p>
                    </td>
                    <td className="px-6 py-6 border-y border-zinc-100 font-mono text-[10px] text-zinc-900 font-bold">{m.codigo || '---'}</td>
                    <td className="px-4 py-6 border-y border-zinc-100 text-center font-black text-zinc-950 text-[11px] uppercase italic">{m.unidad || 'ud.'}</td>
                    <td className="px-6 py-6 border-y border-zinc-100">
                      <div className="flex items-center gap-2">
                        <Truck size={12} className="text-blue-600" />
                        <span className="text-[10px] text-blue-700 font-black uppercase italic tracking-tighter">{m.proveedores?.nombre || 'Sin proveedor'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 border-y border-zinc-100 text-right text-zinc-950 font-black text-xs">{m.precio_coste}€</td>
                    <td className="px-8 py-6 rounded-r-[2rem] border-y border-r border-zinc-100 text-right">
                      <span className="text-xl font-black text-emerald-600 italic">
                        {(m.precio_coste * (1 + (m.margen_beneficio / 100))).toFixed(2)}€
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL LATERAL - DETALLE PRODUCTO */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-blue-950/70 backdrop-blur-md" onClick={() => setSelectedItem(null)} />
          <div className="relative w-full max-w-md bg-white h-full p-10 shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto border-l-[12px] border-blue-900">
            <button onClick={() => setSelectedItem(null)} className="mb-8 p-3 hover:bg-zinc-100 rounded-full transition-all text-zinc-600">
              <ChevronRight size={35} />
            </button>
            
            <div className="mb-8 border-b pb-6">
              <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase italic border border-blue-100">
                {selectedItem.proveedores?.nombre}
              </span>
              {editandoMaterial ? (
                <input
                  value={editForm.nombre}
                  onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                  className="text-2xl font-black text-zinc-900 uppercase italic leading-none tracking-tighter mt-4 w-full border-b-2 border-blue-500 outline-none bg-transparent"
                />
              ) : (
                <h2 className="text-3xl font-black text-zinc-900 uppercase italic leading-none tracking-tighter mt-4">
                  {selectedItem.nombre}
                </h2>
              )}
            </div>
            
            <div className="space-y-8">
              {/* BOTÓN EDITAR / GUARDAR */}
              <div className="flex gap-3">
                {editandoMaterial ? (
                  <>
                    <button onClick={guardarEdicion} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-600">
                      <Save size={16} /> Guardar
                    </button>
                    <button onClick={() => { setEditandoMaterial(false); setEditForm({...selectedItem}); }} className="px-4 py-3 border-2 border-zinc-200 rounded-2xl font-black text-xs uppercase text-zinc-500 hover:bg-zinc-50">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditandoMaterial(true)} className="flex-1 bg-blue-50 text-[#295693] py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-100">
                    <Edit2 size={16} /> Editar Material
                  </button>
                )}
              </div>

              {/* CAMPOS EDITABLES */}
              {editandoMaterial && (
                <div className="bg-zinc-50 p-6 rounded-[2.5rem] border border-zinc-200 shadow-inner space-y-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-4">Editar datos del material</p>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1">Unidad de medida</label>
                    <select
                      value={editForm.unidad}
                      onChange={e => setEditForm({...editForm, unidad: e.target.value})}
                      className="w-full bg-white border-2 border-zinc-200 rounded-xl p-3 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500"
                    >
                      <option value="m2">m² (metro cuadrado)</option>
                      <option value="ml">ml (metro lineal)</option>
                      <option value="ud">ud (unidad)</option>
                      <option value="kg">kg (kilogramo)</option>
                      <option value="saco">saco</option>
                      <option value="rollo">rollo</option>
                      <option value="bote">bote</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1">Precio Coste (€)</label>
                    <input
                      type="number" step="0.01"
                      value={editForm.precio_coste}
                      onChange={e => {
                        const coste = parseFloat(e.target.value);
                        const margen = parseFloat(editForm.margen_beneficio) || 0;
                        setEditForm({...editForm, precio_coste: coste, precio_venta: (coste * (1 + margen/100)).toFixed(2)});
                      }}
                      className="w-full bg-white border-2 border-zinc-200 rounded-xl p-3 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase ml-1">Margen (%)</label>
                    <input
                      type="number" step="1"
                      value={editForm.margen_beneficio}
                      onChange={e => {
                        const margen = parseFloat(e.target.value);
                        const coste = parseFloat(editForm.precio_coste) || 0;
                        setEditForm({...editForm, margen_beneficio: margen, precio_venta: (coste * (1 + margen/100)).toFixed(2)});
                      }}
                      className="w-full bg-white border-2 border-zinc-200 rounded-xl p-3 text-sm font-bold text-zinc-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Precio venta calculado</p>
                    <p className="text-2xl font-black text-emerald-700">{editForm.precio_venta} €</p>
                  </div>
                </div>
              )}

              {/* ETIQUETAS */}
              {!editandoMaterial && (
                <div className="bg-zinc-50 p-6 rounded-[2.5rem] border border-zinc-200 shadow-inner">
                  <p className="text-[10px] font-black text-zinc-900 uppercase mb-4 flex items-center gap-2 italic">
                    <Tag size={14} className="text-blue-500" /> Etiquetas
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedItem.etiquetas?.map((t: string) => (
                      <span key={t} className="bg-blue-900 text-white text-[9px] font-bold px-4 py-2 rounded-full uppercase flex items-center gap-2 shadow-lg">{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={nuevaEtiqueta} onChange={e => setNuevaEtiqueta(e.target.value)} onKeyDown={e => e.key === 'Enter' && añadirEtiqueta()}
                      placeholder="AÑADIR ETIQUETA..." className="flex-1 bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-900 text-zinc-950 placeholder:text-zinc-400" />
                    <button onClick={añadirEtiqueta} className="bg-blue-900 text-white p-3 rounded-xl shadow-lg hover:bg-blue-800"><Plus size={24} /></button>
                  </div>
                </div>
              )}

              {/* PRECIOS */}
              {!editandoMaterial && (
                <div className="p-8 bg-zinc-950 rounded-[3rem] text-white shadow-2xl ring-1 ring-white/10">
                  <p className="text-[10px] font-black text-emerald-400 uppercase mb-6 tracking-widest italic border-b border-white/10 pb-2">Desglose Comercial</p>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center opacity-80">
                      <span className="text-[10px] font-bold uppercase italic">Precio Coste</span>
                      <span className="text-sm font-black text-white">{selectedItem.precio_coste}€ / {selectedItem.unidad || 'ud.'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase italic opacity-80">Incremento</span>
                      <span className="text-sm font-black text-emerald-400">+{selectedItem.margen_beneficio || porcentajeIncremento}%</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-[11px] font-black uppercase italic text-emerald-300">Precio Final Venta</span>
                      <span className="text-3xl font-black text-white">
                        {(selectedItem.precio_coste * (1 + ((selectedItem.margen_beneficio || porcentajeIncremento) / 100))).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={async () => {
                  if (confirm("¿Eliminar este material?")) {
                    await supabase.from('materiales').delete().eq('id', selectedItem.id);
                    setSelectedItem(null);
                    fetchMateriales();
                    toast.success("Material eliminado");
                  }
                }}
                className="w-full py-5 border-2 border-red-50 text-red-500 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-50 transition-all"
              >
                Eliminar del sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}