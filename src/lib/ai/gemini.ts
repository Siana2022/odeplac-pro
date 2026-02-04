import { GoogleGenerativeAI } from "@google/generative-ai";
import { Cliente } from "@/types/database";

// Variable para mantener la instancia y no crear una nueva en cada llamada
let genAIInstance: GoogleGenerativeAI | null = null;

/**
 * Inicializa y devuelve la instancia de Google AI de forma segura.
 * Evita errores en tiempo de compilación si la API KEY no está presente.
 */
const getGenAI = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    // En producción avisamos, pero no bloqueamos el proceso de build
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
 * Extrae materiales de un PDF usando el modelo Flash.
 */
export async function extractMaterialsFromPDF(base64Data: string) {
  const genAI = getGenAI();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analiza exhaustivamente este documento PDF de tarifas de construcción.
    Extrae todos los productos/materiales disponibles y devuelve UN ÚNICO JSON estructurado (array de objetos).

    Cada objeto debe tener:
    - nombre_producto: Nombre descriptivo claro del material.
    - unidad: Unidad de medida (m2, ml, kg, ud, saco, pack, etc.).
    - precio_unitario: Valor numérico del precio (usa punto para decimales).
    - categoria: (opcional) Categoría del material si se menciona.

    REGLAS:
    1. Si no hay precio claro, ignora el producto.
    2. No inventes datos.
    3. Devuelve solo el JSON, sin texto adicional ni bloques de código markdown.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      }
    ]);
    const response = await result.response;
    const text = response.text();
    // Limpiamos posibles formatos de markdown si la IA los incluye
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error extrayendo materiales del PDF:", error);
    return null;
  }
}

/**
 * Genera el prompt de sistema inyectando el contexto de Supabase.
 */
export function getSystemInstruction(context: { cliente: any, obras: any[], materialesDisponibles: any[] }) {
  return `
    Eres el asistente inteligente de ODEPLAC PRO, experto en construcción en seco (pladur, aislamientos, techos).
    Tu objetivo es ayudar al gestor con información técnica y comercial.

    CONTEXTO DEL CLIENTE ACTUAL:
    - Nombre: ${context.cliente?.nombre || 'Desconocido'}
    - Email: ${context.cliente?.email || 'N/A'}
    - Teléfono: ${context.cliente?.telefono || 'N/A'}
    - Dirección: ${context.cliente?.direccion || 'N/A'}

    OBRAS Y PROYECTOS DEL CLIENTE:
    ${JSON.stringify(context.obras, null, 2)}

    CATÁLOGO DE MATERIALES DE LA EMPRESA (Precios de referencia):
    ${JSON.stringify((context.materialesDisponibles || []).map((m: any) => ({ 
      nombre: m?.nombre, 
      precio: m?.precio_unitario, 
      unidad: m?.unidad 
    })), null, 2)}

    INSTRUCCIONES DE COMPORTAMIENTO:
    1. Responde de forma profesional, técnica y muy concisa.
    2. Si preguntan por presupuestos o estados de obra, usa los datos de "OBRAS Y PROYECTOS DEL CLIENTE".
    3. Para sugerencias de materiales, usa exclusivamente el "CATÁLOGO DE MATERIALES DE LA EMPRESA".
    4. Si no tienes un dato concreto, di que no dispones de esa información en este momento.
    5. Formatea la respuesta usando Markdown básico (negritas, listas, etc.).
  `;
}
