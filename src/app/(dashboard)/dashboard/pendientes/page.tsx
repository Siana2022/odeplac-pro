'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, User, ChevronRight, ArrowLeft,
  FileText, Search, X, Edit2,
  Save, Loader2, Trash2, Download, Plus, Send
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NOTAS_COMPLETAS = [
  '.-La gestión de residuos será a cargo de La propiedad.',
  '.-La retirada de escombros será por cuenta de la propiedad.',
  '.-Precio dados con material puesto en planta por cuenta y medios de la constructora.',
  '.-La limpieza POR CUENTA DE LA CONSTRUCTORA.',
  '.-Criterio de medición: Siguiendo los criterios de medición expuestos en la norma UNE 92305: para huecos de superficie mayor o igual a 5 m2 e inferior o igual a 8 m2, se deducirá la mitad del hueco y para huecos de superficie mayor a 8m2, se deducirá la mitad del huevo y para huecos de superficie mayor a 8m2, se deducirá todo el hueco.',
  '.-Los permisos y licencias necesarias para la realización de los trabajos serán por cuenta de la propiedad.',
  '.-No se incluye apertura de huecos. No se incluyen refuerzos para instalación de mobiliario, sanitarios...los mismos se valorarán aparte. Ni el recibo de cajas para mecanismos y cuadros eléctricos.',
  '.-No se incluyen tabicas, fajas, bandejas, registros, cortineros ni foseados en los precios de falso techo. Ni colocación de casetones en caso de ser necesario.',
  '.-No incluidos medios auxiliares para la ejecución de los trabajos.',
  '.-EN CASO DE ALTURA SUPERIOR A 4M INCREMENTO DEL 20% SOBRE EL PRECIO DEL SISTEMA.',
  '.-LOS PRECIOS DEL MATERIAL OFERTADO ESTÁN VALORADOS CON TARIFAS DE AHORA, EN CASO DE REAJUSTE POR PARTE DE NUESTRO PROVEEDOR SE NEGOCIARÁ CON EL CLIENTE.',
  '.-HAY QUE TENER EN CUENTA LA OBRA Y LA FORMA DE INSTALACIÓN DE CADA SISTEMA.',
];

