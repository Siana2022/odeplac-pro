import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Obra, Cliente, Material, PresupuestoItem } from '@/types/database';

// Standard styling for a professional look
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#18181b', // Zinc-900
    paddingBottom: 10,
  },
  logoSection: {
    flexDirection: 'column',
  },
  brand: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181b',
  },
  brandSub: {
    fontSize: 8,
    color: '#71717a', // Zinc-500
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    color: '#71717a',
    marginBottom: 2,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    marginBottom: 8,
  },
  table: {
    marginTop: 10,
    borderWidth: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5', // Zinc-100
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
    padding: 8,
  },
  colDesc: { width: '55%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },

  totalSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    width: '40%',
    borderTopWidth: 2,
    borderTopColor: '#18181b',
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  memorySection: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingTop: 20,
  },
  memoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#18181b',
  },
  memoryText: {
    fontSize: 9,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#a1a1aa',
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
    paddingTop: 10,
  }
});

// Helper to strip HTML tags for the PDF
const stripHtml = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '\n').replace(/\n\s*\n/g, '\n').trim();
};

export const BudgetPDF = ({ obra, items }: {
  obra: Obra & { clientes?: Cliente },
  items: (PresupuestoItem & { materiales: Material })[]
}) => {
  const subtotal = items.reduce((acc, item) => acc + (item.cantidad * item.precio_aplicado), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.brand}>ODEPLAC PRO</Text>
            <Text style={styles.brandSub}>Construcciones en Seco S.L.</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.title}>PRESUPUESTO</Text>
            <Text style={styles.value}>#{obra.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.label}>FECHA</Text>
            <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>CLIENTE</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{obra.clientes?.nombre}</Text>
            <Text style={styles.value}>{obra.clientes?.direccion || 'N/A'}</Text>
            <Text style={styles.value}>{obra.clientes?.email}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>PROYECTO</Text>
            <Text style={styles.value}>{obra.titulo}</Text>
            <Text style={styles.label}>ESTADO</Text>
            <Text style={styles.value}>{obra.estado.toUpperCase()}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>DESCRIPCIÓN</Text>
            <Text style={styles.colQty}>CANT.</Text>
            <Text style={styles.colPrice}>PRECIO</Text>
            <Text style={styles.colTotal}>TOTAL</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colDesc}>{item.materiales.nombre}</Text>
              <Text style={styles.colQty}>{item.cantidad} {item.materiales.unidad}</Text>
              <Text style={styles.colPrice}>€{item.precio_aplicado.toLocaleString()}</Text>
              <Text style={styles.colTotal}>€{(item.cantidad * item.precio_aplicado).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>€{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>IVA (21%):</Text>
              <Text>€{tax.toLocaleString()}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>TOTAL:</Text>
              <Text>€{total.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Technical Memory */}
        {obra.memoria_tecnica_final && (
          <View style={styles.memorySection} break>
            <Text style={styles.memoryTitle}>MEMORIA TÉCNICA DESCRIPTIVA</Text>
            <Text style={styles.memoryText}>
              {stripHtml(obra.memoria_tecnica_final)}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ODEPLAC Construcciones en Seco S.L. | Calle Falsa 123, Madrid | www.odeplac.com</Text>
          <Text render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};
