import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];

    const normalize = (text: string) =>
      text.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[¿?.,!]/g, "")
          .trim();

    const currentMsgRaw = rawMessages[rawMessages.length - 1].content;
    const cleanMsg = normalize(currentMsgRaw);
    const lastMsg = rawMessages.length > 1 ? normalize(rawMessages[rawMessages.length - 2].content) : "";

    // Carga de datos en paralelo (incluyendo sistemas maestros para contexto)
    const [{ data: cl }, { data: ob }, { data: pr }, { data: ma }, { data: sm }] = await Promise.all([
      supabase.from('clientes').select('nombre'),
      supabase.from('obras').select('id, titulo, estado, clientes(nombre), obra_seguimiento(mensaje, created_at, tipo)'),
      supabase.from('proveedores').select('nombre'),
      supabase.from('materiales').select('nombre, precio_coste, unidad'),
      supabase.from('sistemas_maestros').select('nombre, palabras_clave'),
    ]);

    const numMat = ma?.length || 0;

    // A. SALUDOS
    if (cleanMsg === "hola" || cleanMsg === "buenos dias" || cleanMsg === "buenas tardes") {
      return res("¡Hola! Soy OdeplacAI. ¿En qué puedo ayudarte hoy?");
    }

    // B. OBRAS
    if (cleanMsg.includes("obra") || cleanMsg.includes("proyecto") || cleanMsg.includes("estado") || cleanMsg.includes("seguimiento") || cleanMsg.includes("asignada")) {
      if (ob && ob.length > 0) {
        const palabrasRuido = ["como", "va", "el", "proyecto", "de", "obra", "seguimiento", "estado", "que", "reforma", "oficina", "cliente", "asignada", "estan"];
        const palabrasBusqueda = cleanMsg.split(" ").filter(p => p.length > 3 && !palabrasRuido.includes(p));

        let obrasFiltradas = ob;
        if (palabrasBusqueda.length > 0) {
          const posibles = ob.filter(o => {
            const tituloNorm = normalize(o.titulo);
            return palabrasBusqueda.some(pb => tituloNorm.includes(pb));
          });
          if (posibles.length > 0) obrasFiltradas = posibles;
        }

        const detalleObras = obrasFiltradas.map(o => {
          const nombreCliente = (o.clientes as any)?.nombre || "Cliente no asignado";
          let textoSeguimiento = "Sin novedades.";
          if (o.obra_seguimiento && Array.isArray(o.obra_seguimiento) && o.obra_seguimiento.length > 0) {
            const ordenados = [...o.obra_seguimiento].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const cantidad = obrasFiltradas.length === 1 ? 2 : 1;
            textoSeguimiento = ordenados.slice(0, cantidad).map(m => `${m.mensaje} (${m.tipo || 'comentario'})`).join(" | ");
          }
          return `- **${o.titulo}**\n  *Cliente:* ${nombreCliente}\n  *Estado:* ${o.estado}\n  *Novedad:* ${textoSeguimiento}`;
        }).join("\n\n");

        const prefijo = obrasFiltradas.length === 1 ? "Detalle de la obra:" : "Listado de obras y sus clientes:";
        return res(`${prefijo}\n\n${detalleObras}`);
      }
    }

    // C. CLIENTES
    if (cleanMsg.includes("cliente") || (cleanMsg.includes("cuales") && lastMsg.includes("cliente"))) {
      return res(`Tus clientes registrados:\n${cl?.map(c => `- ${c.nombre}`).join("\n")}`);
    }

    // D. MATERIALES — búsqueda directa en catálogo
    const stopWords = ["tengo", "donde", "cuales", "quien", "esta", "tenemos", "hay", "eres", "tiempo", "quiero", "necesito"];
    const palabrasInteres = cleanMsg.split(" ").filter(p => p.length > 3 && !stopWords.includes(p));

    if (palabrasInteres.length > 0) {
      const variaciones = palabrasInteres.flatMap(p => {
        const v = [p];
        if (p.endsWith('es') && p.length > 4) v.push(p.slice(0, -2));
        if (p.endsWith('s') && !p.endsWith('es')) v.push(p.slice(0, -1));
        return v;
      });
      const encontrados = ma?.filter(m => {
        const nombreMat = normalize(m.nombre);
        return variaciones.some(v => nombreMat.includes(v));
      });
      if (encontrados && encontrados.length > 0) {
        const lista = encontrados.slice(0, 15).map(m => `- ${m.nombre}: ${m.precio_coste}€/${m.unidad || 'ud'}`).join("\n");
        return res(`He encontrado estos materiales en el catálogo:\n\n${lista}`);
      }
    }

    // E. GEMINI — con contexto completo del catálogo y sistemas maestros
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const catalogoMateriales = ma?.slice(0, 120)
      .map(m => `${m.nombre} (${m.precio_coste}€/${m.unidad || 'ud'})`)
      .join(", ") || "";

    const sistemasList = sm?.map(s =>
      `${s.nombre}: keywords [${(s.palabras_clave || []).join(', ')}]`
    ).join("\n") || "";

    const systemPrompt = `Eres OdeplacAI, el asistente experto de ODEPLAC PRO, empresa española de construcciones en seco (Pladur, tabiquería, falsos techos, suelos técnicos).

Tu misión principal: cuando alguien pide materiales o una partida de presupuesto (ej: "tabiquería", "falso techo", "suelo técnico"), explica qué materiales se necesitan y el coste aproximado usando el catálogo real de la empresa.

CATÁLOGO DE MATERIALES DISPONIBLE (${numMat} materiales en total, muestra):
${catalogoMateriales}

SISTEMAS DE TRABAJO CONOCIDOS:
${sistemasList}

DATOS DE LA EMPRESA:
- Clientes: ${cl?.map(c => c.nombre).join(', ') || 'N/A'}
- Proveedores: ${pr?.map(p => p.nombre).join(', ') || 'N/A'}

REGLAS:
- Responde siempre en español
- Sé conciso y profesional
- Si piden materiales para una partida, lista los más relevantes del catálogo con sus precios reales
- Usa los sistemas maestros para entender qué materiales componen cada tipo de trabajo
- Si no tienes datos suficientes, dilo claramente y sugiere qué información necesitas`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Pregunta del usuario: ${currentMsgRaw}` },
    ]);

    return res(result.response.text().trim());

  } catch (error: any) {
    console.error("Error en chat:", error);
    return res("Lo siento, hubo un error al procesar tu consulta. Inténtalo de nuevo.");
  }
}

function res(content: string) {
  return NextResponse.json({ id: Date.now().toString(), role: "assistant", content });
}
