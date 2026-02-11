import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function generateTechnicalMemory(obra: any, items: any[]) {
  try {
    // Corregido a gemini-2.0-flash que es la versión estable actual
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Genera una memoria técnica para la obra: ${obra.titulo}. Materiales: ${JSON.stringify(items)}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Error en generateTechnicalMemory:", e);
    return "Error al generar la memoria técnica.";
  }
}

export async function extractMaterialsFromPDF(base64Data: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" } // Forzamos salida JSON nativa
    });

    const prompt = `
      Analiza este PDF de tarifa/factura de materiales de construcción y extrae los productos.
      Devuelve exclusivamente un array de objetos JSON con este formato:
      [
        {
          "nombre": "nombre del material",
          "unidad": "m2, ud, ml, kg o saco",
          "precio_unitario": 0.00,
          "categoria": "opcional",
          "descripcion": "opcional"
        }
      ]
      No añadas texto antes ni después del JSON. Si no encuentras el precio, ignora el material.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "application/pdf" } }
    ]);
    
    const text = result.response.text();
    // Limpieza de posibles marcas de markdown que a veces el modelo añade
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) { 
    console.error("Error en extractMaterialsFromPDF:", e);
    return null; 
  }
}

export function getSystemInstruction(context: { cliente: any, obras: any[] }) {
  return `Eres el asistente experto de ODEPLAC PRO. Cliente: ${context.cliente?.nombre || 'N/A'}. Obras: ${JSON.stringify(context.obras)}. Responde de forma técnica y profesional.`;
}