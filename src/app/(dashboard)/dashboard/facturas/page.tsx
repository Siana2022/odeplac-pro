'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, Search, Loader2, Undo2, Receipt, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

export default function FacturasPage() {
  const supabase = createClient();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) toast.error("Erro ao carregar faturas");
    else setFacturas(data || []);
    setLoading(false);
  };

  // --- FUNÇÃO PARA CREAR FACTURA RECTIFICATIVA (ABONO) ---
  const crearRectificativa = async (original: any) => {
    const motivo = prompt("Indique o motivo da retificação (ex: Erro de medição, abono total...):");
    if (!motivo) return;

    try {
      // Importante: Removemos ID e created_at para que a base de dados crie um novo registo
      const { id, created_at, ...datosParaClonar } = original;

      const numRectificativa = `R-${original.numero_factura}`;
      
      const { error } = await supabase.from('facturas').insert([{
        ...datosParaClonar,
        numero_factura: numRectificativa,
        fecha_emision: new Date().toISOString(),
        tipo: 'Rectificativa',
        factura_rectificada_id: id,
        // Invertemos os valores para negativo
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

  // --- GENERADOR DE PDF (ESTILO PLANTILLA ODEPLAC) ---
  const generarPDFFactura = (f: any) => {
    const doc = new jsPDF();
    
    // CABEÇALHO ODEPLAC
    doc.setTextColor(30, 61, 107);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(35);
    doc.text("O D E P L A C", 14, 25);
    
    doc.setFontSize(12);
    doc.text("CONSTRUCCIONES EN SECO S.L.", 14, 33);

    // DADOS FISCAIS ODEPLAC
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("DIRECCION: Avenida de la Albufera Nº 1/7B", 14, 45);
    doc.text("Telefono: 645735319", 14, 50);
    doc.text("CP: 46470 Massanassa VALENCIA", 14, 55);
    doc.text("CIF: B70725528", 14, 60);
    doc.text("E-mail: info@odeplac.es", 14, 65);

    // QUADRO NÚMERO E DATA (DIREITA)
    doc.setDrawColor(30, 61, 107);
    doc.setLineWidth(0.5);
    if (f.tipo === 'Rectificativa') {
        doc.setFillColor(220, 38, 38); // Vermelho para retificativas
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

    // DADOS DO CLIENTE
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

    // TABELA DE ITENS
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

    // TOTAIS
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", 135, finalTableY);
    doc.text(`${Number(f.subtotal).toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, 196, finalTableY, { align: 'right' });
    
    doc.text("Impuesto (21,00%)", 135, finalTableY + 8);
    doc.text(`${(f.subtotal * 0.21).toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, 196, finalTableY + 8, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", 135, finalTableY + 18);
    doc.text(`${(f.subtotal * 1.21).toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, 196, finalTableY + 18, { align: 'right' });

    // NOTAS DE RETIFICAÇÃO
    if (f.tipo === 'Rectificativa') {
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 38);
        doc.text(doc.splitTextToSize(f.notas || '', 180), 14, finalTableY + 35);
    }

    // RODAPÉ: CONTA BANCÁRIA
    doc.setTextColor(30, 61, 107);
    doc.setFontSize(9);
    doc.text("INGRESO TRANSFERENCIA BANCARIA", 14, 275);
    doc.setFont("helvetica", "bold");
    doc.text("ES18 3058 2237 9927 2001 4556", 14, 281);

    doc.save(`Factura_${f.numero_factura}.pdf`);
  };

  const facturasFiltradas = facturas.filter(f => 
    f.cliente_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    f.numero_factura?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Libro de <span className="text-orange-400">Facturas</span></h1>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mt-2">Gestão de Faturação e Abonos</p>
        </div>
        <Link href="/dashboard/presupuestos" className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all">
           <Undo2 size={20} className="text-blue-300" /> <span className="text-xs font-bold uppercase tracking-widest text-white">Voltar</span>
        </Link>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
        <div className="relative mb-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={20} />
          <input 
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="BUSCAR CLIENTE OU Nº FATURA..."
            className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 pl-14 text-sm font-bold uppercase outline-none focus:border-orange-500"
          />
        </div>

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
                          title="Criar Retificativa"
                        >
                          <AlertCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}