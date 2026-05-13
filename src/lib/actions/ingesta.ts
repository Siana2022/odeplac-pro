'use server'

import { createClient } from '@/lib/supabase/server';
import { extractMaterialsFromPDF } from '@/lib/ai/gemini';
import { revalidatePath } from 'next/cache';

export async function procesarTarifaAccion(formData: FormData, proveedorId: string) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error("No se ha subido ningún archivo");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Usamos el ID de usuario de la sesión o el fallback de Juanjo
    const usuario_id = user?.id || '05971cd1-57e1-4d97-8469-4dc104f6e691';

    // Conversión a Base64 para Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 1. Invocamos tu función de gemini.ts
    const materialesExtraidos = await extractMaterialsFromPDF(base64Data);

    if (!materialesExtraidos || !Array.isArray(materialesExtraidos)) {
      throw new Error("La IA no pudo extraer materiales válidos del documento.");
    }

    // 2. Guardado en Supabase
    // Usamos upsert para actualizar precios si el nombre ya existe para ese proveedor
    const { error } = await supabase
      .from('materiales')
      .upsert(
        materialesExtraidos.map(m => ({
          nombre: m.nombre,
          precio_unitario: m.precio_unitario,
          unidad: m.unidad || 'ud',
          categoria: m.categoria || 'General',
          descripcion: m.descripcion || '',
          proveedor_id: proveedorId === 'none' ? null : proveedorId,
          usuario_id: usuario_id,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'nombre, proveedor_id' } 
      );

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/materiales');
    return { success: true, count: materialesExtraidos.length };

  } catch (error: any) {
    console.error("Error en procesarTarifaAccion:", error);
    throw new Error(error.message || "Error desconocido al procesar la tarifa.");
  }
}