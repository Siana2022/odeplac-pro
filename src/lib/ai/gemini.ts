import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIInstance: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  if (!genAIInstance) genAIInstance = new GoogleGenerativeAI(apiKey);
  return genAIInstance;
};

// Esta es la función que Vercel no encontraba
export async function generateTechnicalMemory(obra: any, items: any[]) {
  const genAI = getGenAI();
  if (!genAI) return "Error: IA no configurada.";
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Genera una memoria técnica para la obra: ${obra.titulo || 'Obra'}. Materiales: ${JSON.stringify(items)}`;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Error al generar la memoria.";
  }
}

export async function extractMaterialsFromPDF(base64Data: string) {
  const genAI = getGenAI();
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const result = await model.generateContent(["Extrae materiales de este PDF", { inlineData: { data: base64Data, mimeType: "application/pdf" } }]);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) { return null; }
}

export function getSystemInstruction(context: any) {
  return `Eres el asistente de ODEPLAC PRO. Cliente: ${context.cliente?.nombre || 'N/A'}.`;
}