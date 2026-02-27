import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("🚀 [CHIVATO]: Iniciando envío directo a n8n...");

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const clienteManual = formData.get('clienteManual') as string;

    if (!file) throw new Error("No se detectó el archivo");

    // Preparamos un nuevo FormData para n8n
    const n8nFormData = new FormData();
    n8nFormData.append('file', file);
    n8nFormData.append('cliente', clienteManual);

    console.log(`📂 [CHIVATO]: Enviando PDF (${file.name}) a n8n...`);

    const n8nUrl = 'https://n8n.sianadigital.com/webhook-test/f466e885-eb72-4984-b756-3f1ebe243584';
    
    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      body: n8nFormData, // Enviamos el archivo completo
    });

    if (!n8nRes.ok) throw new Error(`n8n respondió con error ${n8nRes.status}`);

    // n8n debe devolver el JSON con las partidas y la obra tras procesarlo
    const resultFromN8n = await n8nRes.json();
    console.log("🎯 [CHIVATO]: n8n procesó el archivo y devolvió datos");

    return NextResponse.json(resultFromN8n);

  } catch (error: any) {
    console.error("❌ [CHIVATO ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}