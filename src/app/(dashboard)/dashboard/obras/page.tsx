'use client'

import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, User, Loader2, Clock, AlertTriangle, MessageSquare,
  Truck, Flag, ChevronDown, Trash2, FileText, Package, Ruler,
  Clock3, BarChart3, Link2, Copy, TrendingUp, TrendingDown,
  Calendar, Save, PlusCircle, Construction, Upload, CheckCircle2,
  Receipt, Euro
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const COLUMNAS = [
  { id: 'lead',        title: 'LEADS' },
  { id: 'presupuesto', title: 'PRESUPUESTOS' },
  { id: 'curso',       title: 'EN CURSO' },
  { id: 'terminado',   title: 'TERMINADOS' }
];

const ICONOS_TIPO: Record<string, any> = {
  comentario: <MessageSquare size={10} />,
  logistica:  <Truck size={10} />,
  retraso:    <AlertTriangle size={10} />,
  hito:       <Flag size={10} />
};

const TABS = [
  { id: 'bitacora',    label: 'Bitácora',    Icon: MessageSquare },
  { id: 'presupuesto', label: 'Presupuesto', Icon: FileText },
  { id: 'gastos',      label: 'Gastos',      Icon: Package },
  { id: 'mediciones',  label: 'Mediciones',  Icon: Ruler },
  { id: 'horas',       label: 'Horas',       Icon: Clock3 },
  { id: 'analisis',    label: 'Análisis',    Icon: BarChart3 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function PipelinePage() {
  const supabase = createClient();

  // ── Main ──────────────────────────────────────────────────────────────────
  const [obras, setObras]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Nueva obra ────────────────────────────────────────────────────────────
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isCreating, setIsCreating]             = useState(false);
  const [nuevaObra, setNuevaObra]               = useState({ titulo: '', cliente_id: '' });

  // ── Detalle de obra ───────────────────────────────────────────────────────
  const [selectedObra, setSelectedObra] = useState<any>(null);
  const [activeTab, setActiveTab]       = useState('bitacora');

  // ── Bitácora ──────────────────────────────────────────────────────────────
  const [seguimientos, setSeguimientos]       = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje]       = useState('');
  const [tipoSeguimiento, setTipoSeguimiento] = useState('comentario');
  const [isSavingNote, setIsSavingNote]       = useState(false);

  // ── Presupuesto ───────────────────────────────────────────────────────────
  const [presupuestos, setPresupuestos]                     = useState<any[]>([]);
  const [presupuestoVinculado, setPresupuestoVinculado]     = useState<any>(null);
  const [presupuestoSelId, setPresupuestoSelId]             = useState('');
  const [isLinking, setIsLinking]                           = useState(false);
  const [isDuplicating, setIsDuplicating]                   = useState(false);

  // ── Gastos ────────────────────────────────────────────────────────────────
  const [gastos, setGastos]                   = useState<any[]>([]);
  const [facturaPreview, setFacturaPreview]   = useState<any>(null);
  const [obraSeleccionada, setObraSeleccionada] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing]         = useState(false);
  const [isSavingGasto, setIsSavingGasto]     = useState(false);
  const facturaInputRef                       = useRef<HTMLInputElement>(null);

  // Cola de facturas (modo masivo)
  type ColaGastoItem = { id: string; file: File; estado: 'pendiente'|'procesando'|'ok'|'error'; proveedor?: string; total?: number; error?: string };
  const [colaGastos, setColaGastos]           = useState<ColaGastoItem[]>([]);
  const procesandoColaRef                     = useRef(false);

  // ── Mediciones ────────────────────────────────────────────────────────────
  const [mediciones, setMediciones]           = useState<any[]>([]);
  const [nuevaMedicion, setNuevaMedicion]     = useState({ descripcion: '', ml: 0, alto: 0 });
  const [isSavingMedicion, setIsSavingMedicion] = useState(false);

  // ── Horas ─────────────────────────────────────────────────────────────────
  const [horas, setHoras]         = useState<any[]>([]);
  const [nuevaFila, setNuevaFila] = useState({
    fecha: new Date().toISOString().split('T')[0],
    trabajador: '',
    horas: 8,
  });
  const [isSavingHora, setIsSavingHora] = useState(false);

  // ── Análisis ──────────────────────────────────────────────────────────────
  const [fechaInicio, setFechaInicio]         = useState('');
  const [fechaFin, setFechaFin]               = useState('');
  const [isSavingFechas, setIsSavingFechas]   = useState(false);

  // ── Fetch principal ───────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: dataObras }, { data: dataClientes }] = await Promise.all([
        supabase.from('obras').select('*, clientes(nombre)').order('updated_at', { ascending: false }),
        supabase.from('clientes').select('id, nombre').order('nombre'),
      ]);
      setObras(dataObras || []);
      setClientes(dataClientes || []);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Abrir obra ────────────────────────────────────────────────────────────
  const abrirObra = async (obra: any) => {
    setSelectedObra(obra);
    setActiveTab('bitacora');
    setFechaInicio(obra.fecha_inicio || '');
    setFechaFin(obra.fecha_fin || '');
    setPresupuestoVinculado(null);
    setFacturaPreview(null);

    await Promise.all([
      loadSeguimientos(obra.id),
      loadHoras(obra.id),
      loadGastos(obra.id),
      loadMediciones(obra.id),
      loadPresupuestosLista(),
      obra.presupuesto_vinculado_id
        ? loadPresupuestoVinculado(obra.presupuesto_vinculado_id)
        : Promise.resolve(),
    ]);
  };

  const loadSeguimientos = async (obraId: string) => {
    const { data } = await supabase
      .from('obra_seguimiento').select('*').eq('obra_id', obraId)
      .order('created_at', { ascending: false });
    setSeguimientos(data || []);
  };

  const loadPresupuestosLista = async () => {
    const { data } = await supabase
      .from('presupuestos_generados')
      .select('id, obra_nombre, cliente_nombre, total_materiales, numero_presupuesto, partidas_json, created_at')
      .order('created_at', { ascending: false });
    setPresupuestos(data || []);
  };

  const loadPresupuestoVinculado = async (id: string) => {
    const { data } = await supabase
      .from('presupuestos_generados').select('*').eq('id', id).single();
    setPresupuestoVinculado(data);
  };

  const loadHoras = async (obraId: string) => {
    const { data, error } = await supabase
      .from('obra_horas').select('*').eq('obra_id', obraId)
      .order('fecha', { ascending: false });
    if (!error) setHoras(data || []);
  };

  const loadGastos = async (obraId: string) => {
    const { data, error } = await supabase
      .from('obra_gastos_material').select('*').eq('obra_id', obraId)
      .order('fecha', { ascending: false });
    if (!error) setGastos(data || []);
  };

  const loadMediciones = async (obraId: string) => {
    const { data, error } = await supabase
      .from('obra_mediciones').select('*').eq('obra_id', obraId)
      .order('created_at', { ascending: true });
    if (!error) setMediciones(data || []);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCrearObra = async () => {
    if (!nuevaObra.titulo || !nuevaObra.cliente_id) {
      toast.error('Nombre de obra y cliente son obligatorios');
      return;
    }
    setIsCreating(true);
    try {
      const { error } = await supabase.from('obras').insert([{ ...nuevaObra, estado: 'lead' }]);
      if (error) throw error;
      toast.success('¡Obra creada!');
      setIsCrearModalOpen(false);
      setNuevaObra({ titulo: '', cliente_id: '' });
      fetchData();
    } catch {
      toast.error('Error al crear obra');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEliminarObra = async (id: string) => {
    try {
      await supabase.from('obra_seguimiento').delete().eq('obra_id', id);
      await supabase.from('obra_horas').delete().eq('obra_id', id);
      await supabase.from('obra_gastos_material').delete().eq('obra_id', id);
      await supabase.from('obra_mediciones').delete().eq('obra_id', id);
      const { error } = await supabase.from('obras').delete().eq('id', id);
      if (error) throw error;
      toast.success('Obra eliminada');
      setConfirmDeleteId(null);
      setSelectedObra(null);
      fetchData();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
  };

  const moverObra = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('obras').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error al mover'); return; }
    setObras(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o));
  };

  const guardarSeguimiento = async () => {
    if (!nuevoMensaje.trim()) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from('obra_seguimiento').insert([{
        obra_id: selectedObra.id, mensaje: nuevoMensaje,
        tipo: tipoSeguimiento, es_publico: true,
      }]);
      if (error) throw error;
      toast.success('Nota registrada');
      setNuevoMensaje('');
      loadSeguimientos(selectedObra.id);
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const vincularPresupuesto = async () => {
    if (!presupuestoSelId) return;
    setIsLinking(true);
    try {
      const psel = presupuestos.find(p => p.id === presupuestoSelId);
      const { error } = await supabase.from('obras').update({
        presupuesto_vinculado_id: presupuestoSelId,
        total_presupuesto: psel?.total_materiales || 0,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedObra.id);
      if (error) throw error;
      toast.success('Presupuesto vinculado');
      const updated = { ...selectedObra, presupuesto_vinculado_id: presupuestoSelId, total_presupuesto: psel?.total_materiales || 0 };
      setSelectedObra(updated);
      setObras(prev => prev.map(o => o.id === selectedObra.id ? updated : o));
      loadPresupuestoVinculado(presupuestoSelId);
    } catch {
      toast.error('Error al vincular');
    } finally {
      setIsLinking(false);
    }
  };

  const duplicarPresupuesto = async () => {
    if (!presupuestoVinculado) return;
    setIsDuplicating(true);
    try {
      const copia = {
        partidas: presupuestoVinculado.partidas_json || [],
        total: presupuestoVinculado.total_materiales || 0,
        fecha_duplicado: new Date().toISOString(),
        notas: '',
      };
      const { error } = await supabase.from('obras').update({
        presupuesto_modificado: copia,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedObra.id);
      if (error) throw error;
      toast.success('Copia creada. Aquí podrás modificarla sin perder el original.');
      setSelectedObra({ ...selectedObra, presupuesto_modificado: copia });
    } catch {
      toast.error('Error al duplicar');
    } finally {
      setIsDuplicating(false);
    }
  };

  // ── Gastos handlers ───────────────────────────────────────────────────────
  const handleSeleccionarFactura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (facturaInputRef.current) facturaInputRef.current.value = '';

    // Modo individual: 1 archivo → preview como antes
    if (files.length === 1) {
      const file = files[0];
      if (file.type !== 'application/pdf') { toast.error('Solo se aceptan PDFs'); return; }
      setIsAnalyzing(true);
      setFacturaPreview(null);
      setObraSeleccionada(null);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/gemini/analizar-factura', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al analizar');
        setFacturaPreview(json.factura);
        if (json.factura.obras_detectadas?.length === 1) setObraSeleccionada(json.factura.obras_detectadas[0]);
        const nObras = json.factura.obras_detectadas?.length || 0;
        if (nObras > 1) {
          toast.success(`Factura analizada. Se detectaron ${nObras} obras — selecciona cuál corresponde a esta.`);
        } else {
          toast.success('Factura analizada. Revisa y confirma.');
        }
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // Modo cola: varios archivos → guardar automáticamente uno a uno
    const validos = files.filter(f => f.type === 'application/pdf');
    if (!validos.length) { toast.error('Solo se aceptan PDFs'); return; }
    if (validos.length < files.length) toast.warning(`${files.length - validos.length} archivo(s) ignorados (solo PDF)`);

    const nuevos: ColaGastoItem[] = validos.map(f => ({ id: crypto.randomUUID(), file: f, estado: 'pendiente' as const }));
    setColaGastos(prev => {
      const actualizados = [...prev, ...nuevos];
      if (!procesandoColaRef.current) ejecutarColaGastos(nuevos);
      return actualizados;
    });
  };

  const ejecutarColaGastos = async (items: ColaGastoItem[]) => {
    if (!selectedObra) return;
    procesandoColaRef.current = true;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setColaGastos(prev => prev.map(x => x.id === item.id ? { ...x, estado: 'procesando' } : x));
      try {
        const fd = new FormData();
        fd.append('file', item.file);
        const res = await fetch('/api/gemini/analizar-factura', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al analizar');
        const f = json.factura;
        const obraAuto = f.obras_detectadas?.[0];
        const total = obraAuto ? obraAuto.subtotal : f.total;
        const { error } = await supabase.from('obra_gastos_material').insert([{
          obra_id: selectedObra.id,
          proveedor: f.proveedor,
          numero_factura: f.numero_factura,
          fecha: f.fecha,
          concepto: obraAuto?.nombre_obra || f.referencia_obra || 'Material de obra',
          base_imponible: total / 1.21,
          iva_porcentaje: f.iva_porcentaje,
          iva_total: total - total / 1.21,
          total,
          lineas_json: f.lineas_factura,
        }]);
        if (error) throw error;
        setColaGastos(prev => prev.map(x => x.id === item.id ? { ...x, estado: 'ok', proveedor: f.proveedor, total } : x));
      } catch (err: any) {
        setColaGastos(prev => prev.map(x => x.id === item.id ? { ...x, estado: 'error', error: err.message } : x));
      }
      if (i < items.length - 1) await new Promise(r => setTimeout(r, 7000));
    }
    procesandoColaRef.current = false;
    loadGastos(selectedObra.id);
  };

  const handleGuardarGasto = async () => {
    if (!facturaPreview) return;
    setIsSavingGasto(true);
    try {
      const multiObra = (facturaPreview.obras_detectadas?.length || 0) > 1;
      const totalAGuardar = multiObra && obraSeleccionada
        ? obraSeleccionada.subtotal
        : facturaPreview.total;
      const { error } = await supabase.from('obra_gastos_material').insert([{
        obra_id: selectedObra.id,
        proveedor: facturaPreview.proveedor,
        numero_factura: facturaPreview.numero_factura,
        fecha: facturaPreview.fecha,
        concepto: obraSeleccionada?.nombre_obra || facturaPreview.referencia_obra || 'Material de obra',
        base_imponible: multiObra ? (totalAGuardar / 1.21) : facturaPreview.base_imponible,
        iva_porcentaje: facturaPreview.iva_porcentaje,
        iva_total: multiObra ? (totalAGuardar - totalAGuardar / 1.21) : facturaPreview.iva_total,
        total: totalAGuardar,
        lineas_json: facturaPreview.lineas_factura,
      }]);
      if (error) throw error;
      toast.success('Gasto guardado');
      setFacturaPreview(null);
      setObraSeleccionada(null);
      loadGastos(selectedObra.id);
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsSavingGasto(false);
    }
  };

  // ── Mediciones handlers ───────────────────────────────────────────────────
  const agregarMedicion = async () => {
    if (!nuevaMedicion.descripcion.trim()) { toast.error('Introduce una descripción'); return; }
    setIsSavingMedicion(true);
    try {
      const { error } = await supabase.from('obra_mediciones').insert([{
        obra_id: selectedObra.id,
        descripcion: nuevaMedicion.descripcion,
        ml: nuevaMedicion.ml,
        alto: nuevaMedicion.alto,
      }]);
      if (error) throw error;
      setNuevaMedicion({ descripcion: '', ml: 0, alto: 0 });
      loadMediciones(selectedObra.id);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setIsSavingMedicion(false);
    }
  };

  const eliminarMedicion = async (id: string) => {
    const { error } = await supabase.from('obra_mediciones').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    setMediciones(prev => prev.filter(m => m.id !== id));
  };

  const eliminarGasto = async (id: string) => {
    const { error } = await supabase.from('obra_gastos_material').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    setGastos(prev => prev.filter(g => g.id !== id));
    toast.success('Gasto eliminado');
  };

  // ── Horas handlers ────────────────────────────────────────────────────────
  const agregarHora = async () => {
    if (!nuevaFila.trabajador.trim()) { toast.error('Introduce el nombre del trabajador'); return; }
    setIsSavingHora(true);
    try {
      const { error } = await supabase.from('obra_horas').insert([{
        obra_id: selectedObra.id,
        fecha: nuevaFila.fecha,
        trabajador: nuevaFila.trabajador,
        horas: nuevaFila.horas,
      }]);
      if (error) throw error;
      setNuevaFila({ fecha: new Date().toISOString().split('T')[0], trabajador: '', horas: 8 });
      loadHoras(selectedObra.id);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setIsSavingHora(false);
    }
  };

  const eliminarHora = async (id: string) => {
    const { error } = await supabase.from('obra_horas').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    setHoras(prev => prev.filter(h => h.id !== id));
  };

  const guardarFechas = async () => {
    setIsSavingFechas(true);
    try {
      const { error } = await supabase.from('obras').update({
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedObra.id);
      if (error) throw error;
      toast.success('Fechas guardadas');
      setSelectedObra({ ...selectedObra, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
    } catch {
      toast.error('Error al guardar fechas');
    } finally {
      setIsSavingFechas(false);
    }
  };

  // ── Cálculos análisis ─────────────────────────────────────────────────────
  const totalHoras       = horas.reduce((s, h) => s + parseFloat(h.horas || 0), 0);
  const totalJornadas    = totalHoras / 8;
  const costeMO          = totalJornadas * 150;
  const totalGastos      = gastos.reduce((s, g) => s + parseFloat(g.total || 0), 0);
  const presupuestoTotal = selectedObra?.total_presupuesto || 0;
  const beneficio        = presupuestoTotal - costeMO - totalGastos;
  const margen           = presupuestoTotal > 0 ? (beneficio / presupuestoTotal) * 100 : 0;

  // ── Tab contents ──────────────────────────────────────────────────────────
  const TabBitacora = () => (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-2/5 p-8 border-r border-zinc-200 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-3 text-[#295693]">
          <MessageSquare size={18} />
          <h3 className="font-black uppercase text-[11px] tracking-[0.2em] italic">Nuevo Registro</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['comentario', 'logistica', 'retraso', 'hito'].map(t => (
            <button key={t} onClick={() => setTipoSeguimiento(t)}
              className={`px-4 py-2.5 rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all ${
                tipoSeguimiento === t
                  ? (t === 'retraso' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white')
                  : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-400'
              }`}
            >{t}</button>
          ))}
        </div>
        <textarea
          value={nuevoMensaje} onChange={e => setNuevoMensaje(e.target.value)}
          placeholder="Actualización diaria..."
          className="w-full h-44 bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 outline-none focus:border-blue-500 resize-none"
        />
        <button onClick={guardarSeguimiento} disabled={isSavingNote || !nuevoMensaje}
          className="w-full bg-[#295693] text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest disabled:opacity-50 flex justify-center"
        >
          {isSavingNote ? <Loader2 className="animate-spin" /> : 'Publicar en Bitácora'}
        </button>
      </div>
      <div className="w-full md:w-3/5 p-8 bg-white overflow-y-auto space-y-6">
        <div className="flex items-center gap-3 text-zinc-400 mb-2">
          <Clock size={18} /><h3 className="font-black uppercase text-[11px] tracking-[0.2em] italic">Bitácora</h3>
        </div>
        {seguimientos.length === 0 ? (
          <div className="text-center py-20 border-4 border-dashed border-zinc-100 rounded-[3rem]">
            <p className="text-zinc-300 italic font-black uppercase text-xs tracking-[0.4em]">Sin registros</p>
          </div>
        ) : seguimientos.map(s => (
          <div key={s.id} className="relative pl-10 border-l-4 border-zinc-100 pb-4">
            <div className={`absolute -left-[14px] top-0 p-2 rounded-2xl shadow ${s.tipo === 'retraso' ? 'bg-red-500 text-white' : 'bg-[#295693] text-white'}`}>
              {ICONOS_TIPO[s.tipo] || <Clock size={10} />}
            </div>
            <div className="bg-zinc-50 p-5 rounded-[2rem] border border-zinc-100">
              <p className="text-sm text-zinc-800 font-bold leading-relaxed">{s.mensaje}</p>
              <div className="flex justify-between mt-4 pt-3 border-t border-zinc-200/50">
                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${s.tipo === 'retraso' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#295693]'}`}>{s.tipo}</span>
                <span className="text-[9px] font-black text-zinc-400 uppercase">
                  {new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TabPresupuesto = () => {
    const partidas: any[] = presupuestoVinculado?.partidas_json || [];
    return (
      <div className="p-8 space-y-8 overflow-y-auto">
        {!selectedObra?.presupuesto_vinculado_id ? (
          <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-8 space-y-5">
            <div className="flex items-center gap-3 text-[#295693]">
              <Link2 size={20} />
              <h3 className="font-black uppercase text-[11px] tracking-[0.2em]">Vincular presupuesto del CRM</h3>
            </div>
            <div className="relative">
              <select value={presupuestoSelId} onChange={e => setPresupuestoSelId(e.target.value)}
                className="w-full bg-white border-2 border-blue-200 rounded-[1.5rem] p-4 font-bold text-zinc-800 outline-none appearance-none cursor-pointer"
              >
                <option value="">Selecciona un presupuesto...</option>
                {presupuestos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.numero_presupuesto ? `#${p.numero_presupuesto} — ` : ''}{p.obra_nombre || 'Sin nombre'} — {fmt(p.total_materiales || 0)}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400" />
            </div>
            <button onClick={vincularPresupuesto} disabled={!presupuestoSelId || isLinking}
              className="bg-[#295693] text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
            >
              {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
              Vincular presupuesto
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border-2 border-green-100 rounded-[2rem] p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-2xl"><FileText size={20} className="text-green-600" /></div>
                <div>
                  <p className="font-black text-zinc-800 text-sm">{presupuestoVinculado?.obra_nombre || 'Presupuesto vinculado'}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {presupuestoVinculado?.cliente_nombre} · {fmt(presupuestoVinculado?.total_materiales || 0)}
                    {presupuestoVinculado?.numero_presupuesto && ` · #${presupuestoVinculado.numero_presupuesto}`}
                  </p>
                </div>
              </div>
              {!selectedObra?.presupuesto_modificado && (
                <button onClick={duplicarPresupuesto} disabled={isDuplicating || !presupuestoVinculado}
                  className="flex items-center gap-2 bg-white border-2 border-zinc-200 text-zinc-700 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-400 transition-all disabled:opacity-50"
                >
                  {isDuplicating ? <Loader2 className="animate-spin" size={14} /> : <Copy size={14} />}
                  Duplicar para modificar
                </button>
              )}
            </div>
            {selectedObra?.presupuesto_modificado && (
              <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                <Copy size={16} className="text-amber-500 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700">
                  Tienes una copia modificable activa. El original se conserva intacto.
                  Copiado el {new Date(selectedObra.presupuesto_modificado.fecha_duplicado).toLocaleDateString('es-ES')}.
                </p>
              </div>
            )}
            {partidas.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  {partidas.length} partidas · presupuesto original
                </h4>
                <div className="rounded-[2rem] overflow-hidden border border-zinc-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Descripción</th>
                        <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Ud</th>
                        <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Medición</th>
                        <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partidas.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                          <td className="p-4 font-medium text-zinc-800 max-w-xs">
                            {p.capitulo && <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded mr-2 uppercase">{p.capitulo}</span>}
                            {p.descripcion}
                          </td>
                          <td className="p-4 text-right text-zinc-500 text-xs">{p.unidad}</td>
                          <td className="p-4 text-right text-zinc-500 text-xs">{p.medicion}</td>
                          <td className="p-4 text-right font-black text-[#295693]">{fmt(p.total_euros || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#295693]">
                        <td colSpan={3} className="p-4 font-black text-[11px] uppercase tracking-widest text-white">Total presupuesto</td>
                        <td className="p-4 text-right font-black text-white text-lg">{fmt(presupuestoVinculado?.total_materiales || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const TabGastos = () => {
    const totalGastoTab = gastos.reduce((s, g) => s + parseFloat(g.total || 0), 0);
    return (
      <div className="p-8 space-y-8 overflow-y-auto">
        {/* Upload */}
        <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-8 space-y-5">
          <div className="flex items-center gap-3 text-[#295693]">
            <Receipt size={20} />
            <h3 className="font-black uppercase text-[11px] tracking-[0.2em]">Añadir factura de material</h3>
          </div>
          <p className="text-[11px] text-zinc-500 font-bold">
            Sube un PDF de factura de proveedor. Gemini extraerá automáticamente el proveedor, importe y líneas de material.
          </p>
          <input
            ref={facturaInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleSeleccionarFactura}
          />
          <button
            onClick={() => facturaInputRef.current?.click()}
            disabled={isAnalyzing || procesandoColaRef.current}
            className="flex items-center gap-3 bg-[#295693] text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-blue-700 transition-all"
          >
            {isAnalyzing || procesandoColaRef.current ? (
              <><Loader2 className="animate-spin" size={16} /> Procesando...</>
            ) : (
              <><Upload size={16} /> Subir facturas PDF</>
            )}
          </button>
          <p className="text-[9px] text-zinc-400 font-bold">Puedes seleccionar varias a la vez</p>
        </div>

        {/* Cola de subida masiva */}
        {colaGastos.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase text-[#295693] tracking-widest">
                Cola · {colaGastos.filter(x => x.estado === 'ok').length}/{colaGastos.length}
              </p>
              {!procesandoColaRef.current && (
                <button onClick={() => setColaGastos([])} className="text-[9px] font-black uppercase text-zinc-300 hover:text-red-400 transition-all">Limpiar</button>
              )}
            </div>
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#295693] transition-all duration-500"
                style={{ width: `${colaGastos.length ? (colaGastos.filter(x => x.estado === 'ok' || x.estado === 'error').length / colaGastos.length * 100) : 0}%` }} />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {colaGastos.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-[10px]">
                  <span className="shrink-0">
                    {item.estado === 'ok' && <CheckCircle2 size={13} className="text-green-500" />}
                    {item.estado === 'error' && <AlertTriangle size={13} className="text-red-400" />}
                    {item.estado === 'procesando' && <Loader2 size={13} className="animate-spin text-[#295693]" />}
                    {item.estado === 'pendiente' && <Clock size={13} className="text-zinc-300" />}
                  </span>
                  <span className="truncate font-bold text-zinc-600">
                    {item.estado === 'ok' ? `${item.proveedor} · ${fmt(item.total || 0)}` :
                     item.estado === 'error' ? item.error :
                     item.file.name}
                  </span>
                </div>
              ))}
            </div>
            {!procesandoColaRef.current && colaGastos.every(x => x.estado === 'ok' || x.estado === 'error') && (
              <p className="text-[10px] font-black uppercase text-zinc-400">
                {colaGastos.filter(x => x.estado === 'ok').length} guardadas
                {colaGastos.filter(x => x.estado === 'error').length > 0 && ` · ${colaGastos.filter(x => x.estado === 'error').length} errores`}
              </p>
            )}
          </div>
        )}

        {/* Preview factura */}
        {facturaPreview && (
          <div className="bg-white border-2 border-amber-200 rounded-[2rem] p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-3 rounded-2xl"><Receipt size={20} className="text-amber-600" /></div>
                <div>
                  <p className="font-black text-zinc-900 text-base">{facturaPreview.proveedor}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">
                    Factura {facturaPreview.numero_factura} · {facturaPreview.fecha}
                    {facturaPreview.referencia_obra && ` · ${facturaPreview.referencia_obra}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setFacturaPreview(null)}
                className="p-2 text-zinc-300 hover:text-zinc-600 rounded-xl transition-all"
              ><X size={18} /></button>
            </div>

            {/* Líneas */}
            {facturaPreview.lineas_factura?.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-zinc-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="text-left p-3 font-black uppercase text-zinc-400 tracking-wider">Descripción</th>
                      <th className="text-right p-3 font-black uppercase text-zinc-400 tracking-wider">Ud</th>
                      <th className="text-right p-3 font-black uppercase text-zinc-400 tracking-wider">Cant.</th>
                      <th className="text-right p-3 font-black uppercase text-zinc-400 tracking-wider">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturaPreview.lineas_factura.slice(0, 6).map((l: any, i: number) => (
                      <tr key={i} className="border-t border-zinc-50">
                        <td className="p-3 text-zinc-700 font-medium max-w-[260px] truncate">{l.descripcion}</td>
                        <td className="p-3 text-right text-zinc-400">{l.unidad}</td>
                        <td className="p-3 text-right text-zinc-500">{l.cantidad}</td>
                        <td className="p-3 text-right font-black text-zinc-800">{fmt(l.importe || 0)}</td>
                      </tr>
                    ))}
                    {facturaPreview.lineas_factura.length > 6 && (
                      <tr><td colSpan={4} className="p-3 text-center text-zinc-400 text-[10px] font-bold italic">
                        +{facturaPreview.lineas_factura.length - 6} líneas más
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales */}
            <div className="bg-zinc-50 rounded-2xl p-4 flex justify-between items-center">
              <div className="space-y-1 text-xs text-zinc-500 font-bold">
                <p>Base imponible: {fmt(facturaPreview.base_imponible || 0)}</p>
                <p>IVA ({facturaPreview.iva_porcentaje}%): {fmt(facturaPreview.iva_total || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Total factura</p>
                <p className="text-3xl font-black text-[#295693]">{fmt(facturaPreview.total || 0)}</p>
              </div>
            </div>

            {/* Selector multi-obra */}
            {(facturaPreview.obras_detectadas?.length || 0) > 1 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-3">
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Esta factura contiene {facturaPreview.obras_detectadas.length} obras — selecciona cuál corresponde a esta
                </p>
                <div className="grid gap-2">
                  {facturaPreview.obras_detectadas.map((o: any, i: number) => (
                    <button key={i}
                      onClick={() => setObraSeleccionada(o)}
                      className={`flex justify-between items-center p-4 rounded-2xl border-2 text-left transition-all ${
                        obraSeleccionada?.nombre_obra === o.nombre_obra
                          ? 'border-[#295693] bg-blue-50'
                          : 'border-zinc-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <span className="font-black text-zinc-800 text-sm">{o.nombre_obra}</span>
                      <span className="font-black text-[#295693] text-lg">{fmt(o.subtotal || 0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setFacturaPreview(null); setObraSeleccionada(null); }}
                className="flex-1 py-4 border-2 border-zinc-200 rounded-2xl font-black text-[10px] uppercase text-zinc-500 hover:border-zinc-400 transition-all"
              >Descartar</button>
              <button
                onClick={handleGuardarGasto}
                disabled={isSavingGasto || ((facturaPreview.obras_detectadas?.length || 0) > 1 && !obraSeleccionada)}
                className="flex-1 py-4 bg-[#295693] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isSavingGasto ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> Confirmar y guardar</>}
              </button>
            </div>
          </div>
        )}

        {/* Lista de gastos */}
        {gastos.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              {gastos.length} factura{gastos.length !== 1 ? 's' : ''} registrada{gastos.length !== 1 ? 's' : ''}
            </h4>
            <div className="rounded-[2rem] overflow-hidden border border-zinc-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Proveedor</th>
                    <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Factura</th>
                    <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Fecha</th>
                    <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Total</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => (
                    <tr key={g.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="p-4 font-black text-zinc-800">{g.proveedor}</td>
                      <td className="p-4 text-zinc-500 text-xs">{g.numero_factura}</td>
                      <td className="p-4 text-zinc-500 text-xs">
                        {g.fecha ? new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-4 text-right font-black text-[#295693]">{fmt(g.total || 0)}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => eliminarGasto(g.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        ><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#295693]">
                    <td colSpan={3} className="p-4 font-black text-[10px] uppercase tracking-widest text-white">Total materiales</td>
                    <td className="p-4 text-right font-black text-white text-lg">{fmt(totalGastoTab)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : !facturaPreview && (
          <div className="text-center py-16 border-4 border-dashed border-zinc-100 rounded-[3rem]">
            <Package size={32} className="text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-300 italic font-black uppercase text-xs tracking-[0.4em]">Sin facturas de material</p>
          </div>
        )}
      </div>
    );
  };

  const TabMediciones = () => {
    const totalM2 = mediciones.reduce((s, m) => s + (parseFloat(m.ml || 0) * parseFloat(m.alto || 0)), 0);
    return (
      <div className="p-8 space-y-8 overflow-y-auto">
        {/* Formulario añadir */}
        <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 space-y-4">
          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-[#295693] flex items-center gap-2">
            <PlusCircle size={16} /> Nueva medición
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Descripción</label>
              <input
                type="text"
                placeholder="Ej: Pared norte, Suelo cocina..."
                value={nuevaMedicion.descripcion}
                onChange={e => setNuevaMedicion({ ...nuevaMedicion, descripcion: e.target.value })}
                className="w-full bg-white border-2 border-blue-100 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">ML (longitud)</label>
              <input
                type="number" step="0.01" min="0"
                value={nuevaMedicion.ml || ''}
                placeholder="0.00"
                onChange={e => setNuevaMedicion({ ...nuevaMedicion, ml: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border-2 border-blue-100 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Alto (m)</label>
              <input
                type="number" step="0.01" min="0"
                value={nuevaMedicion.alto || ''}
                placeholder="0.00"
                onChange={e => setNuevaMedicion({ ...nuevaMedicion, alto: parseFloat(e.target.value) || 0 })}
                onKeyDown={e => e.key === 'Enter' && agregarMedicion()}
                className="w-full bg-white border-2 border-blue-100 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          {/* Preview del cálculo */}
          {(nuevaMedicion.ml > 0 || nuevaMedicion.alto > 0) && (
            <div className="bg-white border border-blue-200 rounded-2xl px-5 py-3 flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">
                {nuevaMedicion.ml} ml × {nuevaMedicion.alto} m
              </span>
              <span className="font-black text-[#295693] text-xl">
                = {(nuevaMedicion.ml * nuevaMedicion.alto).toFixed(4)} m²
              </span>
            </div>
          )}
          <button
            onClick={agregarMedicion}
            disabled={isSavingMedicion}
            className="bg-[#295693] text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
          >
            {isSavingMedicion ? <Loader2 className="animate-spin" size={14} /> : <PlusCircle size={14} />}
            Añadir medición
          </button>
        </div>

        {/* Tabla de mediciones */}
        {mediciones.length > 0 ? (
          <div className="rounded-[2rem] overflow-hidden border border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Descripción</th>
                  <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">ML</th>
                  <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Alto (m)</th>
                  <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Total m²</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {mediciones.map(m => {
                  const total = parseFloat(m.ml || 0) * parseFloat(m.alto || 0);
                  return (
                    <tr key={m.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="p-4 font-black text-zinc-800">{m.descripcion}</td>
                      <td className="p-4 text-right font-bold text-zinc-600">{parseFloat(m.ml).toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-zinc-600">{parseFloat(m.alto).toFixed(2)}</td>
                      <td className="p-4 text-right font-black text-[#295693] text-base">{total.toFixed(4)} m²</td>
                      <td className="p-4 text-right">
                        <button onClick={() => eliminarMedicion(m.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        ><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#295693]">
                  <td colSpan={3} className="p-4 font-black text-[10px] uppercase tracking-widest text-white">Total medición real</td>
                  <td className="p-4 text-right font-black text-white text-lg">{totalM2.toFixed(4)} m²</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 border-4 border-dashed border-zinc-100 rounded-[3rem]">
            <Ruler size={32} className="text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-300 italic font-black uppercase text-xs tracking-[0.4em]">Sin mediciones registradas</p>
          </div>
        )}
      </div>
    );
  };

  const TabProximamente = ({ label }: { label: string }) => (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
          <Construction size={32} className="text-zinc-300" />
        </div>
        <p className="font-black text-xl uppercase italic text-zinc-300 tracking-tight">{label}</p>
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Próximamente disponible</p>
      </div>
    </div>
  );

  const TabHoras = () => {
    const totalH   = horas.reduce((s, h) => s + parseFloat(h.horas || 0), 0);
    const jornadas = totalH / 8;
    const coste    = jornadas * 150;
    return (
      <div className="p-8 space-y-8 overflow-y-auto">
        <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 space-y-4">
          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-[#295693] flex items-center gap-2">
            <PlusCircle size={16} /> Añadir registro
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Fecha</label>
              <input type="date" value={nuevaFila.fecha}
                onChange={e => setNuevaFila({ ...nuevaFila, fecha: e.target.value })}
                className="w-full bg-white border-2 border-blue-100 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Trabajador</label>
              <input type="text" placeholder="Nombre..." value={nuevaFila.trabajador}
                onChange={e => setNuevaFila({ ...nuevaFila, trabajador: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && agregarHora()}
                className="w-full bg-white border-2 border-blue-100 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Horas</label>
              <input type="number" step="0.5" min="0.5" max="24" value={nuevaFila.horas}
                onChange={e => setNuevaFila({ ...nuevaFila, horas: parseFloat(e.target.value) })}
                className="w-full bg-white border-2 border-blue-100 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <button onClick={agregarHora} disabled={isSavingHora}
            className="bg-[#295693] text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
          >
            {isSavingHora ? <Loader2 className="animate-spin" size={14} /> : <PlusCircle size={14} />}
            Añadir
          </button>
        </div>
        {horas.length > 0 ? (
          <div className="rounded-[2rem] overflow-hidden border border-zinc-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Fecha</th>
                  <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Trabajador</th>
                  <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Horas</th>
                  <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Jornadas</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {horas.map(h => (
                  <tr key={h.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="p-4 text-zinc-600 font-medium">
                      {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="p-4 font-black text-zinc-800">{h.trabajador}</td>
                    <td className="p-4 text-right font-bold text-zinc-600">{h.horas}h</td>
                    <td className="p-4 text-right text-zinc-500 text-xs">{(h.horas / 8).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => eliminarHora(h.id)}
                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      ><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-800">
                  <td colSpan={2} className="p-4 font-black text-[10px] uppercase tracking-widest text-white">Total</td>
                  <td className="p-4 text-right font-black text-white">{totalH}h</td>
                  <td className="p-4 text-right font-black text-zinc-300">{jornadas.toFixed(2)} jornadas</td>
                  <td></td>
                </tr>
                <tr className="bg-[#295693]">
                  <td colSpan={4} className="p-4 font-black text-[10px] uppercase tracking-widest text-white">Coste estimado mano de obra (150€/jornada)</td>
                  <td className="p-4 text-right font-black text-white text-lg">{fmt(coste)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 border-4 border-dashed border-zinc-100 rounded-[3rem]">
            <p className="text-zinc-300 italic font-black uppercase text-xs tracking-[0.4em]">Sin registros de horas</p>
          </div>
        )}
      </div>
    );
  };

  const TabAnalisis = () => {
    const esBeneficioso = beneficio >= 0;
    return (
      <div className="p-8 space-y-8 overflow-y-auto">
        {/* Fechas */}
        <div className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6 space-y-4">
          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
            <Calendar size={16} /> Duración de la obra
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full bg-white border-2 border-zinc-200 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Fecha fin</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                className="w-full bg-white border-2 border-zinc-200 rounded-2xl p-3 font-bold text-zinc-800 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <button onClick={guardarFechas} disabled={isSavingFechas}
            className="flex items-center gap-2 bg-zinc-800 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            {isSavingFechas ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Guardar fechas
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white border-2 border-zinc-100 rounded-[2rem] p-6 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">Presupuesto total</p>
            <p className="text-3xl font-black text-[#295693] tracking-tighter">{fmt(presupuestoTotal)}</p>
            {!selectedObra?.presupuesto_vinculado_id && (
              <p className="text-[9px] text-amber-500 font-bold">Vincula un presupuesto en la pestaña Presupuesto</p>
            )}
          </div>
          <div className="bg-white border-2 border-zinc-100 rounded-[2rem] p-6 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">Coste mano de obra</p>
            <p className="text-3xl font-black text-zinc-800 tracking-tighter">{fmt(costeMO)}</p>
            <p className="text-[9px] text-zinc-400 font-bold">{totalJornadas.toFixed(1)} jornadas × 150€</p>
          </div>
          <div className="bg-white border-2 border-zinc-100 rounded-[2rem] p-6 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">Gastos de material</p>
            <p className="text-3xl font-black text-zinc-800 tracking-tighter">{fmt(totalGastos)}</p>
            <p className="text-[9px] text-zinc-400 font-bold">{gastos.length} factura{gastos.length !== 1 ? 's' : ''} registrada{gastos.length !== 1 ? 's' : ''}</p>
          </div>
          <div className={`border-2 rounded-[2rem] p-6 space-y-2 ${esBeneficioso ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">Beneficio estimado</p>
            <div className="flex items-center gap-3">
              <p className={`text-3xl font-black tracking-tighter ${esBeneficioso ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(beneficio)}
              </p>
              {esBeneficioso ? <TrendingUp size={24} className="text-green-500" /> : <TrendingDown size={24} className="text-red-500" />}
            </div>
            <p className={`text-[9px] font-black ${esBeneficioso ? 'text-green-600' : 'text-red-600'}`}>
              Margen: {margen.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Desglose */}
        <div className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6 space-y-4">
          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-zinc-500">Desglose de costes</h3>
          {[
            { label: 'Mano de obra', value: costeMO,      color: '#295693' },
            { label: 'Materiales',   value: totalGastos,  color: '#64748b' },
          ].map(item => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase text-zinc-600">
                <span>{item.label}</span>
                <span>{fmt(item.value)}</span>
              </div>
              <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: presupuestoTotal > 0 ? `${Math.min((item.value / presupuestoTotal) * 100, 100)}%` : '0%',
                  backgroundColor: item.color,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading && obras.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-white w-12 h-12" />
        <p className="text-white font-black italic uppercase tracking-widest">Cargando Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">Pipeline</h1>
          <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de obras y control</p>
        </div>
        <button onClick={() => setIsCrearModalOpen(true)}
          className="bg-white text-[#295693] px-8 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-b-4 border-zinc-300"
        >
          <Plus size={18} strokeWidth={3} /> Nueva Obra
        </button>
      </div>

      {/* PIPELINE */}
      <div className="flex flex-row overflow-x-auto lg:grid lg:grid-cols-4 gap-8 min-h-[75vh] pb-20 snap-x snap-mandatory lg:overflow-x-visible">
        {COLUMNAS.map(col => (
          <div key={col.id} className="flex flex-col gap-6 min-w-[85vw] md:min-w-[45vw] lg:min-w-0 snap-center">
            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-[2.5rem] flex justify-between items-center border border-white/10">
              <span className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em] italic">{col.title}</span>
              <span className="bg-blue-500 text-white text-[10px] px-4 py-1.5 rounded-full font-black">
                {obras.filter(o => o.estado?.toLowerCase() === col.id).length}
              </span>
            </div>
            <div className="space-y-6">
              {obras.filter(o => o.estado?.toLowerCase() === col.id).map(obra => (
                <div key={obra.id}
                  className="bg-white rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100 group hover:ring-8 hover:ring-blue-500/10 transition-all relative"
                >
                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(obra.id); }}
                    className="absolute top-4 right-4 p-2 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  ><Trash2 size={16} /></button>
                  <div onClick={() => abrirObra(obra)} className="cursor-pointer">
                    <h3 className="font-black text-zinc-900 leading-[1.1] text-xl mb-5 group-hover:text-blue-600 transition-colors uppercase italic break-words pr-8">
                      {obra.titulo}
                    </h3>
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 text-zinc-400 text-[10px] font-black uppercase tracking-widest bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <User size={14} className="text-blue-600" />
                        <span className="truncate">{obra.clientes?.nombre || 'Particular'}</span>
                      </div>
                      <div className="pt-6 border-t border-zinc-100 space-y-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter mb-1 italic">Presupuesto</span>
                          <span className="text-2xl font-black text-[#295693] tracking-tighter">
                            {fmt(obra.total_presupuesto || 0)}
                          </span>
                        </div>
                        <div className="relative w-full" onClick={e => e.stopPropagation()}>
                          <select value={obra.estado?.toLowerCase()} onChange={e => moverObra(obra.id, e.target.value)}
                            className="w-full text-[10px] font-black bg-[#295693] text-white border-none rounded-2xl px-5 py-3 outline-none hover:bg-blue-600 transition-all cursor-pointer uppercase appearance-none"
                          >
                            {COLUMNAS.map(c => <option key={c.id} value={c.id} className="bg-white text-zinc-900">{c.title}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {obras.filter(o => o.estado?.toLowerCase() === col.id).length === 0 && (
                <div className="h-40 border-4 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em] italic">Vacío</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CONFIRMAR BORRADO */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic">¿Eliminar Obra?</h3>
              <p className="text-zinc-500 text-sm mt-2">Se eliminarán también todos los seguimientos, horas y gastos.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-4 border-2 border-zinc-200 rounded-2xl font-black text-zinc-600 text-xs uppercase"
              >Cancelar</button>
              <button onClick={() => handleEliminarObra(confirmDeleteId)}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase"
              >Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR OBRA */}
      {isCrearModalOpen && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-[#1e3d6b]/95 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] shadow-2xl overflow-hidden">
            <div className="bg-[#295693] p-10 text-white flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Nueva Obra</h2>
                <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest mt-1">Alta de proyecto</p>
              </div>
              <button onClick={() => setIsCrearModalOpen(false)}
                className="bg-white/10 hover:bg-white text-white hover:text-[#295693] p-4 rounded-3xl transition-all"
              ><X size={24} /></button>
            </div>
            <div className="p-10 space-y-6 bg-zinc-50/50">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-[#295693] ml-4 tracking-widest italic">Nombre de la Obra</label>
                <input type="text" placeholder="Ej: Reforma Calle Mayor, 5"
                  className="w-full bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 outline-none focus:border-blue-500 font-bold text-lg"
                  value={nuevaObra.titulo}
                  onChange={e => setNuevaObra({ ...nuevaObra, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-[#295693] ml-4 tracking-widest italic">Cliente</label>
                <div className="relative">
                  <select
                    className="w-full bg-white border-2 border-zinc-100 rounded-[2rem] p-5 text-zinc-800 outline-none font-bold appearance-none cursor-pointer text-lg"
                    value={nuevaObra.cliente_id}
                    onChange={e => setNuevaObra({ ...nuevaObra, cliente_id: e.target.value })}
                  >
                    <option value="">Selecciona cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600" />
                </div>
              </div>
              <button onClick={handleCrearObra} disabled={isCreating}
                className="w-full bg-[#295693] text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 disabled:opacity-50 flex justify-center items-center gap-3 border-b-8 border-blue-900"
              >
                {isCreating ? <Loader2 className="animate-spin" /> : 'Crear Obra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE OBRA */}
      {selectedObra && (
        <div className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center bg-[#1e3d6b]/95 backdrop-blur-md p-0 sm:p-6">
          <div className="bg-white w-full max-w-6xl h-[95vh] sm:h-[90vh] rounded-t-[4rem] sm:rounded-[4rem] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#295693] p-8 sm:p-10 text-white flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter truncate max-w-[220px] sm:max-w-xl">
                  {selectedObra.titulo}
                </h2>
                <div className="flex items-center gap-4">
                  <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <User size={14} /> {selectedObra.clientes?.nombre}
                  </p>
                  <span className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{selectedObra.estado}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedObra(null); setConfirmDeleteId(selectedObra.id); }}
                  className="bg-red-500/20 hover:bg-red-500 text-white p-4 rounded-[2rem] transition-all"
                ><Trash2 size={20} /></button>
                <button onClick={() => setSelectedObra(null)}
                  className="bg-white/10 hover:bg-white text-white hover:text-[#295693] p-4 sm:p-5 rounded-[2rem] transition-all"
                ><X size={26} strokeWidth={3} /></button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-zinc-200 bg-white shrink-0">
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                    activeTab === id
                      ? 'border-[#295693] text-[#295693]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <Icon size={13} />{label}
                  {id === 'gastos' && gastos.length > 0 && (
                    <span className="bg-[#295693] text-white text-[8px] px-1.5 py-0.5 rounded-full font-black ml-1">{gastos.length}</span>
                  )}
                  {id === 'horas' && horas.length > 0 && (
                    <span className="bg-zinc-400 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black ml-1">{horas.length}</span>
                  )}
                  {id === 'mediciones' && mediciones.length > 0 && (
                    <span className="bg-zinc-400 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black ml-1">{mediciones.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto bg-zinc-50 flex flex-col">
              {activeTab === 'bitacora'    && <TabBitacora />}
              {activeTab === 'presupuesto' && <TabPresupuesto />}
              {activeTab === 'gastos'      && <TabGastos />}
              {activeTab === 'mediciones'  && <TabMediciones />}
              {activeTab === 'horas'       && <TabHoras />}
              {activeTab === 'analisis'    && <TabAnalisis />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
