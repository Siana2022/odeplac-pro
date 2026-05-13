import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

// Palabras que indican intención de entrenamiento
const TRAINING_TRIGGERS = [
  "aprende que", "aprende:", "recuerda que", "cuando pregunten",
  "cuando alguien pregunte", "guarda esto", "corrigelo", "corrige esto",
  "eso estaba mal", "la respuesta correcta", "te enseño", "añade que",
  "agrega que", "nuevo conocimiento",
];

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const rawMessages = body.messages || [];
    const trainingMode = body.training === true; // flag explícito del cliente

    const normalize = (text: string) =>
      text.toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[¿?.,!]/g, "")
          .trim();

    const currentMsgRaw = rawMessages[rawMessages.length - 1].content;
    const cleanMsg = normalize(currentMsgRaw);
    const lastMsg = rawMessages.length > 1 ? normalize(rawMessages[rawMessages.length - 2].content) : "";

    // Detectar si es intención de entrenamiento
    const isTraining = trainingMode || TRAINING_TRIGGERS.some(t => cleanMsg.includes(normalize(t)));

    // ── MODO ENTRENAMIENTO ────────────────────────────────────────────────────
    if (isTraining) {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const extractPrompt = `El usuario quiere enseñarte un nuevo conocimiento sobre construcción en seco.
Extrae la información y devuelve ÚNICAMENTE un JSON con esta estructura:
{
  "pregunta": "tema o pregunta que activa este conocimiento (conciso, ej: 'tabiquería sencilla 15mm')",
  "respuesta": "el conocimiento completo tal como lo explicó el usuario",
  "keywords": ["array", "de", "palabras", "clave", "para", "encontrarlo"],
  "categoria": "una de: materiales | sistemas | precios | procesos | general"
}

Mensaje del usuario: "${currentMsgRaw}"`;

      const result = await model.generateContent(extractPrompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();

      let conocimiento: any;
      try {
        conocimiento = JSON.parse(text);
      } catch {
        return res("Lo siento, no he podido extraer el conocimiento correctamente. ¿Puedes reformularlo? Por ejemplo: *\"Aprende que para tabiquería sencilla necesitamos...\"*");
      }

      const { error } = await supabase.from('ia_conocimientos').insert([{
        pregunta: conocimiento.pregunta,
        respuesta: conocimiento.respuesta,
        keywords: conocimiento.keywords || [],
        categoria: conocimiento.categoria || 'general',
      }]);

      if (error) {
        console.error("Error guardando conocimiento:", error);
        return res("Hubo un error al guardar. Inténtalo de nuevo.");
      }

      return res(`✅ **Conocimiento guardado.**\n\n**Tema:** ${conocimiento.pregunta}\n**Categoría:** ${conocimiento.categoria}\n**Keywords:** ${(conocimiento.keywords || []).join(', ')}\n\nAhora lo usaré cuando alguien pregunte sobre ello.`);
    }

    // ── MODO CONSULTA NORMAL ──────────────────────────────────────────────────

    // Carga de datos en paralelo
    const [{ data: cl }, { data: ob }, { data: pr }, { data: ma }, { data: sm }, { data: conocimientos }] = await Promise.all([
      supabase.from('clientes').select('nombre'),
      supabase.from('obras').select('id, titulo, estado, clientes(nombre), obra_seguimiento(mensaje, created_at, tipo)'),
      supabase.from('proveedores').select('nombre'),
      supabase.from('materiales').select('nombre, precio_coste, unidad'),
      supabase.from('sistemas_maestros').select('nombre, palabras_clave'),
      supabase.from('ia_conocimientos').select('pregunta, respuesta, keywords, categoria').eq('activo', true),
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

    // D. Buscar conocimiento entrenado relevante
    const conocimientosRelevantes = conocimientos?.filter(c => {
      const keywords = (c.keywords || []).map((k: string) => normalize(k));
      const preguntaNorm = normalize(c.pregunta);
      return keywords.some((k: string) => k.length > 2 && cleanMsg.includes(k)) ||
             preguntaNorm.split(' ').filter((w: string) => w.length > 3).some((w: string) => cleanMsg.includes(w));
    }) || [];

    // E. MATERIALES — búsqueda directa en catálogo (si no hay conocimiento entrenado)
    if (conocimientosRelevantes.length === 0) {
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
    }

    // F. GEMINI — con conocimiento entrenado + contexto del catálogo
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const catalogoMateriales = ma?.slice(0, 120)
      .map(m => `${m.nombre} (${m.precio_coste}€/${m.unidad || 'ud'})`)
      .join(", ") || "";

    const sistemasList = sm?.map(s =>
      `${s.nombre}: keywords [${(s.palabras_clave || []).join(', ')}]`
    ).join("\n") || "";

    // Conocimiento entrenado como prioridad máxima
    const conocimientoContext = conocimientosRelevantes.length > 0
      ? `\n\nCONOCIMIENTO ESPECÍFICO APRENDIDO — USA ESTO COMO PRIORIDAD MÁXIMA:\n${
          conocimientosRelevantes.map(c => `📌 Tema: ${c.pregunta}\n${c.respuesta}`).join('\n\n')
        }\n`
      : '';

    const systemPrompt = `Eres OdeplacAI, el asistente experto de ODEPLAC PRO, empresa española de construcciones en seco (Pladur, tabiquería, falsos techos, suelos técnicos).
${conocimientoContext}
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
- Si tienes conocimiento específico aprendido, úsalo por encima de todo lo demás
- Si piden materiales para una partida, lista los más relevantes con precios reales
- Si no tienes datos suficientes, dilo claramente`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Pregunta: ${currentMsgRaw}` },
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
