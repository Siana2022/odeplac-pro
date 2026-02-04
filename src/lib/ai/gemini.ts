import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function generateTechnicalMemory(obra: any, items: any[]) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Genera una memoria técnica para la obra: ${obra.titulo}. Materiales: ${JSON.stringify(items)}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Error al generar la memoria técnica.";
  }
}

export async function extractMaterialsFromPDF(base64Data: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      "Extrae productos JSON: nombre_producto, unidad, precio_unitario",
      { inlineData: { data: base64Data, mimeType: "application/pdf" } }
    ]);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) { return null; }
}

export function getSystemInstruction(context: { cliente: any, obras: any[] }) {
  return `Eres el asistente experto de ODEPLAC PRO. Cliente: ${context.cliente?.nombre || 'N/A'}. Obras: ${JSON.stringify(context.obras)}. Responde de forma técnica y profesional.`;
}