'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, Search, Loader2, Undo2, Receipt, AlertCircle, Calendar, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

// Helper: obtener trimestre de una fecha
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

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) toast.error("Error ao carregar faturas");
    else setFacturas(data || []);
    setLoading(false);
  };

  // Obtener trimestres únicos disponibles
  const trimestresDisponibles = Array.from(
    new Set(facturas.map(f => getTrimestre(f.fecha_emision || f.created_at)))
  ).sort((a, b) => b.localeCompare(a));

  // Totales por trimestre seleccionado
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

  const crearRectificativa = async (original: any) => {
    const motivo = prompt("Indique o motivo da retificação:");
    if (!motivo) return;

    try {
      const { id, created_at, ...datosParaClonar } = original;
      const numRectificativa = `R-${original.numero_factura}`;
      
      const { error } = await supabase.from('facturas').insert([{
        ...datosParaClonar,
        numero_factura: numRectificativa,
        fecha_emision: new Date().toISOString(),
        tipo: 'Rectificativa',
        factura_rectificada_id: id,
        subtotal: -Math.abs(original.subtotal),
        total_iva: -Math.abs(original.total_iva || (original.subtotal * 0.21)),
        importe_total: -Math.abs(original.importe_total || (original.subtotal * 1.21)),
        notas: `RECTIFICATIVA DA FATURA ${original.numero_factura}. MOTIVO: ${motivo}`
      }]);

      if (error) throw error;
      toast.success("Factura retificativa criada com sucesso");
      fetchFacturas();
    } catch (err: any) {
      toast.error("Erro ao retificar: " + err.message);
    }
  };

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
    doc.text("E-mail: info@odeplac.es", 14, 65);

    doc.setDrawColor(30, 61, 107);
    doc.setLineWidth(0.5);
    if (f.tipo === 'Rectificativa') {
        doc.setFillColor(220, 38, 38);
        doc.rect(130, 40, 66, 20, 'F');
        doc.setTextColor(255);
    } else {
        doc.rect(130, 40, 66, 20);
        doc.setTextColor(30, 61, 107);
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(f.tipo === 'Rectificativa' ? "FACTURA RECTIF." : "FACTURA Nº:", 135, 48);
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
    doc.text(`C.P.: ${f.cliente_cp || ''}`, 14, y + 12);
    doc.text(`CIF: ${f.cliente_cif || ''}`, 14, y + 18);
    doc.text(`OBRA: ${f.obra?.toUpperCase() || ''}`, 14, y + 24);
    doc.text(`Email: ${f.cliente_email || ''}`, 14, y + 30);

    autoTable(doc, {
      startY: 125,
      head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Coste']],
      body: (f.partidas || []).map((p: any) => [
        p.descripcion.toUpperCase(),
        p.medicion,
        `${(Number(p.total_euros)/Number(p.medicion) || 0).toFixed(2)}`,
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
    doc.text(`${Number(f.subtotal).toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, 196, finalTableY, { align: 'right' });
    doc.text("Impuesto (21,00%)", 135, finalTableY + 8);
    doc.text(`${(f.subtotal * 0.21).toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, 196, finalTableY + 8, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", 135, finalTableY + 18);
    doc.text(`${(f.subtotal * 1.21).toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, 196, finalTableY + 18, { align: 'right' });

    if (f.tipo === 'Rectificativa') {
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

  // Exportar resumen trimestral en PDF
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
      head: [['Nº Factura', 'Fecha', 'Cliente', 'Total (IVA inc.)']],
      body: facturasFiltradas.map(f => [
        f.numero_factura,
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

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Libro de <span className="text-orange-400">Facturas</span></h1>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mt-2">Gestión de Facturación y Abonos</p>
        </div>
        <Link href="/dashboard/presupuestos" className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all">
           <Undo2 size={20} className="text-blue-300" /> <span className="text-xs font-bold uppercase tracking-widest text-white">Volver</span>
        </Link>
      </div>

      {/* FILTROS */}
      <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md mb-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={20} />
            <input 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="BUSCAR CLIENTE O Nº FACTURA..."
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 pl-14 text-sm font-bold uppercase outline-none focus:border-orange-500"
            />
          </div>

          {/* Selector trimestral */}
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

          {/* Botón exportar trimestre */}
          {trimestreFiltro !== 'todos' && (
            <button
              onClick={exportarResumenTrimestral}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
            >
              <Download size={16} /> Exportar PDF
            </button>
          )}
        </div>

        {/* Resumen del trimestre seleccionado */}
        {trimestreFiltro !== 'todos' && (
          <div className="grid grid-cols-3 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-orange-400/70 mb-1">Trimestre</p>
              <p className="text-2xl font-black italic">{trimestreLabel(trimestreFiltro)}</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-[10px] font-black uppercase text-white/40 mb-1">Facturas</p>
              <p className="text-2xl font-black">{facturasFiltradas.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-emerald-400/70 mb-1">Total (IVA inc.)</p>
              <p className="text-2xl font-black text-emerald-400">{totalTrimestre.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
            </div>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-12 w-12 text-blue-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em] italic opacity-70">
                  <th className="px-6 pb-2">Nº Factura</th>
                  <th className="px-6 pb-2">Fecha</th>
                  <th className="px-6 pb-2">Cliente / Obra</th>
                  <th className="px-6 pb-2 text-center">Trimestre</th>
                  <th className="px-6 pb-2 text-right">Total</th>
                  <th className="px-6 pb-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((f) => (
                  <tr key={f.id} className={`${f.tipo === 'Rectificativa' ? 'bg-red-500/5' : 'bg-white/5'} hover:bg-white/10 transition-all`}>
                    <td className={`px-6 py-6 rounded-l-2xl font-mono font-black text-lg ${f.tipo === 'Rectificativa' ? 'text-red-400' : 'text-orange-400'}`}>
                      {f.numero_factura}
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
                    <td className={`px-6 py-6 text-right font-black text-xl ${f.subtotal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {(f.subtotal * 1.21).toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                    </td>
                    <td className="px-6 py-6 rounded-r-2xl text-center space-x-2">
                      <button 
                        onClick={() => generarPDFFactura(f)}
                        className="bg-white text-blue-900 p-3 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                      >
                        <Download size={16} />
                      </button>
                      {f.tipo !== 'Rectificativa' && (
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
                    <td colSpan={6} className="text-center py-16 text-white/20 font-black uppercase italic tracking-widest">
                      Sin facturas para los filtros seleccionados
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