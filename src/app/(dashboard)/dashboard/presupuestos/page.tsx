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
  
  const NOTAS_ESTANDAR = ".-La gestión de residuos será a cargo de La propiedad.\n.-La retirada de escombros será por cuenta de la propiedad.\n.-La limpieza POR CUENTA DE LA CONSTRUCTORA. Criterio de medición UNE 92305.\n.-No se incluye apertura de huecos, refuerzos para mobiliario ni foseados.\n.-EN CASO DE ALTURA SUPERIOR A 4M INCREMENTO DEL 20% SOBRE EL PRECIO.";
  const [notasAdicionales, setNotasAdicionales] = useState(NOTAS_ESTANDAR);

  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [datosFactura, setDatosFactura] = useState<any>({ numero: '', fecha: '', nombre: '', direccion: '', cp: '', cif: '', email: '', subtotal: 0 });

  useEffect(() => {
    async function initData() {
      const { data: clData } = await supabase.from('clientes').select('*').order('nombre');
      setClientes(clData || []);
      // Cargamos materiales CON datos del proveedor
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
        // Buscamos por nombre exacto o parcial
        const material = misMateriales.find(m => 
          m.nombre.toLowerCase() === valor.toLowerCase() ||
          m.nombre.toLowerCase().includes(valor.toLowerCase())
        );
        if (material) {
          const medicion = parseFloat(nuevas[index].medicion) || 0;
          nuevas[index].producto = material.nombre;
          nuevas[index].distribuidor = material.proveedores?.nombre || "Sin proveedor";
          nuevas[index].proveedor_id = material.proveedor_id;
          nuevas[index].total_euros = (material.precio_venta * medicion).toFixed(2);
          toast.info(`Material detectado — Proveedor: ${material.proveedores?.nombre || 'desconocido'}`, { duration: 2000 });
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
      cif: cliente?.cif || '',
      email: cliente?.email || '',
      subtotal: presupuestoData.total,
      obra: presupuestoData.obra,
      partidas: presupuestoData.partidas,
      presupuesto_id: presupuestoData.id
    });
    setShowFacturaModal(true);
  };

  const confirmarFactura = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('facturas').insert([{
        numero_factura: datosFactura.numero,
        fecha_emision: datosFactura.fecha,
        cliente_id: clienteSeleccionado.id,
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
        iban: 'ES18 3058 2237 9927 2001 4556'
      }]);
      if (error) throw error;
      toast.success("Factura registrada y guardada con éxito");
      setShowFacturaModal(false);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // PDF con columna de proveedor
  const generarPDFPresupuesto = (subtotal: number) => {
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString('es-ES');
    
    doc.setTextColor(30, 61, 107);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.text("O D E P L A C", 14, 25);
    doc.setFontSize(14);
    doc.text("CONSTRUCCIONES EN SECO S.L.", 14, 34);

    doc.setFillColor(30, 61, 107);
    doc.rect(14, 42, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("PRESUPUESTO", 160, 47.5);

    doc.setTextColor(0); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text("Av. de la Albufera Nº 1, 7B / CP 46470 Massanassa VALENCIA", 14, 58);
    doc.text("Teléfono: 645735319", 14, 63);
    doc.text("E-mail: odeplac1@gmail.com", 110, 58);
    doc.text("CIF: B70725528", 110, 63);

    doc.setFillColor(30, 61, 107); doc.rect(14, 72, 182, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.text(`PARA  ${clienteSeleccionado.nombre.toUpperCase()}`, 18, 77.5);
    doc.text("www.odeplac.net", 160, 77.5);

    doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Telefono: ${clienteSeleccionado.telefono || ''}`, 14, 88);
    doc.text(`Correo : ${clienteSeleccionado.email || ''}`, 14, 94);
    doc.text(`OBRA : ${obraNombre.toUpperCase()}`, 14, 100);
    doc.setFont("helvetica", "bold");
    doc.text(`FECHA: ${fechaHoy}`, 14, 106);
    doc.text(`FECHA VENCIMIENTO: 10 DÍAS`, 14, 112);

    // Tabla con columna de PROVEEDOR
    autoTable(doc, {
      startY: 120,
      head: [['DESCRIPCIÓN', 'Proveedor', 'Cant.', 'P. Unit', 'Coste']],
      body: partidas.map(p => [
        p.descripcion.toUpperCase(),
        p.distribuidor || '—',
        p.medicion,
        (Number(p.total_euros)/Number(p.medicion) || 0).toFixed(2),
        `${p.total_euros} €`
      ]),
      theme: 'plain',
      headStyles: { textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200,200,200] },
      styles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: { 
        0: { cellWidth: 75 }, 
        1: { cellWidth: 40, textColor: [30, 61, 107], fontStyle: 'italic' },
        4: { halign: 'right', fontStyle: 'bold' } 
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("NOTA:", 14, finalY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(notasAdicionales, 110), 14, finalY + 7);

    doc.setFontSize(11); doc.text(`SUBTOTAL: ${subtotal.toLocaleString()} €`, 196, finalY + 10, { align: 'right' });
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL (21% IVA): ${(subtotal * 1.21).toLocaleString()} €`, 196, finalY + 22, { align: 'right' });

    doc.save(`Presupuesto_${obraNombre}.pdf`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clienteSeleccionado) return toast.error("Selecciona cliente");
    setIsUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('clienteManual', clienteSeleccionado.nombre); 
    try {
      const response = await fetch('/api/presupuestos', { method: 'POST', body: form });
      const data = await response.json();
      
      // Enriquecer partidas con info de proveedor
      const partidasEnriquecidas = (data.partidas || []).map((p: any) => {
        const material = misMateriales.find(m => 
          m.nombre.toLowerCase().includes(p.descripcion?.toLowerCase().substring(0, 10))
        );
        return {
          ...p,
          distribuidor: material?.proveedores?.nombre || p.distribuidor || '—',
          proveedor_id: material?.proveedor_id || null
        };
      });
      
      setPartidas(partidasEnriquecidas);
      setObraNombre(data.obra || 'Nueva Obra');
    } catch (error) { toast.error("Error al procesar"); }
    finally { setIsUploading(false); }
  };

  const finalizarYGuardar = async () => {
    if (!clienteSeleccionado || partidas.length === 0) return toast.error("Faltan datos");
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
        estado: 'Pendiente'
      }]).select().single();

      if (error) throw error;
      generarPDFPresupuesto(subtotal);
      toast.success("Presupuesto guardado.");
      prepararFactura(presuGuardado); 
      setPartidas([]);
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans relative">
      
      <datalist id="datalist-materiales">
        {misMateriales.map((m, idx) => (
          <option key={idx} value={m.nombre}>{m.proveedores?.nombre} — {m.precio_venta}€/{m.unidad}</option>
        ))}
      </datalist>

      {/* MODAL DE EDICIÓN DE FACTURA */}
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
                <input className="w-full bg-zinc-100 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-orange-500" value={datosFactura.numero} onChange={e => setDatosFactura({...datosFactura, numero: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Fecha Emisión</label>
                <input type="date" className="w-full bg-zinc-100 p-4 rounded-2xl font-black outline-none" value={datosFactura.fecha} onChange={e => setDatosFactura({...datosFactura, fecha: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Datos del Cliente</label>
                <div className="grid grid-cols-2 gap-4">
                   <input placeholder="Nombre" className="bg-zinc-100 p-3 rounded-xl text-sm" value={datosFactura.nombre} onChange={e => setDatosFactura({...datosFactura, nombre: e.target.value})} />
                   <input placeholder="CIF" className="bg-zinc-100 p-3 rounded-xl text-sm font-bold" value={datosFactura.cif} onChange={e => setDatosFactura({...datosFactura, cif: e.target.value})} />
                   <input placeholder="Dirección" className="bg-zinc-100 p-3 rounded-xl text-sm col-span-2" value={datosFactura.direccion} onChange={e => setDatosFactura({...datosFactura, direccion: e.target.value})} />
                </div>
              </div>
            </div>
            <button onClick={confirmarFactura} className="w-full bg-[#1e3d6b] text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl">
              {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Confirmar y Guardar Factura"}
            </button>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">Odeplac <span className="text-blue-400">Presupuestos</span></h1>
        <div className="flex gap-4">
            <Link href="/dashboard/facturas" className="bg-orange-500/20 p-4 rounded-2xl flex items-center gap-2 border border-orange-500/20 hover:bg-orange-500/40 transition-all"><Receipt size={20} className="text-orange-400" /> <span className="text-xs font-bold uppercase tracking-widest">Facturas</span></Link>
            <Link href="/dashboard/historial" className="bg-white/10 p-4 rounded-2xl flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all"><History size={20} className="text-blue-300" /> <span className="text-xs font-bold uppercase tracking-widest">Historial</span></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-xl backdrop-blur-md">
             <label className="text-[10px] font-black uppercase text-blue-300 block mb-3">1. Cliente</label>
             <select className="w-full bg-[#1e3d6b] border border-white/20 rounded-xl px-4 py-4 text-sm text-white font-bold mb-6" value={clienteSeleccionado?.id || ""} onChange={(e) => setClienteSeleccionado(clientes.find(c => c.id === e.target.value) || null)}>
                <option value="">-- SELECCIONAR --</option>
                {clientes.map(c => <option key={c.id} value={c.id} className="text-black font-bold italic">{c.nombre.toUpperCase()}</option>)}
             </select>
             <label className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-30' : 'hover:border-blue-400 border-white/10 bg-white/5'}`}>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={isUploading || !clienteSeleccionado} />
                <Upload className="text-white/20 h-10 w-10 mb-2" /><span className="text-[10px] font-black uppercase">Subir Medición</span>
             </label>
          </div>
        </div>

        <div className="lg:col-span-3">
          {partidas.length > 0 ? (
            <div className="bg-white text-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200">
              <div className="bg-zinc-100 p-8 border-b flex justify-between items-center">
                <input className="bg-transparent border-b-2 border-[#1e3d6b]/20 font-black text-2xl text-[#1e3d6b] outline-none w-2/3 uppercase italic" value={obraNombre} onChange={(e) => setObraNombre(e.target.value)} />
                <button onClick={() => setPartidas(prev => [...prev, {item: prev.length+1, descripcion:"", medicion:0, total_euros:0, distribuidor:''}])} className="bg-[#1e3d6b] text-white px-5 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase"><Plus size={16} /> Añadir Línea</button>
              </div>
              <div className="p-8">
                <div className="space-y-4 mb-8">
                  {partidas.map((p, i) => (
                    <div key={i} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex gap-4 items-start group">
                         <span className="text-zinc-300 font-bold text-xs italic">{i+1}</span>
                         <div className="flex-1">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Descripción / Material</label>
                            <input 
                              list="datalist-materiales" 
                              className="w-full bg-transparent border-none outline-none text-sm font-bold text-zinc-700 p-1 uppercase" 
                              value={p.descripcion} 
                              onChange={(e) => actualizarPartida(i, 'descripcion', e.target.value)} 
                              placeholder="ESCRIBE O SELECCIONA MATERIAL..."
                            />
                            {/* PROVEEDOR VISIBLE EN CADA LÍNEA */}
                            <div className="flex items-center gap-2 mt-2">
                              <Truck size={11} className={p.distribuidor && p.distribuidor !== '—' ? "text-blue-500" : "text-zinc-300"} />
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
                         <button onClick={() => setPartidas(prev => prev.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 pt-6"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>

                {/* Resumen de proveedores necesarios */}
                {partidas.some(p => p.distribuidor && p.distribuidor !== '—') && (
                  <div className="mb-8 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Truck size={14} /> Pedidos necesarios por proveedor
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from(new Set(partidas.filter(p => p.distribuidor && p.distribuidor !== '—').map(p => p.distribuidor))).map(proveedor => {
                        const lineasProveedor = partidas.filter(p => p.distribuidor === proveedor);
                        const totalProveedor = lineasProveedor.reduce((a, b) => a + (Number(b.total_euros) || 0), 0);
                        return (
                          <div key={proveedor as string} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                            <p className="font-black text-[#295693] text-sm uppercase italic">{proveedor as string}</p>
                            <p className="text-[10px] text-zinc-500 font-bold">{lineasProveedor.length} línea{lineasProveedor.length !== 1 ? 's' : ''}</p>
                            <p className="font-black text-emerald-600 text-lg">{totalProveedor.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-10 text-zinc-600">
                  <label className="text-[10px] font-black text-blue-500 uppercase block mb-3 italic">Notas del Presupuesto</label>
                  <textarea className="w-full bg-zinc-50 border-2 border-blue-100 rounded-2xl p-4 text-xs font-bold outline-none focus:border-[#1e3d6b]" rows={5} value={notasAdicionales} onChange={(e) => setNotasAdicionales(e.target.value)} />
                </div>
                <div className="bg-[#1e3d6b] p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                  <div className="text-white text-left"><p className="text-[10px] font-black text-blue-200/50 uppercase mb-1">Subtotal (S/IVA)</p><p className="text-4xl font-black">{partidas.reduce((a,b) => a + (Number(b.total_euros)||0), 0).toLocaleString('es-ES')} €</p></div>
                  <button onClick={finalizarYGuardar} disabled={isSaving} className="bg-white text-[#1e3d6b] px-10 py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl">
                    {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar y Generar PDF</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[550px] border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center text-white/10 uppercase font-black text-center">
               Selecciona un cliente y sube una medición para comenzar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}