import { GoogleGenerativeAI } from "@google/generative-ai";

// Instancia única para evitar múltiples conexiones
let genAIInstance: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ GOOGLE_GENERATIVE_AI_API_KEY no detectada.');
    }
    return null;
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
};

/**
 * Genera una memoria técnica descriptiva para una obra.
 * Se usa en /api/obras/generate-memory
 */
export async function generateTechnicalMemory(obra: any, items: any[]) {
  const genAI = getGenAI();
  if (!genAI) return "Error: Configuración de IA incompleta (API KEY faltante).";

  // Usamos el modelo flash que es rápido y económico
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Como experto en construcción en seco (sistemas Pladur/Knauf), genera una memoria técnica profesional.
    
    DATOS DE LA OBRA:
    - Título: ${obra.titulo || 'Obra sin título'}
    - Cliente: ${obra.clientes?.nombre || 'N/A'}
    
    MATERIALES Y PARTIDAS:
    ${JSON.stringify(items, null, 2)}

    ESTRUCTURA REQUERIDA (Markdown):
    1. Introducción y Objetivo.
    2. Descripción de Sistemas Constructivos (según materiales).
    3. Normativa aplicable (CTE).
    4. Conclusión de Calidad.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error en generateTechnicalMemory:", error);
    return "No se pudo generar la memoria técnica automáticamente en este momento.";
  }
}

/**
 * Extrae materiales de un PDF (Tarifas).
 */
export async function extractMaterialsFromPDF(base64Data: string) {
  const genAI = getGenAI();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analiza este documento de tarifas de construcción y extrae los productos.
    Devuelve estrictamente un JSON (array de objetos) con: nombre_producto, unidad, precio_unitario, categoria.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "application/pdf" } }
    ]);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error en extracción PDF:", error);
    return null;
  }
}

/**
 * Instrucciones de sistema para el Asistente de Chat.
 */
export function getSystemInstruction(context: { cliente: any, obras: any[] }) {
  return `
    Eres el asistente inteligente de ODEPLAC PRO (expertos en tabiquería seca y techos).
    
    CONTEXTO ACTUAL:
    - Cliente: ${context.cliente?.nombre || 'Desconocido'}.
    - Obras asociadas: ${JSON.stringify(context.obras || [])}.

    REGLAS:
    1. Sé técnico pero conciso.
    2. Si preguntan por precios, básate en los datos de las obras del cliente.
    3. Usa un tono profesional y resolutivo.
  `;
}