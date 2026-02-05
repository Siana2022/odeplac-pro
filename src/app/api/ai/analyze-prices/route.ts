import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializamos con tu API KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { pdfUrl } = await req.json();
    console.log("📂 Iniciando extracción con Gemini 2.5 para:", pdfUrl);

    const supabase = await createClient();

    // 1. Descargar el PDF desde Supabase
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('proveedores')
      .download(pdfUrl);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "No se pudo descargar el PDF de Supabase" }, { status: 500 });
    }

    // 2. Preparar el archivo para la IA
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

    // 3. Usar el modelo 2.5 que ya sabemos que te funciona
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("🧠 Gemini 2.5 analizando catálogo...");
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf"
        }
      },
      "Analiza este catálogo de construcción. Extrae materiales y precios. Devuelve EXCLUSIVAMENTE un JSON array con este formato: [{\"nombre\": \"...\", \"precio\": 0.00, \"unidad\": \"...\", \"referencia\": \"...\"}]"
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Limpiamos el JSON (quitamos los ```json ... ``` si los trae)
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const materiales = JSON.parse(jsonString);

    console.log(`✅ ¡Éxito! Encontrados ${materiales.length} materiales.`);

    return NextResponse.json({ updates: materiales });

  } catch (error: any) {
    console.error("❌ Fallo en Gemini 2.5:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}