import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { materiales, proveedorId, tarifaId, categoria, margen } = await req.json();
    
    if (!materiales || !Array.isArray(materiales)) {
      return NextResponse.json({ error: "No hay materiales" }, { status: 400 });
    }

    const supabase = await createClient();

    console.log(`📦 Procesando ${materiales.length} materiales de ${categoria} con margen ${margen}%...`);

    const materialesData = materiales.map((m: any) => {
      const precioCoste = parseFloat(m.precio) || 0;
      // 🚀 CÁLCULO DEL PVP: Precio Coste + Margen
      const precioVenta = precioCoste * (1 + (margen / 100));

      return {
        nombre: m.nombre,
        precio_coste: precioCoste,
        precio_venta: precioVenta,
        margen_beneficio: margen,
        categoria: categoria,
        unidad: m.unidad || 'ud',
        proveedor_id: proveedorId,
        tarifa_id: tarifaId,
        referencia_catalogo: m.referencia || null,
        updated_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('materiales')
      .insert(materialesData)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data.length });

  } catch (error: any) {
    console.error("❌ Fallo en importación:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}