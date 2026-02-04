export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    // 🕵️‍♂️ ESCÁNER: Preguntamos directamente qué modelos ve esta llave
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();

    console.log("--- LISTA DE MODELOS PARA LLAVE ...4Lto ---");
    console.log(JSON.stringify(data, null, 2));

    // Devolvemos la lista al chat para que la veas directamente en pantalla
    return new Response(JSON.stringify(data, null, 2), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}