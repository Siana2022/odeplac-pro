import { extractMaterialsFromPDF } from './gemini';

/**
 * Procesa un Base64 de un PDF utilizando la lógica definida en gemini.ts
 * @param fileBase64 - El contenido del PDF en formato Base64
 */
export async function parsearTarifaPDF(fileBase64: string) {
  try {
    // Llamamos a la función que ya tienes en gemini.ts
    const materiales = await extractMaterialsFromPDF(fileBase64);

    if (!materiales || !Array.isArray(materiales)) {
      throw new Error("La IA no devolvió un formato de lista válido.");
    }

    // Normalizamos los campos para que coincidan con nuestra base de datos
    return materiales.map((m: any) => ({
      nombre: m.nombre || m.nombre_producto, // Soporta ambos nombres de propiedad
      precio_unitario: parseFloat(m.precio_unitario) || 0,
      unidad: m.unidad || 'ud',
      categoria: m.categoria || 'General',
      descripcion: m.descripcion || ''
    }));
  } catch (error) {
    console.error("Error en pdfParser:", error);
    throw error;
  }
}