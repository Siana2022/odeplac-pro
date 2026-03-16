'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Calendar, User, Building2, ChevronRight, ArrowLeft, 
  FileText, Search, X, Edit2, CheckCircle2, Rocket, 
  Save, Loader2, Trash2, RotateCcw, Download 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HistorialPresupuestos() {
  const supabase = createClient();
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState<any>(null);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchHistorial = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('presupuestos_generados')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setHistorial(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistorial(); }, []);

  // --- FUNCIÓN PARA GENERAR EL PDF PROFESIONAL ---
  const descargarPDF = (p: any) => {
    const doc = new jsPDF();
    // CORRECCIÓN: Añadimos "as const" para que TS sepa que son exactamente 3 números (RGB)
    const azulOdeplac = [30, 61, 107] as const;

    // 1. Cabecera y Logo
    doc.setFillColor(azulOdeplac[0], azulOdeplac[1], azulOdeplac[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ODEPLAC PRO", 14, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("SISTEMAS DE YESO LAMINADO Y REVESTIMIENTOS", 14, 32);

    // 2. Información del Presupuesto
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE:", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(p.cliente_nombre.toUpperCase(), 14, 60);

    doc.setFont("helvetica", "bold");
    doc.text("PROYECTO / OBRA:", 100, 55);
    doc.setFont("helvetica", "normal");
    doc.text(p.obra_nombre.toUpperCase(), 100, 60);

    doc.setFont("helvetica", "bold");
    doc.text("FECHA EMISIÓN:", 160, 55);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(p.created_at).toLocaleDateString(), 160, 60);

    // 3. Tabla de Partidas
    const tableRows = p.partidas_json?.map((item: any) => [
      item.item || '-',
      { 
        content: `${item.descripcion}\nSistema: ${item.tipo || 'N/A'} | Placa: ${item.placa || 'N/A'}`, 
        styles: { fontSize: 8, textColor: [80, 80, 80] } 
      },
      `${item.medicion} m²`,
      `${item.total_euros} €`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Nº', 'DESCRIPCIÓN TÉCNICA', 'MEDICIÓN', 'IMPORTE']],
      body: tableRows,
      theme: 'grid',
      // CORRECCIÓN: Forzamos el tipo de fillColor para evitar el error de Vercel
      headStyles: { 
        fillColor: azulOdeplac as [number, number, number], 
        textColor: [255, 255, 255] as [number, number, number], 
        fontStyle: 'bold' 
      },
      styles: { cellPadding: 5, fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      }
    });

    // 4. Resumen Final
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setDrawColor(azulOdeplac[0], azulOdeplac[1], azulOdeplac[2]);
    doc.setLineWidth(0.5);
    doc.line(120, finalY - 5, 196, finalY - 5);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ESTIMACIÓN MATERIALES:", 120, finalY);
    doc.text(`${p.total_materiales.toLocaleString()} €`, 196, finalY, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("* Este documento es una valoración técnica de materiales basada en mediciones de proyecto.", 14, finalY + 20);

    // 5. Pie de Página
    doc.setFontSize(8);
    doc.text("Generado automáticamente por Odeplac Pro AI Cloud", 105, 285, { align: 'center' });

    doc.save(`Presupuesto_${p.obra_nombre.replace(/\s+/g, '_')}.pdf`);
  };

  const guardarNombre = async () => {
    const { error } = await supabase
      .from('presupuestos_generados')
      .update({ obra_nombre: nuevoNombre })
      .eq('id', presupuestoSeleccionado.id);

    if (error) return toast.error("Error al actualizar");
    
    setPresupuestoSeleccionado({ ...presupuestoSeleccionado, obra_nombre: nuevoNombre });
    setEditandoNombre(false);
    toast.success("Nombre actualizado");
    fetchHistorial();
  };

  const eliminarPresupuesto = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres borrar este presupuesto?")) return;
    
    const { error } = await supabase
      .from('presupuestos_generados')
      .delete()
      .eq('id', id);

    if (error) return toast.error("Error al eliminar");
    
    toast.success("Presupuesto eliminado");
    setPresupuestoSeleccionado(null);
    fetchHistorial();
  };

  const resetearEstado = async (id: string) => {
    const { error } = await supabase
      .from('presupuestos_generados')
      .update({ estado: 'pendiente' })
      .eq('id', id);

    if (error) return toast.error("Error al resetear");
    
    toast.success("Estado reseteado");
    setPresupuestoSeleccionado((prev: any) => ({ ...prev, estado: 'pendiente' }));
    fetchHistorial();
  };

  const aprobarYPasarAPipeline = async () => {
    setIsProcessing(true);
    try {
      const { data: clienteEncontrado } = await supabase
        .from('clientes')
        .select('id')
        .eq('nombre', presupuestoSeleccionado.cliente_nombre)
        .single();

      const { error: errorObra } = await supabase.from('obras').insert([{
        titulo: presupuestoSeleccionado.obra_nombre,
        total_presupuesto: presupuestoSeleccionado.total_materiales,
        items_presupuesto: presupuestoSeleccionado.partidas_json,
        estado: 'presupuesto', 
        porcentaje_avance: 0,
        cliente_id: clienteEncontrado ? clienteEncontrado.id : null 
      }]);

      if (errorObra) throw errorObra;

      await supabase.from('presupuestos_generados')
        .update({ estado: 'aprobado' })
        .eq('id', presupuestoSeleccionado.id);

      toast.success("¡Enviado al Pipeline! 🚀");
      setPresupuestoSeleccionado(null);
      fetchHistorial();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-6 lg:p-10 text-white">
      {/* El resto del JSX se mantiene igual */}
      {presupuestoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3d6b]/95 backdrop-blur-md overflow-y-auto">
          <div className="bg-white text-zinc-800 w-full max-w-4xl rounded-3xl shadow-2xl my-auto animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-start bg-zinc-50 rounded-t-3xl">
              <div className="flex-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">PROYECTO</span>
                {editandoNombre ? (
                  <div className="flex gap-2">
                    <input 
                      value={nuevoNombre} 
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="text-2xl font-black uppercase border-b-2 border-blue-500 outline-none w-full bg-transparent"
                      autoFocus
                    />
                    <button onClick={guardarNombre} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Save size={18}/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-[#1e3d6b] uppercase tracking-tighter">{presupuestoSeleccionado.obra_nombre}</h2>
                    <button onClick={() => {setEditandoNombre(true); setNuevoNombre(presupuestoSeleccionado.obra_nombre)}} className="text-zinc-300 hover:text-blue-500"><Edit2 size={18}/></button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => descargarPDF(presupuestoSeleccionado)}
                  className="flex items-center gap-2 bg-[#1e3d6b] text-white px-4 py-2 rounded-xl hover:bg-[#2a548a] transition-all text-xs font-bold mr-2"
                >
                  <Download size={16} /> PDF
                </button>
                <button onClick={() => setPresupuestoSeleccionado(null)} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full"><X size={24}/></button>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Cliente Solicitante</p>
                  <p className="font-bold text-zinc-800">{presupuestoSeleccionado.cliente_nombre}</p>
                </div>
                <div className="p-4 bg-[#1e3d6b] rounded-2xl text-white shadow-lg text-center">
                  <p className="text-[10px] opacity-60 font-bold uppercase mb-1">Total Estimado Materiales</p>
                  <p className="text-xl font-black">{presupuestoSeleccionado.total_materiales.toLocaleString()} €</p>
                </div>
                <div className="flex flex-col gap-2">
                   {presupuestoSeleccionado.estado === 'aprobado' ? (
                     <>
                      <div className="w-full bg-green-50 text-green-600 p-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] border border-green-100">
                        <CheckCircle2 size={18}/> En Pipeline
                      </div>
                      <button onClick={() => resetearEstado(presupuestoSeleccionado.id)} className="text-[10px] text-orange-600 font-bold uppercase flex items-center justify-center gap-1 hover:underline">
                        <RotateCcw size={12}/> Resetear estado
                      </button>
                     </>
                   ) : (
                     <button onClick={aprobarYPasarAPipeline} disabled={isProcessing} className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
                       {isProcessing ? <Loader2 className="animate-spin h-5 w-5"/> : <Rocket size={20}/>} Aprobar y Enviar
                     </button>
                   )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto border rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-zinc-400 border-b text-[10px] font-black uppercase tracking-widest">
                      <th className="py-2 px-4 text-left w-12">Nº</th>
                      <th className="py-2 text-left">Partida / Sistema</th>
                      <th className="py-2 text-right">Medición</th>
                      <th className="py-2 px-4 text-right">Coste Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-zinc-800">
                    {presupuestoSeleccionado.partidas_json?.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-4 font-bold text-zinc-300">{p.item}</td>
                        <td className="py-3">
                          <p className="font-bold leading-tight">{p.descripcion}</p>
                          <span className="text-[10px] uppercase font-black text-blue-500 tracking-tighter">{p.tipo} | {p.placa}</span>
                        </td>
                        <td className="py-3 text-right font-bold">{p.medicion} m²</td>
                        <td className="py-3 px-4 text-right font-black text-[#1e3d6b]">{p.total_euros} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-between items-center text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                <button onClick={() => eliminarPresupuesto(presupuestoSeleccionado.id)} className="flex items-center gap-1 text-red-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12}/> Eliminar definitivamente
                </button>
                <span>ID: {presupuestoSeleccionado.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/presupuestos" className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Historial de Mediciones</h1>
            <p className="text-blue-100/60 text-sm">Control de presupuestos y generación de documentos PDF.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-400 h-12 w-12" /></div>
      ) : historial.length > 0 ? (
        <div className="grid gap-4">
          {historial.map((p) => (
            <div 
              key={p.id} 
              onClick={() => setPresupuestoSeleccionado(p)} 
              className="group bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center hover:bg-white/15 transition-all cursor-pointer shadow-lg"
            >
              <div className="flex gap-6 items-center">
                <div className={`p-4 rounded-2xl transition-all shadow-inner ${p.estado === 'aprobado' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {p.estado === 'aprobado' ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-tighter group-hover:text-blue-300 transition-colors">{p.obra_nombre}</h3>
                  <div className="flex gap-4 text-white/40 text-[11px] font-bold mt-1 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><User size={12} className="text-blue-300"/> {p.cliente_nombre}</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-6">
                <div>
                  <p className="text-2xl font-black tracking-tight">{p.total_materiales.toLocaleString()} €</p>
                  <p className={`text-[10px] font-black uppercase text-right tracking-widest ${p.estado === 'aprobado' ? 'text-green-400' : 'text-blue-400'}`}>
                    {p.estado === 'aprobado' ? 'EN PIPELINE' : 'PENDIENTE'}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-blue-500 transition-all group-hover:translate-x-1 shadow-inner"><ChevronRight size={20} /></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 text-white/10 font-black uppercase tracking-widest">
          <Search size={48} className="mx-auto mb-4 opacity-10" />
          No se han encontrado registros
        </div>
      )}
    </div>
  );
}