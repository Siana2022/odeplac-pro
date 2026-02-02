import { GoogleGenerativeAI } from "@google/generative-ai";
import { Cliente, Obra } from "@/types/database";

let genAIInstance: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    console.warn('GEMINI_API_KEY is missing.');
    return null;
  }

  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
};

export async function extractMaterialsFromPDF(base64Data: string) {
  const genAI = getGenAI();
  if (!genAI) throw new Error('Gemini AI not initialized');

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analiza exhaustivamente este documento PDF de tarifas de construcción (puede tener múltiples páginas).
    Extrae todos los productos/materiales disponibles y devuelve UN ÚNICO JSON estructurado (array de objetos).

    Cada objeto debe tener:
    - nombre_producto: Nombre descriptivo claro del material.
    - unidad: Unidad de medida (m2, ml, kg, ud, saco, pack, etc.).
    - precio_unidad: Valor numérico del precio (usa punto para decimales).
    - categoria: (opcional) Categoría del material si se menciona.

    REGLAS:
    1. Si el documento tiene tablas que continúan en varias páginas, júntalas.
    2. Ignora logotipos, publicidad, condiciones legales o textos irrelevantes.
    3. Si hay varios precios para un mismo producto según cantidad, elige el precio base o unitario.
    4. Devuelve SOLO el JSON, sin explicaciones adicionales.
  `;

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

  // Extract JSON from the response
  const jsonMatch = text.match(/\[.*\]/s) || text.match(/\{.*\}/s);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini response", e);
      return null;
    }
  }

  return null;
}

export async function generateTechnicalMemory(params: {
  cliente: Cliente;
  obra: Obra;
  materiales: { nombre: string; unidad: string; cantidad: number }[];
  plantillaBase?: string;
}) {
  const genAI = getGenAI();
  if (!genAI) throw new Error('Gemini AI not initialized');

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `
    Redacta una memoria técnica descriptiva profesional para una obra de construcción en seco.
    Usa un tono técnico pero comercial. Incluye procesos de instalación basados en los materiales elegidos.

    DATOS DEL CLIENTE:
    ${JSON.stringify(params.cliente, null, 2)}

    DATOS DE LA OBRA:
    ${JSON.stringify(params.obra, null, 2)}

    MATERIALES ELEGIDOS:
    ${params.materiales.map(m => `- ${m.nombre} (${m.cantidad} ${m.unidad})`).join('\n')}

    PLANTILLA BASE:
    ${params.plantillaBase || 'Construcción en seco profesional'}

    Instrucción: Genera el contenido en formato HTML limpio (solo etiquetas básicas como h1, h2, p, ul, li).
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export function getSystemInstruction(context: { cliente: Cliente, obras: unknown[], materialesDisponibles: unknown[] }) {
  return `
    Eres el asistente inteligente de ODEPLAC PRO, una empresa de construcción en seco (pladur, aislamientos, techos).
    Tu objetivo es ayudar al gestor de la empresa con información específica sobre un cliente y sus proyectos.

    CONTEXTO DEL CLIENTE:
    Nombre: ${context.cliente.nombre}
    Email: ${context.cliente.email}
    Teléfono: ${context.cliente.telefono || 'N/A'}
    Dirección: ${context.cliente.direccion || 'N/A'}

    OBRAS/PROYECTOS ASOCIADOS:
    ${JSON.stringify(context.obras, null, 2)}

    CATÁLOGO DE MATERIALES DISPONIBLES:
    ${JSON.stringify(context.materialesDisponibles.map(m => ({ nombre: m.nombre, precio: m.precio_unitario, unidad: m.unidad })), null, 2)}

    INSTRUCCIONES:
    1. Responde de forma profesional, técnica y concisa.
    2. Usa los datos del contexto para responder preguntas sobre presupuestos, estados de obra o materiales.
    3. Si el usuario pregunta por opciones para una obra, consulta el "CATÁLOGO DE MATERIALES DISPONIBLES" para dar sugerencias reales.
    4. El gestor es tu interlocutor. Saluda de forma ejecutiva.
    6. Formato: Usa Markdown para listas o tablas si es necesario.
  `;
}
