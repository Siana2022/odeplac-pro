import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { materiales, proveedorId, tarifaId, categoria, margen } = await req.json();
    
    if (!materiales || !Array.isArray(materiales)) {
      return NextResponse.json({ error: "No se recibieron materiales válidos" }, { status: 400 });
    }

    const supabase = await createClient();

    console.log(`📦 Procesando importación de ${materiales.length} materiales...`);

    const materialesData = materiales.map((m: any) => {
      const precioCoste = parseFloat(m.precio) || 0;
      // Cálculo del PVP: Coste * (1 + Margen/100)
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

    // Inserción masiva
    const { data, error } = await supabase
      .from('materiales')
      .insert(materialesData)
      .select();

    if (error) {
      console.error("❌ Error Supabase:", error.message);
      return NextResponse.json({ error: `Base de Datos: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: data.length 
    });

  } catch (error: any) {
    console.error("❌ Fallo crítico:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}