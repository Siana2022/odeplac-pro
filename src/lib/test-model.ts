import { GoogleGenerativeAI } from "@google/generative-ai";

export async function listarModelosDisponibles() {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  
  try {
    // Intentamos listar los modelos
    // Nota: Esta función a veces requiere permisos de administrador, 
    // pero nos servirá para ver qué error escupe o si nos da la lista.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log("--- LISTA DE MODELOS DISPONIBLES ---");
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error al consultar modelos:", error);
  }
}