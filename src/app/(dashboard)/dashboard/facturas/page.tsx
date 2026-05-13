'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, Search, Loader2, Undo2, Receipt, AlertCircle, Calendar, ChevronDown, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

function getTrimestre(fecha: string): string {
  const mes = new Date(fecha).getMonth() + 1;
  const año = new Date(fecha).getFullYear();
  const t = Math.ceil(mes / 3);
  return `${año}-T${t}`;
}

function trimestreLabel(key: string): string {
  const [año, t] = key.split('-');
  return `${t} · ${año}`;
}

export default function FacturasPage() {
  const supabase = createClient();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [trimestreFiltro, setTrimestreFiltro] = useState('todos');

  // ── Estados para el modal de abono / factura manual ──────────────
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [isSavingAbono, setIsSavingAbono] = useState(false);
  const [abonoData, setAbonoData] = useState({
    numero_factura: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    cliente_nombre: '',
    cliente_cif: '',
    cliente_direccion: '',
    obra: '',
    concepto: '',
    subtotal: '',
    tipo: 'Abono',
  });

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error("Error al cargar facturas");
    else setFacturas(data || []);
    setLoading(false);
  };

  const trimestresDisponibles = Array.from(
    new Set(facturas.map(f => getTrimestre(f.fecha_emision || f.created_at)))
  ).sort((a, b) => b.localeCompare(a));

  const facturasFiltradas = facturas.filter(f => {
    const matchTexto =
      f.cliente_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
      f.numero_factura?.toLowerCase().includes(filtro.toLowerCase());
    const matchTrimestre =
      trimestreFiltro === 'todos' ||
      getTrimestre(f.fecha_emision || f.created_at) === trimestreFiltro;
    return matchTexto && matchTrimestre;
  });

  const totalTrimestre = facturasFiltradas.reduce(
    (acc, f) => acc + (f.subtotal * 1.21 || 0), 0
  );

  // ── Guardar abono / factura manual ───────────────────────────────
  const guardarAbonoManual = async () => {
    if (!abonoData.numero_factura || !abonoData.cliente_nombre || !abonoData.subtotal) {
      toast.error('Rellena al menos: número de documento, cliente e importe');
      return;
    }
    setIsSavingAbono(true);
    try {
      const subtotalNum = parseFloat(abonoData.subtotal);
      const esAbono = abonoData.tipo === 'Abono';
      const importe = esAbono ? -Math.abs(subtotalNum) : Math.abs(subtotalNum);

      const { error } = await supabase.from('facturas').insert([{
        numero_factura: abonoData.numero_factura,
        fecha_emision: abonoData.fecha_emision,
        cliente_nombre: abonoData.cliente_nombre,
        cliente_cif: abonoData.cliente_cif || '',
        cliente_direccion: abonoData.cliente_direccion || '',
        obra: abonoData.obra || '',
        partidas: [{
          descripcion: abonoData.concepto || (esAbono ? 'ABONO PARCIAL' : 'FACTURA MANUAL'),
          medicion: 1,
          total_euros: Math.abs(subtotalNum),
        }],
        subtotal: importe,
        importe_total: importe * 1.21,
        total_iva: importe * 0.21,
        tipo: abonoData.tipo,
        notas: `${abonoData.tipo.toUpperCase()} — ${abonoData.concepto || 'Registro manual'}`,
      }]);

      if (error) throw error;
      toast.success(`${abonoData.tipo} registrado correctamente`);
      setShowAbonoModal(false);
      setAbonoData({
        numero_factura: '',
        fecha_emision: new Date().toISOString().split('T')[0],
        cliente_nombre: '',
        cliente_cif: '',
        cliente_direccion: '',
        obra: '',
        concepto: '',
        subtotal: '',
        tipo: 'Abono',
      });
      fetchFacturas();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSavingAbono(false);
    }
  };

  // ── Factura rectificativa ────────────────────────────────────────
  const crearRectificativa = async (original: any) => {
    const motivo = prompt("Indique el motivo de la rectificación:");
    if (!motivo) return;
    try {
      const { id, created_at, ...datosParaClonar } = original;
      const { error } = await supabase.from('facturas').insert([{
        ...datosParaClonar,
        numero_factura: `R-${original.numero_factura}`,
        fecha_emision: new Date().toISOString(),
        tipo: 'Rectificativa',
        factura_rectificada_id: id,
        subtotal: -Math.abs(original.subtotal),
        total_iva: -Math.abs(original.total_iva || (original.subtotal * 0.21)),
        importe_total: -Math.abs(original.importe_total || (original.subtotal * 1.21)),
        notas: `RECTIFICATIVA DE LA FACTURA ${original.numero_factura}. MOTIVO: ${motivo}`,
      }]);
      if (error) throw error;
      toast.success("Factura rectificativa creada con éxito");
      fetchFacturas();
    } catch (err: any) {
      toast.error("Error al rectificar: " + err.message);
    }
  };

  // ── Generar PDF de factura ────────────────────────────────────────
  const generarPDFFactura = (f: any) => {
    const doc = new jsPDF();

    doc.setTextColor(30, 61, 107);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(35);
    doc.text("O D E P L A C", 14, 25);
    doc.setFontSize(12);
    doc.text("CONSTRUCCIONES EN SECO S.L.", 14, 33);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("DIRECCION: Avenida de la Albufera Nº 1/7B", 14, 45);
    doc.text("Telefono: 645735319", 14, 50);
    doc.text("CP: 46470 Massanassa VALENCIA", 14, 55);
    doc.text("CIF: B70725528", 14, 60);
    doc.text("E-mail: odeplac1@gmail.com", 14, 65);

    doc.setDrawColor(30, 61, 107);
    doc.setLineWidth(0.5);

    const tipoColor = f.tipo === 'Rectificativa' || f.tipo === 'Abono'
      ? [220, 38, 38] as [number, number, number]
      : [30, 61, 107] as [number, number, number];

    if (f.tipo === 'Rectificativa' || f.tipo === 'Abono') {
      doc.setFillColor(...tipoColor);
      doc.rect(130, 40, 66, 20, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.rect(130, 40, 66, 20);
      doc.setTextColor(30, 61, 107);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const tipoLabel = f.tipo === 'Rectificativa' ? 'FACTURA RECTIF.' : f.tipo === 'Abono' ? 'ABONO Nº:' : 'FACTURA Nº:';
    doc.text(tipoLabel, 135, 48);
    doc.text(`${f.numero_factura}`, 192, 48, { align: 'right' });
    doc.text("FECHA:", 135, 55);
    doc.text(`${new Date(f.fecha_emision).toLocaleDateString('es-ES')}`, 192, 55, { align: 'right' });

    doc.setTextColor(30, 61, 107);
    doc.setFontSize(10);
    doc.text("DATOS DEL CLIENTE", 14, 80);
    doc.line(14, 81, 60, 81);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let y = 88;
    doc.text(`NOMBRE: ${f.cliente_nombre?.toUpperCase() || ''}`, 14, y);
    doc.text(`DIRECCION: ${f.cliente_direccion || ''}`, 14, y + 6);
    doc.text(`CIF: ${f.cliente_cif || ''}`, 14, y + 12);
    doc.text(`OBRA: ${f.obra?.toUpperCase() || ''}`, 14, y + 18);
    doc.text(`Email: ${f.cliente_email || ''}`, 14, y + 24);

    autoTable(doc, {
      startY: 125,
      head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Coste']],
      body: (f.partidas || []).map((p: any) => [
        p.descripcion?.toUpperCase() || '',
        p.medicion || 1,
        `${(Number(p.total_euros) / Number(p.medicion || 1) || 0).toFixed(2)}`,
        `${Number(p.total_euros).toFixed(2)} €`
      ]),
      theme: 'plain',
      headStyles: { textColor: [30, 61, 107], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      styles: { fontSize: 8.5 },
      columnStyles: { 0: { cellWidth: 100 }, 3: { halign: 'right', fontStyle: 'bold' } }
    });

    const finalTableY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", 135, finalTableY);
    doc.text(`${Number(f.subtotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 196, finalTableY, { align: 'right' });
    doc.text("Impuesto (21,00%)", 135, finalTableY + 8);
    doc.text(`${(Math.abs(f.subtotal) * 0.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 196, finalTableY + 8, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", 135, finalTableY + 18);
    doc.text(`${(f.subtotal * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 196, finalTableY + 18, { align: 'right' });

    if (f.tipo === 'Rectificativa' || f.tipo === 'Abono') {
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text(doc.splitTextToSize(f.notas || '', 180), 14, finalTableY + 35);
    }

    doc.setTextColor(30, 61, 107);
    doc.setFontSize(9);
    doc.text("INGRESO TRANSFERENCIA BANCARIA", 14, 275);
    doc.setFont("helvetica", "bold");
    doc.text("ES18 3058 2237 9927 2001 4556", 14, 281);

    doc.save(`Factura_${f.numero_factura}.pdf`);
  };

  // ── Exportar resumen trimestral ──────────────────────────────────
  const exportarResumenTrimestral = () => {
    if (trimestreFiltro === 'todos') return toast.error('Selecciona un trimestre para exportar');
    const doc = new jsPDF();
    doc.setTextColor(30, 61, 107);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ODEPLAC PRO", 14, 20);
    doc.setFontSize(12);
    doc.text(`Resumen de Facturación — ${trimestreLabel(trimestreFiltro)}`, 14, 30);
    autoTable(doc, {
      startY: 45,
      head: [['Nº Factura', 'Tipo', 'Fecha', 'Cliente', 'Total (IVA inc.)']],
      body: facturasFiltradas.map(f => [
        f.numero_factura,
        f.tipo || 'Factura',
        new Date(f.fecha_emision).toLocaleDateString('es-ES'),
        f.cliente_nombre,
        `${(f.subtotal * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 61, 107], textColor: [255, 255, 255] },
    });
    const fy = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`TOTAL ${trimestreLabel(trimestreFiltro)}: ${totalTrimestre.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 14, fy);
    doc.save(`Resumen_${trimestreFiltro}.pdf`);
    toast.success('Resumen trimestral exportado');
  };

  // ── Color de fila por tipo ────────────────────────────────────────
  const colorFila = (tipo: string) => {
    if (tipo === 'Rectificativa') return 'bg-red-500/5';
    if (tipo === 'Abono') return 'bg-amber-500/5';
    if (tipo === 'Pago Parcial') return 'bg-blue-500/5';
    return 'bg-white/5';
  };

  const colorImporte = (subtotal: number) => subtotal < 0 ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans">

      {/* ── MODAL ABONO / FACTURA MANUAL ─────────────────────────── */}
      {showAbonoModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic text-white">
                Nuevo <span className="text-orange-400">Documento</span>
              </h2>
              <button onClick={() => setShowAbonoModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={28} className="text-white/40 hover:text-white" />
              </button>
            </div>

            {/* Selector de tipo */}
            <div className="flex gap-3 mb-8">
              {['Abono', 'Factura Manual', 'Pago Parcial'].map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setAbonoData({ ...abonoData, tipo })}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    abonoData.tipo === tipo
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>

            {/* Aviso tipo Abono */}
            {abonoData.tipo === 'Abono' && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  ℹ️ Los abonos se registran con importe negativo y reducen el total facturado al cliente.
                </p>
              </div>
            )}
            {abonoData.tipo === 'Pago Parcial' && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  ℹ️ El pago parcial registra un cobro a cuenta sobre una obra en curso. Importe positivo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5 mb-6">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Nº Documento *</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  placeholder="Ej: A-2024-001"
                  value={abonoData.numero_factura}
                  onChange={e => setAbonoData({ ...abonoData, numero_factura: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Fecha Emisión</label>
                <input
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  value={abonoData.fecha_emision}
                  onChange={e => setAbonoData({ ...abonoData, fecha_emision: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Cliente / Empresa *</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  placeholder="Nombre del cliente"
                  value={abonoData.cliente_nombre}
                  onChange={e => setAbonoData({ ...abonoData, cliente_nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">CIF / NIF</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  placeholder="B12345678"
                  value={abonoData.cliente_cif}
                  onChange={e => setAbonoData({ ...abonoData, cliente_cif: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Dirección</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  placeholder="Dirección del cliente"
                  value={abonoData.cliente_direccion}
                  onChange={e => setAbonoData({ ...abonoData, cliente_direccion: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Obra / Referencia</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  placeholder="Nombre de la obra o referencia"
                  value={abonoData.obra}
                  onChange={e => setAbonoData({ ...abonoData, obra: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Concepto / Descripción</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
                  placeholder={
                    abonoData.tipo === 'Abono'
                      ? 'Ej: Abono 1er pago reforma cocina'
                      : abonoData.tipo === 'Pago Parcial'
                      ? 'Ej: Pago a cuenta — 50% reforma'
                      : 'Ej: Trabajos de tabiquería planta 1'
                  }
                  value={abonoData.concepto}
                  onChange={e => setAbonoData({ ...abonoData, concepto: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">Importe (sin IVA) *</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400 font-black text-xl">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white font-black text-2xl outline-none focus:border-orange-500 transition-all"
                    placeholder="0.00"
                    value={abonoData.subtotal}
                    onChange={e => setAbonoData({ ...abonoData, subtotal: e.target.value })}
                  />
                </div>
                {abonoData.subtotal && !isNaN(parseFloat(abonoData.subtotal)) && (
                  <div className="mt-3 flex gap-6 text-sm px-2">
                    <span className="text-white/40 font-bold">
                      IVA (21%): <span className="text-white">{(parseFloat(abonoData.subtotal) * 0.21).toFixed(2)} €</span>
                    </span>
                    <span className="text-orange-400 font-black">
                      TOTAL c/IVA: {(parseFloat(abonoData.subtotal) * 1.21).toFixed(2)} €
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={guardarAbonoManual}
              disabled={isSavingAbono}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSavingAbono ? <Loader2 className="animate-spin" /> : `Registrar ${abonoData.tipo}`}
            </button>
          </div>
        </div>
      )}

      {/* ── CABECERA ────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            Libro de <span className="text-orange-400">Facturas</span>
          </h1>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mt-2">
            Gestión de Facturación, Abonos y Pagos Parciales
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAbonoModal(true)}
            className="flex items-center gap-2 bg-orange-500/20 p-4 rounded-2xl border border-orange-500/20 hover:bg-orange-500/40 transition-all"
          >
            <Plus size={20} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">Nuevo Abono / Factura</span>
          </button>
          <Link href="/dashboard/presupuestos" className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all">
            <Undo2 size={20} className="text-blue-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">Volver</span>
          </Link>
        </div>
      </div>

      {/* ── FILTROS ──────────────────────────────────────────────────── */}
      <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md mb-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={20} />
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="BUSCAR CLIENTE O Nº FACTURA..."
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 pl-14 text-sm font-bold uppercase outline-none focus:border-orange-500 text-white placeholder:text-white/30"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
            <select
              value={trimestreFiltro}
              onChange={e => setTrimestreFiltro(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-2xl p-5 pl-14 pr-10 text-sm font-bold uppercase outline-none focus:border-orange-500 appearance-none text-white cursor-pointer min-w-[200px]"
            >
              <option value="todos">Todos los trimestres</option>
              {trimestresDisponibles.map(t => (
                <option key={t} value={t}>{trimestreLabel(t)}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
          </div>
          {trimestreFiltro !== 'todos' && (
            <button
              onClick={exportarResumenTrimestral}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
            >
              <Download size={16} /> Exportar PDF
            </button>
          )}
        </div>

        {trimestreFiltro !== 'todos' && (
          <div className="grid grid-cols-3 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-orange-400/70 mb-1">Trimestre</p>
              <p className="text-2xl font-black italic">{trimestreLabel(trimestreFiltro)}</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-[10px] font-black uppercase text-white/40 mb-1">Documentos</p>
              <p className="text-2xl font-black">{facturasFiltradas.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-emerald-400/70 mb-1">Total (IVA inc.)</p>
              <p className="text-2xl font-black text-emerald-400">
                {totalTrimestre.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── TABLA ────────────────────────────────────────────────────── */}
      <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin h-12 w-12 text-blue-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em] italic opacity-70">
                  <th className="px-6 pb-2">Nº Documento</th>
                  <th className="px-6 pb-2">Tipo</th>
                  <th className="px-6 pb-2">Fecha</th>
                  <th className="px-6 pb-2">Cliente / Obra</th>
                  <th className="px-6 pb-2 text-center">Trimestre</th>
                  <th className="px-6 pb-2 text-right">Total (c/IVA)</th>
                  <th className="px-6 pb-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((f) => (
                  <tr key={f.id} className={`${colorFila(f.tipo)} hover:bg-white/10 transition-all`}>
                    <td className={`px-6 py-6 rounded-l-2xl font-mono font-black text-lg ${
                      f.tipo === 'Rectificativa' || f.tipo === 'Abono' ? 'text-red-400' : 'text-orange-400'
                    }`}>
                      {f.numero_factura}
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${
                        f.tipo === 'Rectificativa' ? 'bg-red-500/20 text-red-400' :
                        f.tipo === 'Abono' ? 'bg-amber-500/20 text-amber-400' :
                        f.tipo === 'Pago Parcial' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {f.tipo || 'Factura'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-sm font-bold opacity-60">
                      {new Date(f.fecha_emision).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-6">
                      <div className="font-black uppercase text-sm tracking-tight">{f.cliente_nombre}</div>
                      <div className="text-[10px] text-blue-300 font-bold uppercase mt-1 italic opacity-50">{f.obra}</div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-[9px] font-black bg-white/10 px-3 py-1 rounded-lg uppercase tracking-widest text-orange-300">
                        {trimestreLabel(getTrimestre(f.fecha_emision || f.created_at))}
                      </span>
                    </td>
                    <td className={`px-6 py-6 text-right font-black text-xl ${colorImporte(f.subtotal)}`}>
                      {(f.subtotal * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-6 py-6 rounded-r-2xl text-center space-x-2">
                      <button
                        onClick={() => generarPDFFactura(f)}
                        className="bg-white text-blue-900 p-3 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                        title="Descargar PDF"
                      >
                        <Download size={16} />
                      </button>
                      {f.tipo !== 'Rectificativa' && f.tipo !== 'Abono' && (
                        <button
                          onClick={() => crearRectificativa(f)}
                          className="bg-red-500/20 text-red-400 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                          title="Crear Rectificativa"
                        >
                          <AlertCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {facturasFiltradas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-white/20 font-black uppercase italic tracking-widest">
                      Sin documentos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
