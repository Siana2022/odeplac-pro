import { createClient } from '@/lib/supabase/server';
import { calculateHash } from '@/lib/utils/hash';

export async function submitInvoiceToVerifactu(obra: any, items: any[]) {
  const supabase = await createClient();

  // 1. Get the last invoice hash for chaining (AEAT 2026 requirement)
  const { data: lastInvoice } = await supabase
    .from('facturas')
    .select('hash')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const prevHash = lastInvoice?.hash || '0000000000000000000000000000000000000000000000000000000000000000'; // 64 chars for SHA-256

  // 2. Prepare payload and calculate current hash (Chaining)
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    obra_id: obra.id,
    cliente_id: obra.cliente_id,
    items: items.map(i => ({ id: i.id, qty: i.cantidad, price: i.precio_aplicado })),
    total: obra.total_presupuesto,
    prevHash,
    timestamp
  });

  const currentHash = calculateHash(payload);
  const invoiceNumber = `F2026-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;

  // 3. Real Veri*factu QR Code format (simplified)
  const qrData = `https://www2.agenciatributaria.gob.es/vlsc/id=${invoiceNumber}&hash=${currentHash.substring(0, 8)}`;
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  // 4. Record in DB
  const { data, error } = await supabase
    .from('facturas')
    .insert({
      obra_id: obra.id,
      numero_factura: invoiceNumber,
      qr_code: qrCode,
      hash: currentHash,
      prev_hash: prevHash,
      datos_completos: JSON.parse(payload)
    })
    .select()
    .single();

  if (error) {
    console.error('Veri*factu insertion error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    invoiceNumber,
    qrCode,
    hash: currentHash,
    data
  };
}
