import { GoogleGenerativeAI } from "@google/generative-ai";

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

// 1. FUNCIÓN PARA GENERAR MEMORIA TÉCNICA (La que causó el error)
export async function generateTechnicalMemory(obra: any, items: any[]) {
  const genAI = getGenAI();
  if (!genAI) return "Error: IA no configurada.";
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Genera una memoria técnica para la obra: ${obra.titulo}. Materiales: ${JSON.stringify(items)}`;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Error generando memoria.";
  }
}

// 2. FUNCIÓN PARA EXTRAER MATERIALES DE PDF
export async function extractMaterialsFromPDF(base64Data: string) {
  const genAI = getGenAI();
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const result = await model.generateContent(["Extrae materiales de este PDF y devuelve JSON.", { inlineData: { data: base64Data, mimeType: "application/pdf" } }]);
    return JSON.parse(result.response.text().replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) {
    return null;
  }
}

// 3. INSTRUCCIONES PARA EL ASISTENTE
export function getSystemInstruction(context: { cliente: any, obras: any[], materialesDisponibles: any[] }) {
  return `Eres el asistente de ODEPLAC PRO. Cliente: ${context.cliente?.nombre}. Obras: ${JSON.stringify(context.obras)}. Materiales: ${JSON.stringify(context.materialesDisponibles)}.`;
}
