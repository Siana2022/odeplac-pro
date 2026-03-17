import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inicializamos el cliente de Supabase con Service Role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  console.log("🚀 [CHIVATO 1]: Iniciando proceso en el servidor...");

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const clienteManual = formData.get('clienteManual') as string;

    if (!file) throw new Error("No hay archivo en la petición");

    // 1. Preparar envío a n8n
    const n8nFormData = new FormData();
    n8nFormData.append('file', file);
    n8nFormData.append('cliente', clienteManual);

    console.log("📡 [CHIVATO 2]: Enviando archivo a n8n...");
    const n8nRes = await fetch('https://n8n.sianadigital.com/webhook/f466e885-eb72-4984-b756-3f1ebe243584', {
      method: 'POST',
      body: n8nFormData,
    });

    if (!n8nRes.ok) throw new Error(`n8n respondió con error ${n8nRes.status}`);

    const resultFromN8n = await n8nRes.json();
    console.log("✅ [CHIVATO 3]: Respuesta de n8n recibida correctamente.");

    // 2. Parsear el JSON enviado por la IA
    const dataIA = JSON.parse(resultFromN8n[0].text);
    const partidasExtraidas = dataIA.partidas || [];
    console.log(`📊 [CHIVATO 4]: IA extrajo ${partidasExtraidas.length} partidas del PDF.`);

    // 3. Consultar Recetas y Precios en Supabase
    console.log("💾 [CHIVATO 5]: Consultando recetas de materiales en Supabase...");
    // Añadimos el tipado <any[]> para que TS no se queje de las propiedades de la tabla
    const { data: recetas, error: errorRecetas } = await supabase
      .from('sistema_composicion')
      .select(`
        nombre_sistema, 
        placa_tipo, 
        cantidad_por_m2,
        materiales ( nombre, precio_venta )
      `) as { data: any[] | null, error: any };

    if (errorRecetas) {
      console.error("❌ [ERROR SUPABASE]: No se pudieron cargar las recetas", errorRecetas.message);
    } else {
      console.log(`📝 [CHIVATO 6]: ${recetas?.length || 0} recetas cargadas con éxito.`);
    }

    // 4. Calcular el presupuesto cruzando IA + Base de Datos
    const partidasCalculadas = partidasExtraidas.map((p: any, index: number) => {
      const componentes = recetas?.filter(r => 
        r.nombre_sistema?.toLowerCase().trim() === p.tipo?.toLowerCase().trim() &&
        r.placa_tipo?.toLowerCase().trim() === p.placa?.toLowerCase().trim()
      ) || [];

      if (componentes.length === 0) {
        console.log(`⚠️ [AVISO]: Partida ${index + 1} (${p.tipo} - ${p.placa}) no tiene receta definida.`);
      }

      const totalPartida = componentes.reduce((acc, c) => {
        // SOLUCIÓN PARA VERCEL: Validamos si materiales es un array o un objeto
        const m = Array.isArray(c.materiales) ? c.materiales[0] : c.materiales;
        const precio = Number(m?.precio_venta || 0);
        const ratio = Number(c.cantidad_por_m2 || 0);
        return acc + (Number(p.medicion) * ratio * precio);
      }, 0);

      return {
        ...p,
        descripcion: p.descripcion || "Sin descripción",
        medicion: p.medicion || 0,
        total_euros: totalPartida > 0 ? totalPartida.toFixed(2) : "0.00",
        tiene_precio: totalPartida > 0
      };
    });

    const totalObra = partidasCalculadas.reduce((acc: number, p: any) => acc + parseFloat(p.total_euros), 0);
    console.log(`💰 [CHIVATO FINAL]: Cálculo completado. Total Obra: ${totalObra.toFixed(2)}€`);

    // --- GUARDAR EN LA TABLA DE HISTORIAL ---
    console.log("🗄️ [CHIVATO 7]: Guardando presupuesto en el historial...");
    const { error: errorGuardado } = await supabase
      .from('presupuestos_generados')
      .insert([{
        cliente_nombre: clienteManual,
        obra_nombre: dataIA.obra || "Obra Nueva",
        total_materiales: parseFloat(totalObra.toFixed(2)),
        partidas_json: partidasCalculadas
      }]);

    if (errorGuardado) {
      console.error("❌ [ERROR GUARDADO]: No se pudo registrar en presupuestos_generados", errorGuardado.message);
    } else {
      console.log("✨ [CHIVATO 8]: Presupuesto guardado en el historial correctamente.");
    }

    return NextResponse.json({
      success: true,
      obra: dataIA.obra || "Obra Nueva",
      cliente: clienteManual,
      partidas: partidasCalculadas,
      total_presupuesto: totalObra.toFixed(2)
    });

  } catch (error: any) {
    console.error("❌ [ERROR CRÍTICO]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}