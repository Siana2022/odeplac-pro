'use client'

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, History, Save, Truck, Plus, Trash2, Download, Receipt, X, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface LineaOrden {
  materialNombre: string;
  cantidad: number;
  precioCoste: number;
  subtotal: number;
}
interface OrdenProveedor {
  proveedor: string;
  lineas: LineaOrden[];
  totalCoste: number;
}

export default function GestionPresupuestos() {
  const supabase = createClient();

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [misMateriales, setMisMateriales] = useState<any[]>([]);
  const [sistemasMaestros, setSistemasMaestros] = useState<any[]>([]);
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
      // Cargamos sistemas maestros con su composición completa
      const { data: sisData } = await supabase
        .from('sistemas_maestros')
        .select('*, sistema_composicion(*, materiales(*, proveedores(id, nombre)))');
      setSistemasMaestros(sisData || []);
    }
    initData();
  }, [supabase]);

  // ─── Motor de resolución: descripción → materiales + proveedores ──────────
  const resolverMaterialesDePartida = (descripcion: string, medicion: number): OrdenProveedor[] => {
    const desc = descripcion.toLowerCase().trim();

    // PASO 1: Buscar en sistemas maestros por palabras clave
    let sistemaMatch: any = null;
    let mejorScore = 0;

    for (const sistema of sistemasMaestros) {
      const palabras: string[] = sistema.palabras_clave || [];
      const score = palabras.filter((p: string) => desc.includes(p.toLowerCase())).length;
      if (score > mejorScore) {
        mejorScore = score;
        sistemaMatch = sistema;
      }
    }

    if (sistemaMatch && mejorScore > 0 && sistemaMatch.sistema_composicion?.length > 0) {
      // Tenemos match con Inteligencia — usar la receta
      const porProveedor: Record<string, OrdenProveedor> = {};

      for (const comp of sistemaMatch.sistema_composicion) {
        const mat = Array.isArray(comp.materiales) ? comp.materiales[0] : comp.materiales;
        if (!mat) continue;

        const provNombre = mat.proveedores?.nombre || 'Sin proveedor';
        const cantidadTotal = medicion * (comp.cantidad_por_m2 || 1);
        const precioCoste = mat.precio_coste || 0;
        const subtotalLinea = cantidadTotal * precioCoste;

        if (!porProveedor[provNombre]) {
          porProveedor[provNombre] = { proveedor: provNombre, lineas: [], totalCoste: 0 };
        }
        porProveedor[provNombre].lineas.push({
          materialNombre: mat.nombre,
          cantidad: parseFloat(cantidadTotal.toFixed(2)),
          precioCoste,
          subtotal: parseFloat(subtotalLinea.toFixed(2)),
        });
        porProveedor[provNombre].totalCoste += subtotalLinea;
      }

      return Object.values(porProveedor);
    }

    // PASO 2: No hay match en Inteligencia — buscar material más barato en catálogo
    const palabrasDesc = desc.split(' ').filter(p => p.length > 3);
    const candidatos = misMateriales.filter(m => {
      const nombreMat = m.nombre.toLowerCase();
      return palabrasDesc.some(p => nombreMat.includes(p));
    });

    if (candidatos.length > 0) {
      // Ordenar por precio de coste y coger el más barato
      const masBarato = candidatos.sort((a, b) => (a.precio_coste || 0) - (b.precio_coste || 0))[0];
      const provNombre = masBarato.proveedores?.nombre || 'Sin proveedor';
      const subtotalLinea = medicion * (masBarato.precio_coste || 0);

      return [{
        proveedor: provNombre,
        lineas: [{
          materialNombre: masBarato.nombre,
          cantidad: medicion,
          precioCoste: masBarato.precio_coste || 0,
          subtotal: parseFloat(subtotalLinea.toFixed(2)),
        }],
        totalCoste: parseFloat(subtotalLinea.toFixed(2)),
      }];
    }

    return [];
  };

  // ─── Calcular orden de compra completa para todas las partidas ────────────
  const calcularOrdenCompra = (): OrdenProveedor[] => {
    const consolidado: Record<string, OrdenProveedor> = {};

    for (const partida of partidas) {
      if (!partida.descripcion || !partida.medicion) continue;
      const ordenes = resolverMaterialesDePartida(partida.descripcion, parseFloat(partida.medicion) || 0);

      for (const orden of ordenes) {
        if (!consolidado[orden.proveedor]) {
          consolidado[orden.proveedor] = { proveedor: orden.proveedor, lineas: [], totalCoste: 0 };
        }
        consolidado[orden.proveedor].lineas.push(...orden.lineas);
        consolidado[orden.proveedor].totalCoste += orden.totalCoste;
      }
    }

    return Object.values(consolidado);
  };

  // ─── PDF CLIENTE (plantilla ODEPLAC) ─────────────────────────────────────
  const generarPDFCliente = (subtotal: number) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const AZUL       = [30, 61, 107]   as [number, number, number];
    const NEGRO      = [0, 0, 0]       as [number, number, number];
    const BLANCO     = [255, 255, 255] as [number, number, number];
    const GRIS_LINEA = [200, 200, 200] as [number, number, number];
    const AMARILLO   = [255, 255, 153] as [number, number, number];
    const GRIS_FILA  = [248, 248, 248] as [number, number, number];

    const numPresupuesto = `260${Math.floor(10 + Math.random() * 89)}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(...AZUL);
    doc.text('O D E P L A C', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(...NEGRO);
    doc.text('CONSTRUCCIONES EN SECO S.L.', 14, 29);

    doc.setFillColor(...AZUL);
    doc.rect(130, 12, 68, 9, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.text('PRESUPUESTO', 164, 18, { align: 'center' });
    doc.setTextColor(...AZUL);
    doc.setFontSize(8.5);
    doc.text(numPresupuesto, 195, 27, { align: 'right' });

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

    doc.setDrawColor(...GRIS_LINEA);
    doc.setLineWidth(0.3);
    doc.line(14, 48, 196, 48);

    doc.setFillColor(...AZUL);
    doc.rect(14, 51, 100, 8, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`PARA: ${clienteSeleccionado?.nombre?.toUpperCase() || 'xxx'}`, 17, 56.5);
    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('www.odeplac.net', 195, 56.5, { align: 'right' });

    doc.setDrawColor(...AZUL);
    doc.setLineWidth(0.5);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(163, 50, 32, 32, 2, 2, 'FD');
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(5.5);
    doc.text('QR ODEPLAC', 179, 67, { align: 'center' });

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Telefono: ${clienteSeleccionado?.telefono || ''}`, 17, 66);
    doc.text(`Correo : ${clienteSeleccionado?.email || ''}`, 17, 71);
    doc.setFont('helvetica', 'bold');
    doc.text(`CIF: ${clienteSeleccionado?.nif_cif || ''}`, 17, 77);
    doc.text(`FECHA:  ${fechaHoy}`, 17, 83);
    doc.text('FECHA VENCIMIENTO: 10 DÍAS', 17, 89);

    const filasBase = partidas.map(p => [
      p.descripcion?.toUpperCase() || '',
      String(p.medicion || 0),
      p.medicion && Number(p.total_euros) > 0 ? (Number(p.total_euros) / Number(p.medicion)).toFixed(2) : '-',
      Number(p.total_euros) > 0 ? Number(p.total_euros).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '-',
    ]);
    while (filasBase.length < 9) filasBase.push(['', '0', '-', '-']);

    autoTable(doc, {
      startY: 95,
      head: [['DESCRIPCIÓN', 'Cant.', 'Precio unitario', 'Coste']],
      body: filasBase,
      theme: 'plain',
      headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
      columnStyles: {
        0: { cellWidth: 96 }, 1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 38, halign: 'right' }, 3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
      styles: { fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 }, lineColor: GRIS_LINEA, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: GRIS_FILA },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const totalRows = [
      { label: 'SUBTOTAL', value: subtotal > 0 ? subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '-' },
      { label: 'IVA', value: '21,000%' },
      { label: 'Impuesto', value: subtotal > 0 ? (subtotal * 0.21).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '-' },
    ];

    let yT = finalY + 3;
    totalRows.forEach(row => {
      doc.setFillColor(...AMARILLO);
      doc.rect(120, yT, 76, 8, 'F');
      doc.setDrawColor(...GRIS_LINEA); doc.setLineWidth(0.2);
      doc.rect(120, yT, 76, 8, 'S');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...NEGRO);
      doc.text(row.label, 124, yT + 5.5);
      doc.text(row.value, 194, yT + 5.5, { align: 'right' });
      yT += 8;
    });

    doc.setFillColor(...AZUL);
    doc.rect(120, yT, 76, 11, 'F');
    doc.setTextColor(...BLANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('TOTAL', 124, yT + 7.5);
    doc.text('€', 148, yT + 7.5);
    doc.text(subtotal > 0 ? (subtotal * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : '-', 194, yT + 7.5, { align: 'right' });

    let yNotas = yT + 20;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...NEGRO);
    notasAdicionales.split('\n').filter(n => n.trim()).forEach(nota => {
      const wrapped = doc.splitTextToSize(nota, 172);
      doc.text(wrapped, 14, yNotas);
      yNotas += wrapped.length * 3.8 + 0.8;
    });

    doc.save(`Presupuesto_Cliente_${obraNombre.replace(/\s+/g, '_')}.pdf`);
  };

  // ─── PDF INTERNO — Orden de Compra ───────────────────────────────────────
  const generarPDFInterno = (subtotalCliente: number) => {
    const ordenCompra = calcularOrdenCompra();
    const costoTotalMateriales = ordenCompra.reduce((a, b) => a + b.totalCoste, 0);
    const margenEuros = subtotalCliente - costoTotalMateriales;
    const margenPct = subtotalCliente > 0 ? ((margenEuros / subtotalCliente) * 100).toFixed(1) : '0';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const AZUL      = [30, 61, 107]   as [number, number, number];
    const NEGRO     = [0, 0, 0]       as [number, number, number];
    const BLANCO    = [255, 255, 255] as [number, number, number];
    const GRIS      = [200, 200, 200] as [number, number, number];
    const VERDE     = [22, 163, 74]   as [number, number, number];
    const VERDE_CLR = [240, 253, 244] as [number, number, number];
    const ROJO      = [220, 38, 38]   as [number, number, number];

    // Cabecera interna
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ODEPLAC PRO', 14, 14);
    doc.setFontSize(10);
    doc.text('ORDEN DE COMPRA INTERNA — USO EXCLUSIVO ODEPLAC', 14, 21);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Obra: ${obraNombre.toUpperCase()}   |   Cliente: ${clienteSeleccionado?.nombre?.toUpperCase() || ''}   |   Fecha: ${fechaHoy}`, 14, 28);

    // Aviso confidencial
    doc.setFillColor(255, 237, 213);
    doc.rect(14, 36, 182, 8, 'F');
    doc.setTextColor(154, 52, 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ DOCUMENTO CONFIDENCIAL — NO ENTREGAR AL CLIENTE', 105, 41.5, { align: 'center' });

    let yPos = 50;

    // Tabla por proveedor
    if (ordenCompra.length === 0) {
      doc.setTextColor(...NEGRO);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('No se encontraron materiales asociados a las partidas de este presupuesto.', 14, yPos);
      yPos += 12;
    }

    for (const orden of ordenCompra) {
      // Cabecera proveedor
      doc.setFillColor(...AZUL);
      doc.rect(14, yPos, 182, 9, 'F');
      doc.setTextColor(...BLANCO);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(orden.proveedor.toUpperCase(), 18, yPos + 6.2);
      yPos += 9;

      autoTable(doc, {
        startY: yPos,
        head: [['Material', 'Cantidad', 'P. Coste', 'Subtotal']],
        body: orden.lineas.map(l => [
          l.materialNombre,
          l.cantidad.toLocaleString('es-ES'),
          `${l.precioCoste.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
          `${l.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: AZUL, fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 29, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY;

      // Total proveedor
      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPos, 182, 8, 'F');
      doc.setTextColor(...AZUL);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`TOTAL ${orden.proveedor.toUpperCase()}:`, 18, yPos + 5.5);
      doc.text(`${orden.totalCoste.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 194, yPos + 5.5, { align: 'right' });
      yPos += 14;

      if (yPos > 250) { doc.addPage(); yPos = 20; }
    }

    // ── Resumen financiero final ──
    yPos += 4;
    doc.setDrawColor(...GRIS);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, 196, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NEGRO);
    doc.text('RESUMEN FINANCIERO DE LA OBRA', 14, yPos);
    yPos += 8;

    const resumenRows = [
      { label: 'Precio ofertado al cliente (s/IVA)', value: `${subtotalCliente.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, color: AZUL },
      { label: 'Coste total de materiales', value: `${costoTotalMateriales.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, color: NEGRO },
      { label: `Margen estimado (${margenPct}%)`, value: `${margenEuros.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, color: margenEuros >= 0 ? VERDE : ROJO },
    ];

    resumenRows.forEach(row => {
      doc.setFillColor(margenEuros >= 0 || row.label.includes('Precio') || row.label.includes('Coste') ? 248 : 254, 248, 248);
      if (row.label.includes('Margen')) {
        doc.setFillColor(...(margenEuros >= 0 ? VERDE_CLR : [254, 242, 242] as [number, number, number]));
      }
      doc.rect(14, yPos, 182, 10, 'F');
      doc.setTextColor(...row.color);
      doc.setFont('helvetica', row.label.includes('Margen') ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.text(row.label, 18, yPos + 7);
      doc.setFont('helvetica', 'bold');
      doc.text(row.value, 194, yPos + 7, { align: 'right' });
      yPos += 11;
    });

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('* El margen no incluye mano de obra ni gastos indirectos.', 14, yPos + 6);

    doc.save(`OrdenCompra_Interna_${obraNombre.replace(/\s+/g, '_')}.pdf`);
  };

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
      toast.success('Factura registrada con éxito');
      setShowFacturaModal(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
      setPartidas(data.partidas || []);
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
      const subtotal = partidas.reduce((a, p) => a + (Number(p.total_euros) || 0), 0);
      const { data: presuGuardado, error } = await supabase.from('presupuestos').insert([{
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        obra: obraNombre,
        partidas,
        total: subtotal,
        notas: notasAdicionales,
        estado: 'Pendiente',
      }]).select().single();

      if (error) throw error;

      // Generar ambos PDFs
      generarPDFCliente(subtotal);
      setTimeout(() => generarPDFInterno(subtotal), 800);

      toast.success('Presupuesto guardado. Descargando 2 PDFs...');
      prepararFactura(presuGuardado);
      setPartidas([]);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Preview de la orden de compra en pantalla
  const ordenCompraPreview = partidas.length > 0 ? calcularOrdenCompra() : [];
  const costoTotal = ordenCompraPreview.reduce((a, b) => a + b.totalCoste, 0);
  const subtotalActual = partidas.reduce((a, p) => a + (Number(p.total_euros) || 0), 0);
  const margenActual = subtotalActual - costoTotal;

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
                <input className="w-full bg-zinc-100 p-4 rounded-2xl font-black outline-none" value={datosFactura.numero} onChange={e => setDatosFactura({ ...datosFactura, numero: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Fecha Emisión</label>
                <input type="date" className="w-full bg-zinc-100 p-4 rounded-2xl font-black outline-none" value={datosFactura.fecha} onChange={e => setDatosFactura({ ...datosFactura, fecha: e.target.value })} />
              </div>
              <div className="col-span-2">
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
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <label className="text-[10px] font-black uppercase text-blue-300 block mb-3">1. Cliente</label>
            <select
              className="w-full bg-[#1e3d6b] border border-white/20 rounded-xl px-4 py-4 text-sm text-white font-bold mb-6"
              value={clienteSeleccionado?.id || ''}
              onChange={(e) => setClienteSeleccionado(clientes.find(c => c.id === e.target.value) || null)}
            >
              <option value="">-- SELECCIONAR --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id} className="text-black">{c.nombre.toUpperCase()}</option>
              ))}
            </select>
            <label className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-30' : 'hover:border-blue-400 border-white/10 bg-white/5'}`}>
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={isUploading || !clienteSeleccionado} />
              <Upload className="text-white/20 h-8 w-8 mb-2" />
              <span className="text-[10px] font-black uppercase text-center">Subir Medición PDF</span>
            </label>
          </div>

          {/* PREVIEW ORDEN DE COMPRA */}
          {ordenCompraPreview.length > 0 && (
            <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <p className="text-[10px] font-black uppercase text-blue-300 flex items-center gap-2">
                <Truck size={14} /> Vista previa orden de compra
              </p>
              {ordenCompraPreview.map(op => (
                <div key={op.proveedor} className="bg-white/5 rounded-2xl p-4">
                  <p className="font-black text-white text-xs uppercase">{op.proveedor}</p>
                  <p className="text-[10px] text-white/50">{op.lineas.length} material{op.lineas.length !== 1 ? 'es' : ''}</p>
                  <p className="font-black text-emerald-400">{op.totalCoste.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Coste materiales</span>
                  <span className="font-black text-white">{costoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Precio cliente</span>
                  <span className="font-black text-white">{subtotalActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-white/10">
                  <span className="font-black text-white/70 flex items-center gap-1"><TrendingUp size={12} /> Margen</span>
                  <span className={`font-black text-lg ${margenActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {margenActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO */}
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
                    <div key={i} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex gap-4 items-start">
                      <span className="text-zinc-300 font-bold text-xs italic pt-1">{i + 1}</span>
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Descripción / Sistema</label>
                        <input
                          list="datalist-materiales"
                          className="w-full bg-transparent border-none outline-none text-sm font-bold text-zinc-700 p-1 uppercase"
                          value={p.descripcion}
                          onChange={(e) => actualizarPartida(i, 'descripcion', e.target.value)}
                          placeholder="ESCRIBE O SELECCIONA MATERIAL..."
                        />
                        {p.descripcion && (
                          <div className="flex items-center gap-2 mt-1">
                            {(() => {
                              const ordenes = resolverMaterialesDePartida(p.descripcion, parseFloat(p.medicion) || 1);
                              if (ordenes.length > 0) {
                                return ordenes.map(o => (
                                  <span key={o.proveedor} className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase">
                                    {o.proveedor}
                                  </span>
                                ));
                              }
                              return <span className="text-[9px] text-zinc-300 italic">Sin proveedor asignado</span>;
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="text-[8px] font-black text-zinc-400 uppercase">Medición</label>
                          <input type="number" className="w-24 bg-white border border-zinc-200 rounded-lg p-1.5 text-right font-black" value={p.medicion} onChange={(e) => actualizarPartida(i, 'medicion', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-zinc-400 uppercase">Precio cliente (€)</label>
                          <input type="number" className="w-24 bg-white border border-blue-200 rounded-lg p-1.5 text-right font-black text-[#1e3d6b]" value={p.total_euros} onChange={(e) => actualizarPartida(i, 'total_euros', e.target.value)} />
                        </div>
                      </div>
                      <button onClick={() => setPartidas(prev => prev.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 pt-6">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Notas */}
                <div className="mb-10 text-zinc-600">
                  <label className="text-[10px] font-black text-blue-500 uppercase block mb-3 italic">Notas del Presupuesto</label>
                  <textarea
                    className="w-full bg-zinc-50 border-2 border-blue-100 rounded-2xl p-4 text-xs font-bold outline-none focus:border-[#1e3d6b]"
                    rows={5}
                    value={notasAdicionales}
                    onChange={(e) => setNotasAdicionales(e.target.value)}
                  />
                </div>

                {/* Totales + botón */}
                <div className="bg-[#1e3d6b] p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                  <div className="text-white text-left space-y-1">
                    <p className="text-[10px] font-black text-blue-200/50 uppercase">Precio cliente (S/IVA)</p>
                    <p className="text-4xl font-black">{subtotalActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                    {costoTotal > 0 && (
                      <p className="text-[10px] text-emerald-400 font-black">
                        Margen estimado: {margenActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ({subtotalActual > 0 ? ((margenActual / subtotalActual) * 100).toFixed(1) : 0}%)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 items-end">
                    <button
                      onClick={finalizarYGuardar}
                      disabled={isSaving}
                      className="bg-white text-[#1e3d6b] px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Guardar y Generar PDFs</>}
                    </button>
                    <p className="text-[9px] text-blue-200/40 uppercase tracking-widest">Genera PDF cliente + orden de compra interna</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[550px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-white/10 uppercase font-black text-center p-10 gap-4">
              <FileText size={48} className="opacity-20" />
              Selecciona un cliente y añade partidas para comenzar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}