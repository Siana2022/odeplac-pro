import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFPresupuesto = (datos: any) => {
  const doc = new jsPDF();
  
  // 1. ENCABEZADO (Datos oficiales de ODEPLAC)
  doc.setFontSize(22);
  doc.setTextColor(41, 86, 147); // Azul ODEPLAC
  doc.text("ODEPLAC", 14, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("CONSTRUCCIONES EN SECO S.L.", 14, 26);
  doc.text("Av. de la Albufera Nº 1, 7B/CP 46470 Massanassa VALENCIA", 14, 31);
  doc.text("Teléfono: 645735319 | E-mail: odeplac1@gmail.com", 14, 36);
  doc.text("CIF: B70725528 | www.odeplac.es", 14, 41);

  // 2. DATOS DEL CLIENTE (Estilo factura Minicube)
  doc.setDrawColor(230);
  doc.line(14, 45, 196, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`PARA: ${datos.clienteNombre || 'CLIENTE'}`, 14, 55);
  doc.setFont("helvetica", "normal");
  doc.text(`NIF: ${datos.clienteNif || '-'}`, 14, 61);
  doc.text(`DIRECCION: ${datos.clienteDireccion || '-'}`, 14, 67);
  doc.text(`OBRA: ${datos.obraTitulo || 'GENERAL'}`, 14, 73);

  // 3. DATOS DOCUMENTO
  doc.text(`FACTURA N°: ${datos.numeroFactura || 'PRE-001'}`, 140, 55);
  doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 140, 61);

  // 4. TABLA DE CONCEPTOS (Nombres de columna del ejemplo)
  autoTable(doc, {
    startY: 80,
    head: [['DESCRIPCIÓN', 'Cant.', 'Precio unitario', 'Coste']],
    body: datos.items,
    headStyles: { fillColor: [41, 86, 147], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    theme: 'grid'
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // 5. TOTALES (Alineados a la derecha)
  doc.setFontSize(10);
  doc.text(`SUBTOTAL:`, 140, finalY);
  doc.text(`${datos.subtotal} €`, 185, finalY, { align: 'right' });
  
  doc.text(`IVA (21%):`, 140, finalY + 7);
  doc.text(`${datos.iva} €`, 185, finalY + 7, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL:`, 140, finalY + 16);
  doc.text(`${datos.total} €`, 185, finalY + 16, { align: 'right' });

  // 6. PIE DE PÁGINA (IBAN Sabadell)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("PAGO TRANSFERENCIA BANCARIA", 14, finalY + 30);
  doc.text(`IBAN: ES18 3058 2237 9927 2001 4556`, 14, finalY + 35);

  doc.save(`Factura_ODEPLAC_${datos.clienteNombre}.pdf`);
};