export default function PendientesPage() {
  const supabase = createClient();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoPartidas, setEditandoPartidas] = useState(false);
  const [partidasEditadas, setPartidasEditadas] = useState<any[]>([]);
  const [numeroPresupuesto, setNumeroPresupuesto] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const fetchLista = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('presupuestos_generados')
      .select('*')
      .or('estado.eq.pendiente,estado.is.null')
      .order('created_at', { ascending: false });
    if (!error) setLista(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLista(); }, []);

  const abrirModal = (p: any) => {
    setSeleccionado(p);
    setPartidasEditadas(JSON.parse(JSON.stringify(p.partidas_json || [])));
    setEditandoPartidas(false);
    setEditandoNombre(false);
    setNumeroPresupuesto('');
  };

  const actualizarPartida = (index: number, campo: string, valor: string) => {
    setPartidasEditadas(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], [campo]: valor };
      if (campo === 'medicion' && nuevas[index].precio_unitario) {
        nuevas[index].total_euros = ((parseFloat(valor) || 0) * (parseFloat(nuevas[index].precio_unitario) || 0)).toFixed(2);
      }
      return nuevas;
    });
  };

  const actualizarPrecioUnitario = (index: number, valor: string) => {
    setPartidasEditadas(prev => {
      const nuevas = [...prev];
      const precioUnit = parseFloat(valor) || 0;
      const medicion = parseFloat(nuevas[index].medicion) || 0;
      nuevas[index] = { ...nuevas[index], precio_unitario: valor, total_euros: (precioUnit * medicion).toFixed(2) };
      return nuevas;
    });
  };

  const guardarPartidas = async () => {
    const nuevoTotal = partidasEditadas.reduce((acc, p) => acc + (parseFloat(p.total_euros) || 0), 0);
    const { error } = await supabase
      .from('presupuestos_generados')
      .update({ partidas_json: partidasEditadas, total_materiales: parseFloat(nuevoTotal.toFixed(2)) })
      .eq('id', seleccionado.id);
    if (error) return toast.error('Error al guardar partidas');
    setSeleccionado({ ...seleccionado, partidas_json: partidasEditadas, total_materiales: parseFloat(nuevoTotal.toFixed(2)) });
    setEditandoPartidas(false);
    toast.success('Partidas actualizadas');
    fetchLista();
  };

  const cancelarEdicion = () => {
    setPartidasEditadas(JSON.parse(JSON.stringify(seleccionado.partidas_json || [])));
    setEditandoPartidas(false);
  };

  const guardarNombre = async () => {
    const { error } = await supabase
      .from('presupuestos_generados')
      .update({ obra_nombre: nuevoNombre })
      .eq('id', seleccionado.id);
    if (error) return toast.error('Error al actualizar');
    setSeleccionado({ ...seleccionado, obra_nombre: nuevoNombre });
    setEditandoNombre(false);
    toast.success('Nombre actualizado');
    fetchLista();
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este presupuesto?')) return;
    const { error } = await supabase.from('presupuestos_generados').delete().eq('id', id);
    if (error) return toast.error('Error al eliminar');
    toast.success('Presupuesto eliminado');
    setSeleccionado(null);
    fetchLista();
  };

  const moverAEnviados = async () => {
    setIsMoving(true);
    const { error } = await supabase
      .from('presupuestos_generados')
      .update({ estado: 'enviado' })
      .eq('id', seleccionado.id);
    setIsMoving(false);
    if (error) return toast.error('Error al mover');
    toast.success('Presupuesto movido a Enviados ✓');
    setSeleccionado(null);
    fetchLista();
  };

  const descargarPDF = (p: any) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const partidas = editandoPartidas ? partidasEditadas : (p.partidas_json || []);
    const AZUL       = [30, 61, 107]   as [number, number, number];
    const NEGRO      = [0, 0, 0]       as [number, number, number];
    const BLANCO     = [255, 255, 255] as [number, number, number];
    const GRIS_CLR   = [200, 200, 200] as [number, number, number];
    const GRIS_FONDO = [248, 248, 248] as [number, number, number];

    const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const numPresupuesto = numeroPresupuesto.trim() || `260${Math.floor(10 + Math.random() * 89)}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...AZUL);
    doc.text('O D E P L A C', 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEGRO);
    doc.text('CONSTRUCCIONES EN SECO S.L.', 14, 25);

    doc.setFillColor(...AZUL);
    doc.rect(148, 10, 50, 9, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', 173, 15.5, { align: 'center' });

    doc.setTextColor(...AZUL);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(numPresupuesto, 195, 22, { align: 'right' });

    doc.setDrawColor(...GRIS_CLR);
    doc.setLineWidth(0.3);
    doc.line(14, 28, 196, 28);

    doc.setFontSize(8);
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'normal');
    doc.text('Av. de la Albufera Nº 1, 7B / CP 46470 Massanassa VALENCIA', 14, 33);
    doc.text('Teléfono: 645735319', 14, 37.5);
    doc.text('E-mail: odeplac1@gmail.com', 110, 33);
    doc.text('CIF: B70725528', 110, 37.5);
    doc.setTextColor(0, 0, 200);
    doc.setFont('helvetica', 'bold');
    doc.text('www.odeplac.net', 170, 37.5, { align: 'right' });

    doc.setDrawColor(...GRIS_CLR);
    doc.line(14, 40, 196, 40);
    doc.setFillColor(...AZUL);
    doc.rect(14, 42, 100, 8, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`PARA: ${p.cliente_nombre?.toUpperCase() || ''}`, 17, 47.5);

    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://www.odeplac.net';
    try {
      doc.addImage(qrUrl, 'PNG', 163, 41, 30, 30);
    } catch {
      doc.setFillColor(240, 240, 240);
      doc.rect(163, 41, 30, 30, 'F');
    }

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let yCliente = 55;
    doc.text('Telefono:', 14, yCliente);
    doc.text('Correo :', 14, yCliente + 5);
    doc.setFont('helvetica', 'bold');
    doc.text('CIF:', 14, yCliente + 10);
    doc.text(`FECHA:  ${fechaHoy}`, 14, yCliente + 16);
    doc.text('FECHA VENCIMIENTO: 10 DÍAS', 14, yCliente + 22);

    const tableBody = partidas.map((item: any) => {
      const descripcionOfertamos = item.ofertamos ? `OFERTAMOS: ${item.ofertamos}` : item.descripcion?.toUpperCase() || '';
      const descripcionCompleta = item.detalle_tecnico ? `${descripcionOfertamos}\n${item.detalle_tecnico}` : descripcionOfertamos;
      const medicion = parseFloat(item.medicion) || 0;
      const totalEuros = parseFloat(item.total_euros) || 0;
      const precioUnit = medicion > 0 ? (totalEuros / medicion).toFixed(2) : '-';
      return [
        descripcionCompleta,
        medicion > 0 ? medicion.toString() : '0',
        precioUnit,
        totalEuros > 0 ? totalEuros.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '-',
      ];
    });
    while (tableBody.length < 8) tableBody.push(['', '', '', '']);

    autoTable(doc, {
      startY: 82,
      head: [['DESCRIPCIÓN', 'Cant.', 'Precio unitario', 'Coste']],
      body: tableBody,
      theme: 'plain',
      headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
      columnStyles: {
        0: { cellWidth: 96 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 38, halign: 'right' },
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      styles: { fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 }, lineColor: GRIS_CLR, lineWidth: 0.2, textColor: NEGRO },
      alternateRowStyles: { fillColor: GRIS_FONDO },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const subtotal = partidas.reduce((acc: number, p: any) => acc + (parseFloat(p.total_euros) || 0), 0);
    const iva = subtotal * 0.21;
    const total = subtotal * 1.21;
    const AMARILLO = [255, 255, 153] as [number, number, number];
    let yT = finalY + 3;
    if (yT + 42 > 265) { doc.addPage(); yT = 20; }

    [
      { label: 'SUBTOTAL', valor: subtotal > 0 ? subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : '-' },
      { label: 'IVA', valor: '21,000%' },
      { label: 'Impuesto', valor: subtotal > 0 ? iva.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : '-' },
    ].forEach(fila => {
      doc.setFillColor(...AMARILLO);
      doc.rect(120, yT, 76, 8, 'F');
      doc.setDrawColor(...GRIS_CLR);
      doc.setLineWidth(0.2);
      doc.rect(120, yT, 76, 8, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...NEGRO);
      doc.text(fila.label, 124, yT + 5.5);
      doc.text(fila.valor, 194, yT + 5.5, { align: 'right' });
      yT += 8;
    });

    doc.setFillColor(...AZUL);
    doc.rect(120, yT, 76, 11, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL', 124, yT + 7.5);
    doc.text(subtotal > 0 ? total.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : '-', 194, yT + 7.5, { align: 'right' });

    let yNotas = yT + 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...NEGRO);
    NOTAS_COMPLETAS.forEach(nota => {
      const wrapped = doc.splitTextToSize(nota, 172);
      if (yNotas + wrapped.length * 3.8 > 285) { doc.addPage(); yNotas = 15; }
      doc.text(wrapped, 14, yNotas);
      yNotas += wrapped.length * 3.8 + 1;
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generado por Odeplac Pro · Pág. ${i}/${totalPages}`, 105, 292, { align: 'center' });
    }

    doc.save(`Presupuesto_${p.obra_nombre?.replace(/\s+/g, '_') || 'Odeplac'}.pdf`);
    toast.success('PDF descargado');
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-6 lg:p-10 text-white">

      {/* MODAL */}
      {seleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3d6b]/95 backdrop-blur-md overflow-y-auto">
          <div className="bg-white text-zinc-800 w-full max-w-4xl rounded-3xl shadow-2xl my-auto animate-in zoom-in-95">

            {/* Cabecera */}
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
                    <button onClick={guardarNombre} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Save size={18} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-[#1e3d6b] uppercase tracking-tighter">{seleccionado.obra_nombre}</h2>
                    <button onClick={() => { setEditandoNombre(true); setNuevoNombre(seleccionado.obra_nombre); }} className="text-zinc-300 hover:text-blue-500 transition-colors">
                      <Edit2 size={18} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Nº Presupuesto:</label>
                  <input
                    className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1 text-sm font-black text-[#1e3d6b] outline-none focus:border-[#1e3d6b] w-28"
                    value={numeroPresupuesto}
                    onChange={(e) => setNumeroPresupuesto(e.target.value)}
                    placeholder="26001"
                  />
                  <span className="text-[9px] text-zinc-400 italic">Para el PDF</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => descargarPDF(seleccionado)} className="flex items-center gap-2 bg-[#1e3d6b] text-white px-4 py-2 rounded-xl hover:bg-[#2a548a] transition-all text-xs font-bold">
                  <Download size={16} /> PDF
                </button>
                <button onClick={() => setSeleccionado(null)} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full"><X size={24} /></button>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Cliente</p>
                  <p className="font-bold text-zinc-800">{seleccionado.cliente_nombre}</p>
                </div>
                <div className="p-4 bg-[#1e3d6b] rounded-2xl text-white shadow-lg text-center">
                  <p className="text-[10px] opacity-60 font-bold uppercase mb-1">Total Estimado</p>
                  <p className="text-xl font-black">
                    {(editandoPartidas
                      ? partidasEditadas.reduce((a, p) => a + (parseFloat(p.total_euros) || 0), 0)
                      : seleccionado.total_materiales
                    ).toLocaleString()} €
                  </p>
                </div>
                <button
                  onClick={moverAEnviados}
                  disabled={isMoving}
                  className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {isMoving ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={20} />}
                  Mover a Enviados
                </button>
              </div>

              {/* Cabecera tabla */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Partidas del presupuesto</span>
                {!editandoPartidas ? (
                  <button onClick={() => setEditandoPartidas(true)} className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all">
                    <Edit2 size={12} /> Editar partidas
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={guardarPartidas} className="flex items-center gap-1.5 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all">
                      <Save size={12} /> Guardar cambios
                    </button>
                    <button onClick={cancelarEdicion} className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all">
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Tabla */}
              <div className="border rounded-2xl overflow-hidden mb-4">
                {!editandoPartidas ? (
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b">
                      <tr className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="py-2 px-4 text-left w-8">Nº</th>
                        <th className="py-2 text-left">Descripción</th>
                        <th className="py-2 text-right w-20">Medición</th>
                        <th className="py-2 text-right w-20">€/m²</th>
                        <th className="py-2 px-4 text-right w-28">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 text-zinc-800">
                      {seleccionado.partidas_json?.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4 font-bold text-zinc-300 text-xs">{p.item || i + 1}</td>
                          <td className="py-3">
                            {p.ofertamos && <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter mb-0.5">{p.ofertamos}</p>}
                            <p className="font-bold leading-snug text-sm">{p.descripcion}</p>
                            {p.detalle_tecnico && <p className="text-[10px] text-zinc-400 mt-0.5">{p.detalle_tecnico}</p>}
                          </td>
                          <td className="py-3 text-right font-bold text-sm">{p.medicion} m²</td>
                          <td className="py-3 text-right text-sm text-zinc-500 font-bold">
                            {parseFloat(p.medicion) > 0
                              ? ((parseFloat(p.precio_unitario) || (parseFloat(p.total_euros || '0') / parseFloat(p.medicion))).toFixed(2)) + ' €'
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#1e3d6b]">
                            {parseFloat(p.total_euros) > 0 ? `${parseFloat(p.total_euros).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto p-4 space-y-3 bg-zinc-50">
                    {partidasEditadas.map((p: any, i: number) => (
                      <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest shrink-0">Ofertamos:</span>
                          <input value={p.ofertamos || ''} onChange={(e) => actualizarPartida(i, 'ofertamos', e.target.value)} placeholder="Ej: TABIQUE SENCILLO 48H..." className="flex-1 text-sm font-black text-blue-700 border-b border-blue-100 outline-none focus:border-blue-400 bg-transparent pb-0.5" />
                          <button onClick={() => setPartidasEditadas(prev => prev.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 shrink-0 ml-2"><Trash2 size={14} /></button>
                        </div>
                        <textarea
                          value={p.descripcion || ''}
                          onChange={(e) => actualizarPartida(i, 'descripcion', e.target.value)}
                          onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                          placeholder="Descripción del trabajo..."
                          className="w-full text-sm font-bold text-zinc-700 border border-zinc-200 rounded-xl p-3 outline-none focus:border-blue-400 resize-none mb-2"
                          style={{ minHeight: '56px', overflow: 'hidden' }}
                        />
                        <input value={p.detalle_tecnico || ''} onChange={(e) => actualizarPartida(i, 'detalle_tecnico', e.target.value)} placeholder="Detalle técnico (opcional)..." className="w-full text-[11px] text-zinc-400 border border-zinc-100 rounded-xl p-2 outline-none focus:border-blue-200 mb-3" />
                        <div className="flex gap-4 items-end">
                          <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">Medición</label>
                            <input type="text" inputMode="decimal" value={p.medicion || ''} onChange={(e) => actualizarPartida(i, 'medicion', e.target.value.replace(',', '.'))} className="w-24 border border-zinc-200 rounded-lg p-2 text-right text-sm font-bold text-zinc-700 outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">€/m²</label>
                            <input type="text" inputMode="decimal" value={p.precio_unitario || (parseFloat(p.medicion) > 0 ? (parseFloat(p.total_euros || '0') / parseFloat(p.medicion)).toFixed(2) : '')} onChange={(e) => actualizarPrecioUnitario(i, e.target.value.replace(',', '.'))} className="w-24 border border-blue-200 rounded-lg p-2 text-right text-sm font-black text-[#1e3d6b] outline-none focus:border-blue-500 bg-blue-50" />
                          </div>
                          <div className="flex-1 text-right">
                            <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">Total €</label>
                            <p className="text-sm font-black text-zinc-700 py-2">{parseFloat(p.total_euros || '0').toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setPartidasEditadas(prev => [...prev, { item: prev.length + 1, descripcion: '', medicion: 0, precio_unitario: '', total_euros: '0', ofertamos: '', detalle_tecnico: '' }])} className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase px-2">
                      <Plus size={12} /> Añadir partida
                    </button>
                    <div className="bg-[#1e3d6b] px-6 py-3 rounded-xl flex justify-between items-center">
                      <span className="text-white/60 text-[10px] font-black uppercase">Total actualizado</span>
                      <span className="text-white font-black text-lg">{partidasEditadas.reduce((a, p) => a + (parseFloat(p.total_euros) || 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-between items-center text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                <button onClick={() => eliminar(seleccionado.id)} className="flex items-center gap-1 text-red-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} /> Eliminar definitivamente
                </button>
                <span>ID: {seleccionado.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/presupuestos" className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-lg">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Presupuestos Pendientes</h1>
            <p className="text-blue-100/60 text-sm">Presupuestos creados pendientes de revisión y envío.</p>
          </div>
        </div>
        <Link href="/dashboard/enviados" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-all">
          <Send size={14} /> Ver Enviados
        </Link>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-400 h-12 w-12" /></div>
      ) : lista.length > 0 ? (
        <div className="grid gap-4">
          {lista.map((p) => (
            <div key={p.id} onClick={() => abrirModal(p)} className="group bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center hover:bg-white/15 transition-all cursor-pointer shadow-lg">
              <div className="flex gap-6 items-center">
                <div className="p-4 rounded-2xl bg-orange-500/20 text-orange-300 shadow-inner">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-tighter group-hover:text-orange-300 transition-colors">{p.obra_nombre}</h3>
                  <div className="flex gap-4 text-white/40 text-[11px] font-bold mt-1 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><User size={12} className="text-orange-300" /> {p.cliente_nombre}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-6">
                <div>
                  <p className="text-2xl font-black tracking-tight">{p.total_materiales?.toLocaleString()} €</p>
                  <p className="text-[10px] font-black uppercase text-right tracking-widest text-orange-400">PENDIENTE</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-500 transition-all group-hover:translate-x-1 shadow-inner">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 text-white/10 font-black uppercase tracking-widest">
          <Search size={48} className="mx-auto mb-4 opacity-10" />
          No hay presupuestos pendientes
        </div>
      )}
    </div>
  );
}
