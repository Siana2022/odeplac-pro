'use client'

import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Loader2, Users, History, Save, Truck, Plus, Trash2, Search, Download, Receipt, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function GestionPresupuestos() {
  const supabase = createClient();

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [misMateriales, setMisMateriales] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [obraNombre, setObraNombre] = useState('');
  const [partidas, setPartidas] = useState<any[]>([]);

  const NOTAS_ESTANDAR =
    '.-La gestión de residuos será a cargo de La propiedad.\n' +
    '.-La retirada de escombros será por cuenta de la propiedad.\n' +
    '.-Precio dados con material puesto en planta por cuenta y medios de la constructora.\n' +
    '.-La limpieza POR CUENTA DE LA CONSTRUCTORA.\n' +
    '.-Criterio de medición: Siguiendo los criterios de medición expuestos en la norma UNE 92305.\n' +
    '.-No se incluye apertura de huecos. No se incluyen refuerzos para instalación de mobiliario, sanitarios.\n' +
    '.-EN CASO DE ALTURA SUPERIOR A 4M INCREMENTO DEL 20% SOBRE EL PRECIO DEL SISTEMA.';

  const [notasAdicionales, setNotasAdicionales] = useState(NOTAS_ESTANDAR);

  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [datosFactura, setDatosFactura] = useState<any>({
    numero: '', fecha: '', nombre: '', direccion: '', cp: '', cif: '', email: '', subtotal: 0,
  });

  useEffect(() => {
    async function initData() {
      const { data: clData } = await supabase.from('clientes').select('*').order('nombre');
      setClientes(clData || []);
      const { data: matData } = await supabase.from('materiales').select('*, proveedores(id, nombre)');
      setMisMateriales(matData || []);
    }
    initData();
  }, [supabase]);

  const actualizarPartida = (index: number, campo: string, valor: any) => {
    setPartidas(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], [campo]: valor };

      if (campo === 'descripcion') {
        const material = misMateriales.find(m =>
          m.nombre.toLowerCase() === valor.toLowerCase() ||
          m.nombre.toLowerCase().includes(valor.toLowerCase())
        );
        if (material) {
          const medicion = parseFloat(nuevas[index].medicion) || 0;
          nuevas[index].producto = material.nombre;
          nuevas[index].distribuidor = material.proveedores?.nombre || 'Sin proveedor';
          nuevas[index].proveedor_id = material.proveedor_id;
          nuevas[index].total_euros = (material.precio_venta * medicion).toFixed(2);
          toast.info(`Material detectado — ${material.proveedores?.nombre || 'Sin proveedor'}`, { duration: 2000 });
        }
      }

      if (campo === 'medicion' && nuevas[index].producto) {
        const material = misMateriales.find(m => m.nombre === nuevas[index].producto);
        if (material) {
          nuevas[index].total_euros = (material.precio_venta * (parseFloat(valor) || 0)).toFixed(2);
        }
      }
      return nuevas;
    });
  };

  const prepararFactura = async (presupuestoData: any) => {
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', presupuestoData.cliente_id).single();
    setDatosFactura({
      numero: `${new Date().getFullYear()}${Date.now().toString().slice(-4)}`,
      fecha: new Date().toISOString().split('T')[0],
      nombre: presupuestoData.cliente_nombre,
      direccion: cliente?.direccion || '',
      cp: cliente?.cp || '',
      cif: cliente?.nif_cif || '',
      email: cliente?.email || '',
      subtotal: presupuestoData.total,
      obra: presupuestoData.obra,
      partidas: presupuestoData.partidas,
      presupuesto_id: presupuestoData.id,
    });
    setShowFacturaModal(true);
  };

  const confirmarFactura = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('facturas').insert([{
        numero_factura: datosFactura.numero,
        fecha_emision: datosFactura.fecha,
        cliente_id: clienteSeleccionado?.id,
        cliente_nombre: datosFactura.nombre,
        cliente_direccion: datosFactura.direccion,
        cliente_cp: datosFactura.cp,
        cliente_cif: datosFactura.cif,
        cliente_email: datosFactura.email,
        obra: datosFactura.obra,
        partidas: datosFactura.partidas,
        subtotal: datosFactura.subtotal,
        importe_total: datosFactura.subtotal * 1.21,
        total_iva: datosFactura.subtotal * 0.21,
        presupuesto_origen: datosFactura.presupuesto_id,
        iban: 'ES18 3058 2237 9927 2001 4556',
      }]);
      if (error) throw error;
      toast.success('Factura registrada y guardada con éxito');
      setShowFacturaModal(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF FIEL A LA PLANTILLA ODEPLAC
  // ─────────────────────────────────────────────────────────────────────────────
  const generarPDFPresupuesto = (subtotal: number) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const fechaHoy = new Date().toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const AZUL        = [30, 61, 107]   as [number, number, number];
    const NEGRO       = [0, 0, 0]       as [number, number, number];
    const BLANCO      = [255, 255, 255] as [number, number, number];
    const GRIS_LINEA  = [200, 200, 200] as [number, number, number];
    const AMARILLO    = [255, 255, 153] as [number, number, number];
    const GRIS_FILA   = [248, 248, 248] as [number, number, number];

    const numPresupuesto = `260${Math.floor(10 + Math.random() * 89)}`;

    // ── 1. LOGO "O D E P L A C" ───────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(...AZUL);
    doc.text('O D E P L A C', 14, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEGRO);
    doc.text('CONSTRUCCIONES EN SECO S.L.', 14, 29);

    // ── 2. BANDA AZUL "PRESUPUESTO" + número ──────────────────────────────────
    doc.setFillColor(...AZUL);
    doc.rect(130, 12, 68, 9, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', 164, 18, { align: 'center' });

    doc.setTextColor(...AZUL);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(numPresupuesto, 195, 27, { align: 'right' });

    // ── 3. DATOS EMPRESA ──────────────────────────────────────────────────────
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Av. de la Albufera Nº 1, 7B / CP 46470 Massanassa VALENCIA', 14, 36);
    doc.text('Teléfono: 645735319', 14, 41);

    doc.text('E-mail: odeplac1@gmail.com', 120, 36);
    doc.text('CIF:B70725528', 120, 41);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 200);
    doc.text('www.odeplac.net', 162, 46);

    // ── 4. LÍNEA SEPARADORA ───────────────────────────────────────────────────
    doc.setDrawColor(...GRIS_LINEA);
    doc.setLineWidth(0.3);
    doc.line(14, 48, 196, 48);

    // ── 5. BLOQUE "PARA:" con banda azul ──────────────────────────────────────
    doc.setFillColor(...AZUL);
    doc.rect(14, 51, 100, 8, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`PARA: ${clienteSeleccionado?.nombre?.toUpperCase() || 'xxx'}`, 17, 56.5);

    // www.odeplac.net (derecha del bloque PARA)
    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('www.odeplac.net', 195, 56.5, { align: 'right' });

    // ── 6. QR placeholder ────────────────────────────────────────────────────
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(0.5);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(163, 50, 32, 32, 2, 2, 'FD');
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(5.5);
    doc.text('QR', 179, 65, { align: 'center' });
    doc.text('ODEPLAC', 179, 69, { align: 'center' });

    // ── 7. DATOS DEL CLIENTE ─────────────────────────────────────────────────
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let yC = 66;
    doc.text(`Telefono: ${clienteSeleccionado?.telefono || ''}`, 17, yC);
    doc.text(`Correo : ${clienteSeleccionado?.email || ''}`, 17, yC + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`CIF: ${clienteSeleccionado?.nif_cif || ''}`, 17, yC + 11);
    doc.text(`FECHA:  ${fechaHoy}`, 17, yC + 17);
    doc.text('FECHA VENCIMIENTO: 10 DÍAS', 17, yC + 23);

    // ── 8. TABLA DE PARTIDAS ─────────────────────────────────────────────────
    // Rellenamos hasta 9 filas mínimo (como la plantilla original)
    const filasBase = partidas.map(p => [
      p.descripcion?.toUpperCase() || '',
      p.medicion != null ? String(p.medicion) : '0',
      p.medicion && Number(p.total_euros) > 0
        ? (Number(p.total_euros) / Number(p.medicion)).toFixed(2)
        : '-',
      Number(p.total_euros) > 0
        ? Number(p.total_euros).toLocaleString('es-ES', { minimumFractionDigits: 2 })
        : '-',
    ]);

    while (filasBase.length < 9) {
      filasBase.push(['', '0', '-', '-']);
    }

    autoTable(doc, {
      startY: 86,
      head: [['DESCRIPCIÓN', 'Cant.', 'Precio unitario', 'Coste']],
      body: filasBase,
      theme: 'plain',
      headStyles: {
        fillColor: AZUL,
        textColor: BLANCO,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
      },
      columnStyles: {
        0: { cellWidth: 96 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 38, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
        lineColor: GRIS_LINEA,
        lineWidth: 0.2,
        textColor: NEGRO,
      },
      alternateRowStyles: { fillColor: GRIS_FILA },
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // ── 9. TOTALES con fondo amarillo (como la plantilla) ─────────────────────
    const subtotalFmt = '-';   // Subtotal sin cálculo visible (como la plantilla vacía)
    const ivaFmt      = '21,000%';
    const impuestoFmt = subtotal > 0
      ? (subtotal * 0.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })
      : '-';
    const totalFmt    = subtotal > 0
      ? (subtotal * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })
      : '-';

    const totalesY = finalY + 3;
    const totalesX = 120;
    const totalesW = 76;
    const rowH     = 8;

    const totalRows = [
      { label: 'SUBTOTAL', value: subtotal > 0 ? subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '-' },
      { label: 'IVA', value: ivaFmt },
      { label: 'Impuesto', value: impuestoFmt },
    ];

    let yT = totalesY;
    totalRows.forEach(row => {
      doc.setFillColor(...AMARILLO);
      doc.rect(totalesX, yT, totalesW, rowH, 'F');
      doc.setDrawColor(...GRIS_LINEA);
      doc.setLineWidth(0.2);
      doc.rect(totalesX, yT, totalesW, rowH, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...NEGRO);
      doc.text(row.label, totalesX + 4, yT + 5.5);
      doc.text(row.value, totalesX + totalesW - 4, yT + 5.5, { align: 'right' });
      yT += rowH;
    });

    // Fila TOTAL — banda azul gruesa
    const totalRowH = 11;
    doc.setFillColor(...AZUL);
    doc.rect(totalesX, yT, totalesW, totalRowH, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL', totalesX + 4, yT + 7.5);
    doc.text('€', totalesX + 28, yT + 7.5);
    doc.text(totalFmt, totalesX + totalesW - 4, yT + 7.5, { align: 'right' });

    // ── 10. NOTAS Y CONDICIONES ───────────────────────────────────────────────
    let yNotas = yT + totalRowH + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...NEGRO);

    const lineasNotas = notasAdicionales.split('\n').filter(n => n.trim());
    lineasNotas.forEach(nota => {
      const wrapped = doc.splitTextToSize(nota, 172);
      doc.text(wrapped, 14, yNotas);
      yNotas += wrapped.length * 3.8 + 0.8;
    });

    // Nota resaltada final (como en la plantilla)
    yNotas += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const notaFinal = 'NOTA: La razón por la que hay celdas resaltadas es porque falta información sobre los sistemas solicitados.';
    const wrappedFinal = doc.splitTextToSize(notaFinal, 172);
    doc.text(wrappedFinal, 14, yNotas);

    doc.save(`Presupuesto_${obraNombre.replace(/\s+/g, '_') || 'ODEPLAC'}.pdf`);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clienteSeleccionado) return toast.error('Selecciona cliente');
    setIsUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('clienteManual', clienteSeleccionado.nombre);
    try {
      const response = await fetch('/api/presupuestos', { method: 'POST', body: form });
      const data = await response.json();
      const partidasEnriquecidas = (data.partidas || []).map((p: any) => {
        const material = misMateriales.find(m =>
          m.nombre.toLowerCase().includes(p.descripcion?.toLowerCase().substring(0, 10))
        );
        return {
          ...p,
          distribuidor: material?.proveedores?.nombre || p.distribuidor || '—',
          proveedor_id: material?.proveedor_id || null,
        };
      });
      setPartidas(partidasEnriquecidas);
      setObraNombre(data.obra || 'Nueva Obra');
    } catch {
      toast.error('Error al procesar');
    } finally {
      setIsUploading(false);
    }
  };

  const finalizarYGuardar = async () => {
    if (!clienteSeleccionado || partidas.length === 0) return toast.error('Faltan datos');
    setIsSaving(true);
    try {
      const subtotal = partidas.reduce((acc, p) => acc + (Number(p.total_euros) || 0), 0);
      const { data: presuGuardado, error } = await supabase.from('presupuestos').insert([{
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        obra: obraNombre,
        partidas: partidas,
        total: subtotal,
        notas: notasAdicionales,
        estado: 'Pendiente',
      }]).select().single();

      if (error) throw error;
      generarPDFPresupuesto(subtotal);
      toast.success('Presupuesto guardado. Descargando PDF...');
      prepararFactura(presuGuardado);
      setPartidas([]);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans relative">

      <datalist id="datalist-materiales">
        {misMateriales.map((m, idx) => (
          <option key={idx} value={m.nombre}>{m.proveedores?.nombre} — {m.precio_venta}€/{m.unidad}</option>
        ))}
      </datalist>

      {/* MODAL FACTURA */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFacturaModal(false)} />
          <div className="relative bg-white text-zinc-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-2xl font-black uppercase italic text-[#1e3d6b]">Emitir Factura Oficial</h2>
              <button onClick={() => setShowFacturaModal(false)}><X className="text-zinc-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Factura Nº</label>
                <input className="w-full bg-zinc-100 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-orange-500" value={datosFactura.numero} onChange={e => setDatosFactura({ ...datosFactura, numero: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Fecha Emisión</label>
                <input type="date" className="w-full bg-zinc-100 p-4 rounded-2xl font-black outline-none" value={datosFactura.fecha} onChange={e => setDatosFactura({ ...datosFactura, fecha: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Datos del Cliente</label>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nombre" className="bg-zinc-100 p-3 rounded-xl text-sm" value={datosFactura.nombre} onChange={e => setDatosFactura({ ...datosFactura, nombre: e.target.value })} />
                  <input placeholder="CIF" className="bg-zinc-100 p-3 rounded-xl text-sm font-bold" value={datosFactura.cif} onChange={e => setDatosFactura({ ...datosFactura, cif: e.target.value })} />
                  <input placeholder="Dirección" className="bg-zinc-100 p-3 rounded-xl text-sm col-span-2" value={datosFactura.direccion} onChange={e => setDatosFactura({ ...datosFactura, direccion: e.target.value })} />
                </div>
              </div>
            </div>
            <button onClick={confirmarFactura} className="w-full bg-[#1e3d6b] text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl">
              {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar y Guardar Factura'}
            </button>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">
          Odeplac <span className="text-blue-400">Presupuestos</span>
        </h1>
        <div className="flex gap-4">
          <Link href="/dashboard/facturas" className="bg-orange-500/20 p-4 rounded-2xl flex items-center gap-2 border border-orange-500/20 hover:bg-orange-500/40 transition-all">
            <Receipt size={20} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Facturas</span>
          </Link>
          <Link href="/dashboard/historial" className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all">
            <History size={20} className="text-blue-300" />
            <span className="text-xs font-bold uppercase tracking-widest">Historial</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* PANEL IZQUIERDO */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <label className="text-[10px] font-black uppercase text-blue-300 block mb-3">1. Cliente</label>
            <select
              className="w-full bg-[#1e3d6b] border border-white/20 rounded-xl px-4 py-4 text-sm text-white font-bold mb-6"
              value={clienteSeleccionado?.id || ''}
              onChange={(e) => setClienteSeleccionado(clientes.find(c => c.id === e.target.value) || null)}
            >
              <option value="">-- SELECCIONAR --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id} className="text-black font-bold italic">{c.nombre.toUpperCase()}</option>
              ))}
            </select>
            <label className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-30' : 'hover:border-blue-400 border-white/10 bg-white/5'}`}>
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={isUploading || !clienteSeleccionado} />
              <Upload className="text-white/20 h-10 w-10 mb-2" />
              <span className="text-[10px] font-black uppercase text-center">Subir Medición PDF</span>
            </label>
          </div>
        </div>

        {/* PANEL DERECHO — PARTIDAS */}
        <div className="lg:col-span-3">
          {partidas.length > 0 ? (
            <div className="bg-white text-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200">
              <div className="bg-zinc-100 p-8 border-b flex justify-between items-center">
                <input
                  className="bg-transparent border-b-2 border-[#1e3d6b]/20 font-black text-2xl text-[#1e3d6b] outline-none w-2/3 uppercase italic"
                  value={obraNombre}
                  onChange={(e) => setObraNombre(e.target.value)}
                  placeholder="Nombre de la obra"
                />
                <button
                  onClick={() => setPartidas(prev => [...prev, { item: prev.length + 1, descripcion: '', medicion: 0, total_euros: 0, distribuidor: '' }])}
                  className="bg-[#1e3d6b] text-white px-5 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase"
                >
                  <Plus size={16} /> Añadir Línea
                </button>
              </div>

              <div className="p-8">
                <div className="space-y-4 mb-8">
                  {partidas.map((p, i) => (
                    <div key={i} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex gap-4 items-start group">
                      <span className="text-zinc-300 font-bold text-xs italic pt-1">{i + 1}</span>
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Descripción / Material</label>
                        <input
                          list="datalist-materiales"
                          className="w-full bg-transparent border-none outline-none text-sm font-bold text-zinc-700 p-1 uppercase"
                          value={p.descripcion}
                          onChange={(e) => actualizarPartida(i, 'descripcion', e.target.value)}
                          placeholder="ESCRIBE O SELECCIONA MATERIAL..."
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Truck size={11} className={p.distribuidor && p.distribuidor !== '—' ? 'text-blue-500' : 'text-zinc-300'} />
                          {p.distribuidor && p.distribuidor !== '—' ? (
                            <span className="text-[10px] text-blue-600 font-black uppercase italic tracking-tighter">
                              PROVEEDOR: {p.distribuidor}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-300 font-bold italic">Sin proveedor asignado</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="text-[8px] font-black text-zinc-400 uppercase">Medición</label>
                          <input type="number" className="w-24 bg-white border border-zinc-200 rounded-lg p-1.5 text-right font-black" value={p.medicion} onChange={(e) => actualizarPartida(i, 'medicion', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-zinc-400 uppercase">Coste (€)</label>
                          <input type="number" className="w-24 bg-white border border-blue-200 rounded-lg p-1.5 text-right font-black text-[#1e3d6b]" value={p.total_euros} onChange={(e) => actualizarPartida(i, 'total_euros', e.target.value)} />
                        </div>
                      </div>
                      <button onClick={() => setPartidas(prev => prev.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 pt-6">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Resumen por proveedor */}
                {partidas.some(p => p.distribuidor && p.distribuidor !== '—') && (
                  <div className="mb-8 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Truck size={14} /> Pedidos necesarios por proveedor
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from(new Set(
                        partidas.filter(p => p.distribuidor && p.distribuidor !== '—').map(p => p.distribuidor)
                      )).map(proveedor => {
                        const lineas = partidas.filter(p => p.distribuidor === proveedor);
                        const total = lineas.reduce((a, b) => a + (Number(b.total_euros) || 0), 0);
                        return (
                          <div key={proveedor as string} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                            <p className="font-black text-[#295693] text-sm uppercase italic">{proveedor as string}</p>
                            <p className="text-[10px] text-zinc-500 font-bold">{lineas.length} línea{lineas.length !== 1 ? 's' : ''}</p>
                            <p className="font-black text-emerald-600 text-lg">{total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div className="mb-10 text-zinc-600">
                  <label className="text-[10px] font-black text-blue-500 uppercase block mb-3 italic">Notas del Presupuesto</label>
                  <textarea
                    className="w-full bg-zinc-50 border-2 border-blue-100 rounded-2xl p-4 text-xs font-bold outline-none focus:border-[#1e3d6b]"
                    rows={6}
                    value={notasAdicionales}
                    onChange={(e) => setNotasAdicionales(e.target.value)}
                  />
                </div>

                {/* Totales y botón guardar */}
                <div className="bg-[#1e3d6b] p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                  <div className="text-white text-left">
                    <p className="text-[10px] font-black text-blue-200/50 uppercase mb-1">Subtotal (S/IVA)</p>
                    <p className="text-4xl font-black">
                      {partidas.reduce((a, b) => a + (Number(b.total_euros) || 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <button
                    onClick={finalizarYGuardar}
                    disabled={isSaving}
                    className="bg-white text-[#1e3d6b] px-10 py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar y Generar PDF</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[550px] border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center text-white/10 uppercase font-black text-center p-10">
              Selecciona un cliente y sube una medición para comenzar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
