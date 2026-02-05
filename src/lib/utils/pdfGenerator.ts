import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFPresupuesto = (datos: any) => {
  const doc = new jsPDF();
  
  // 1. ENCABEZADO - DATOS ODEPLAC
  doc.setFontSize(22);
  doc.setTextColor(41, 86, 147); // Azul corporativo
  doc.setFont("helvetica", "bold");
  doc.text("ODEPLAC", 14, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("CONSTRUCCIONES EN SECO S.L.", 14, 26);
  doc.text("Av. de la Albufera Nº 1, 7B/CP 46470 Massanassa VALENCIA", 14, 31);
  doc.text("CIF: B70725528 | Tel: 645735319", 14, 36);
  doc.text("E-mail: odeplac1@gmail.com | www.odeplac.es", 14, 41);

  // Línea divisoria
  doc.setDrawColor(230);
  doc.line(14, 45, 196, 45);
  
  // 2. DATOS DEL CLIENTE (Lado izquierdo)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`PARA: ${datos.clienteNombre}`, 14, 55);
  doc.setFont("helvetica", "normal");
  doc.text(`NIF/CIF: ${datos.clienteNif}`, 14, 61);
  doc.text(`DIRECCIÓN: ${datos.clienteDireccion}`, 14, 67);
  doc.text(`OBRA: ${datos.obraTitulo}`, 14, 73);

  // 3. DATOS DEL DOCUMENTO (Lado derecho)
  doc.text(`DOCUMENTO N°: PRE-${Math.floor(1000 + Math.random() * 9000)}`, 140, 55);
  doc.text(`FECHA: ${new Date().toLocaleDateString('es-ES')}`, 140, 61);

  // 4. TABLA DE CONCEPTOS
  autoTable(doc, {
    startY: 80,
    head: [['DESCRIPCIÓN', 'Cant.', 'Precio unitario', 'Coste']],
    body: datos.items,
    headStyles: { fillColor: [41, 86, 147], textColor: [255, 255, 255], fontStyle: 'bold' },
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

  // 5. TOTALES (Alineados a la derecha como en Minicube)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`SUBTOTAL:`, 140, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(`${datos.subtotal} €`, 190, finalY, { align: 'right' });
  
  doc.text(`IVA (21%):`, 140, finalY + 7);
  doc.text(`${datos.iva} €`, 190, finalY + 7, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL FINAL:`, 140, finalY + 16);
  doc.text(`${datos.total} €`, 190, finalY + 16, { align: 'right' });

  // 6. PIE DE PÁGINA
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("FORMA DE PAGO: TRANSFERENCIA BANCARIA", 14, finalY + 30);
  doc.text(`IBAN: ES18 3058 2237 9927 2001 4556 (Banco Sabadell)`, 14, finalY + 35);

  doc.save(`Presupuesto_ODEPLAC_${datos.clienteNombre.replace(/\s+/g, '_')}.pdf`);
};