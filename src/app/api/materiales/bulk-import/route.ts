import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Importante para procesos largos de IA

export async function POST(req: Request) {
  try {
    const { file, margen = 20, categoria = 'General', proveedorId } = await req.json();
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const supabase = await createClient();

    if (!file) {
      return NextResponse.json({ error: "No se recibió el archivo PDF en base64" }, { status: 400 });
    }

    console.log(`🤖 Gemini procesando PDF para extraer materiales...`);

    // 1. Prompt para que la IA extraiga los datos y calcule el PVP con tu margen
    const systemPrompt = `
      Eres un experto en construcción. Analiza este PDF de tarifas.
      Extrae los productos y devuelve un JSON con esta estructura:
      {
        "materiales": [
          {
            "nombre": "Nombre del producto",
            "coste": 0.00,
            "unidad": "ud",
            "descripcion": "Breve descripción"
          }
        ]
      }
      Reglas:
      - 'unidad' debe ser: 'ud', 'm2', 'kg', 'ml'.
      - Extrae el precio base (coste).
    `;

    // 2. Llamada a Gemini
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { inlineData: { mimeType: "application/pdf", data: file } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!aiRes.ok) throw new Error("Error en la comunicación con la IA");

    const result = await aiRes.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const { materiales } = JSON.parse(text);

    // 3. Mapeo a los nombres de columna reales de tu SQL (precio_unitario)
    const materialesData = materiales.map((m: any) => ({
      nombre: m.nombre,
      descripcion: m.descripcion,
      precio_unitario: parseFloat(m.coste) || 0, // En tu SQL es precio_unitario
      unidad: m.unidad || 'ud',
      categoria: categoria,
      proveedor_id: proveedorId || null,
      usuario_id: '05971cd1-57e1-4d97-8469-4dc104f6e691', // Demo ID
      metadata: { margen_aplicado: margen }
    }));

    // 4. Inserción masiva
    const { data, error: dbError } = await supabase
      .from('materiales')
      .insert(materialesData)
      .select();

    if (dbError) {
      console.error("❌ Error Supabase:", dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data.length });

  } catch (error: any) {
    console.error("❌ Fallo crítico:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}