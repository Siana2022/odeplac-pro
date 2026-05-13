import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export async function analizarTarifaPDF(fileBase64: string, mimeType: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Analiza este documento de Saint-Gobain Placo. Extrae los productos en un array JSON técnico:
    {
      "nombre": "Nombre",
      "codigo": "Código",
      "precio_coste": 0.00,
      "unidad": "m/Ud/etc",
      "marca": "Placo/Isover",
      "etiquetas_sugeridas": ["etiqueta1", "etiqueta2"],
      "especificaciones": {
        "longitud_mm": "valor",
        "espesor_mm": "valor",
        "ancho_mm": "valor",
        "grupo_fact": "valor",
        "ud_min_venta": "valor",
        "acondicionamiento": "valor",
        "pe": "valor"
      }
    }
    Responde solo el JSON.
  `;

  try {
    const result = await model.generateContent([
      { inlineData: { data: fileBase64.split(',')[1], mimeType: mimeType } },
      { text: prompt },
    ]);
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error(error);
    throw error;
  }
}