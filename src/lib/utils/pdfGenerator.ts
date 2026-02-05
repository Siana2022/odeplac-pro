import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFPresupuesto = (datos: any) => {
  const doc = new jsPDF();
  
  // 1. CABECERA - ODEPLAC
  doc.setFontSize(22);
  doc.setTextColor(41, 86, 147); 
  doc.setFont("helvetica", "bold");
  doc.text("ODEPLAC", 14, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("CONSTRUCCIONES EN SECO S.L.", 14, 26);
  doc.text("Av. de la Albufera Nº 1, 7B/CP 46470 Massanassa VALENCIA", 14, 31);
  doc.text("CIF: B70725528 | Tel: 645735319", 14, 36);
  doc.text("E-mail: odeplac1@gmail.com | www.odeplac.es", 14, 41);

  doc.setDrawColor(230);
  doc.line(14, 45, 196, 45);
  
  // 2. RECEPTOR (ZONA PERSONALIZADA)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`PARA: ${datos.clienteNombre}`, 14, 55);
  doc.setFont("helvetica", "normal");
  doc.text(`NIF/CIF: ${datos.clienteNif}`, 14, 61);
  doc.text(`DIRECCIÓN: ${datos.clienteDireccion}`, 14, 67);
  doc.text(`OBRA: ${datos.obraTitulo}`, 14, 73);

  doc.text(`DOCUMENTO N°: PRE-${Math.floor(1000 + Math.random() * 9000)}`, 140, 55);
  doc.text(`FECHA: ${new Date().toLocaleDateString('es-ES')}`, 140, 61);

  // 3. TABLA
  autoTable(doc, {
    startY: 80,
    head: [['DESCRIPCIÓN', 'Cant.', 'Precio unitario', 'Coste']],
    body: datos.items,
    headStyles: { fillColor: [41, 86, 147], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 3: { halign: 'right' } },
    theme: 'grid'
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const subtotal = parseFloat(datos.subtotal) || 0;

  doc.setFont("helvetica", "bold");
  doc.text(`SUBTOTAL: ${subtotal.toFixed(2)} €`, 190, finalY, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text(`IVA (21%): ${(subtotal * 0.21).toFixed(2)} €`, 190, finalY + 7, { align: 'right' });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL FINAL: ${(subtotal * 1.21).toFixed(2)} €`, 190, finalY + 16, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("FORMA DE PAGO: TRANSFERENCIA BANCARIA", 14, finalY + 30);
  doc.text("IBAN: ES18 3058 2237 9927 2001 4556", 14, finalY + 35);

  doc.save(`Presupuesto_ODEPLAC_${datos.clienteNombre.replace(/\s+/g, '_')}.pdf`);
};