import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

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
    const trainingMode = body.training === true;

    const normalize = (text: string) =>
      text.toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[¿?.,!]/g, "")
          .trim();

    const currentMsgRaw = rawMessages[rawMessages.length - 1].content;
    const cleanMsg = normalize(currentMsgRaw);
    const lastMsg = rawMessages.length > 1 ? normalize(rawMessages[rawMessages.length - 2].content) : "";

    const isTraining = trainingMode || TRAINING_TRIGGERS.some(t => cleanMsg.includes(normalize(t)));

    // ── MODO ENTRENAMIENTO ────────────────────────────────────────────────────
    if (isTraining) {
      // 1. Cargar catálogo completo para hacer matching
      const { data: catalogoMateriales } = await supabase
        .from('materiales')
        .select('id, nombre, unidad, precio_coste');

      // 2. Gemini extrae el conocimiento estructurado
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const catalogoTexto = catalogoMateriales
        ?.slice(0, 150)
        .map(m => `"${m.nombre}" (${m.unidad})`)
        .join(", ") || "";

      const extractPrompt = `El usuario quiere enseñarte un nuevo sistema de construcción en seco.
Extrae la información y devuelve ÚNICAMENTE este JSON:
{
  "nombre": "nombre del sistema (ej: Tabiquería Sencilla 15mm)",
  "keywords": ["tabiquería", "tabique", "sencilla", "15mm"],
  "descripcion": "descripción breve",
  "categoria": "materiales | sistemas | precios | procesos | general",
  "respuesta_texto": "resumen completo del conocimiento para el chat",
  "materiales": [
    {
      "descripcion_usuario": "como lo describió el usuario",
      "cantidad_por_m2": 2.0,
      "unidad": "ud | m2 | kg | ml | saco"
    }
  ]
}

CATÁLOGO REAL DE MATERIALES DISPONIBLE (usa estos nombres para hacer matching):
${catalogoTexto}

Para cada material que mencione el usuario, intenta encontrar el nombre más parecido del catálogo real.
Si no encuentras match exacto, usa la descripción del usuario tal cual.

Mensaje del usuario: "${currentMsgRaw}"`;

      const result = await model.generateContent(extractPrompt);
      const text = result.response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();

      let extraido: any;
      try {
        extraido = JSON.parse(text);
      } catch {
        return res("No he podido procesar bien el conocimiento. ¿Puedes reformularlo?\nEj: *\"Aprende que para tabiquería sencilla necesitamos 2 placas de yeso 15mm por m², 1 montante 48mm por metro y 0.5kg de pasta\"*");
      }

      // 3. Guardar en ia_conocimientos (siempre)
      await supabase.from('ia_conocimientos').insert([{
        pregunta: extraido.nombre,
        respuesta: extraido.respuesta_texto,
        keywords: extraido.keywords || [],
        categoria: extraido.categoria || 'sistemas',
      }]);

      // 4. Intentar matching de materiales con el catálogo real
      const materialesExtraidos: any[] = extraido.materiales || [];
      const materialesConMatch: any[] = [];
      const materialesSinMatch: string[] = [];

      for (const matEx of materialesExtraidos) {
        const descripNorm = normalize(matEx.descripcion_usuario);
        const palabras = descripNorm.split(' ').filter((p: string) => p.length > 2);

        // Buscar en catálogo: puntuar por cuántas palabras coinciden
        const candidatos = (catalogoMateriales || [])
          .map(m => ({
            ...m,
            score: palabras.filter((p: string) => normalize(m.nombre).includes(p)).length,
          }))
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score);

        if (candidatos.length > 0 && candidatos[0].score >= Math.max(1, Math.floor(palabras.length * 0.4))) {
          materialesConMatch.push({
            material_id: candidatos[0].id,
            material_nombre: candidatos[0].nombre,
            cantidad_por_m2: matEx.cantidad_por_m2 || 1,
            descripcion_usuario: matEx.descripcion_usuario,
          });
        } else {
          materialesSinMatch.push(matEx.descripcion_usuario);
        }
      }

      // 5. Crear Sistema Maestro si tenemos al menos un material del catálogo
      let sistemaCreado = false;
      let sistemaId: string | null = null;

      if (materialesConMatch.length > 0) {
        const { data: nuevoSistema, error: errSistema } = await supabase
          .from('sistemas_maestros')
          .insert([{
            nombre: extraido.nombre,
            palabras_clave: extraido.keywords || [],
            descripcion: extraido.descripcion || '',
          }])
          .select()
          .single();

        if (!errSistema && nuevoSistema) {
          sistemaId = nuevoSistema.id;

          // Crear composición del sistema con los materiales encontrados
          const composicion = materialesConMatch.map(m => ({
            sistema_id: sistemaId,
            material_id: m.material_id,
            cantidad_por_m2: m.cantidad_por_m2,
          }));

          const { error: errComp } = await supabase
            .from('sistema_composicion')
            .insert(composicion);

          if (!errComp) sistemaCreado = true;
        }
      }

      // 6. Respuesta detallada
      let respuesta = `✅ **Conocimiento guardado: ${extraido.nombre}**\n`;

      if (sistemaCreado) {
        respuesta += `\n📋 **Sistema Maestro creado** — ya está disponible en presupuestos:\n`;
        materialesConMatch.forEach(m => {
          respuesta += `  • ${m.material_nombre} → ${m.cantidad_por_m2} por m²\n`;
        });
      }

      if (materialesSinMatch.length > 0) {
        respuesta += `\n⚠️ **No encontré estos materiales en el catálogo:**\n`;
        materialesSinMatch.forEach(m => {
          respuesta += `  • ${m}\n`;
        });
        respuesta += `\n¿Están en tu catálogo de materiales? Si los añades, el sistema los usará automáticamente.`;
      }

      if (!sistemaCreado && materialesSinMatch.length === materialesExtraidos.length) {
        respuesta += `\n💬 Guardado en el chat pero no pude crear el Sistema Maestro para presupuestos porque no encontré los materiales en tu catálogo.`;
      }

      return res(respuesta);
    }

    // ── MODO CONSULTA NORMAL ──────────────────────────────────────────────────
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

    // F. GEMINI con conocimiento entrenado como prioridad máxima
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const catalogoMateriales = ma?.slice(0, 120)
      .map(m => `${m.nombre} (${m.precio_coste}€/${m.unidad || 'ud'})`)
      .join(", ") || "";

    const sistemasList = sm?.map(s =>
      `${s.nombre}: keywords [${(s.palabras_clave || []).join(', ')}]`
    ).join("\n") || "";

    const conocimientoContext = conocimientosRelevantes.length > 0
      ? `\n\nCONOCIMIENTO ESPECÍFICO APRENDIDO — PRIORIDAD MÁXIMA:\n${
          conocimientosRelevantes.map(c => `📌 ${c.pregunta}\n${c.respuesta}`).join('\n\n')
        }\n`
      : '';

    const systemPrompt = `Eres OdeplacAI, el asistente experto de ODEPLAC PRO, empresa española de construcciones en seco.
${conocimientoContext}
CATÁLOGO DE MATERIALES (${numMat} en total, muestra):
${catalogoMateriales}

SISTEMAS CONOCIDOS:
${sistemasList}

EMPRESA: Clientes: ${cl?.map(c => c.nombre).join(', ') || 'N/A'} | Proveedores: ${pr?.map(p => p.nombre).join(', ') || 'N/A'}

REGLAS: Responde en español, sé conciso. Usa el conocimiento aprendido con máxima prioridad. Si hay un Sistema Maestro creado para una partida, indícalo.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Pregunta: ${currentMsgRaw}` },
    ]);

    return res(result.response.text().trim());

  } catch (error: any) {
    console.error("Error en chat:", error);
    return res("Lo siento, hubo un error. Inténtalo de nuevo.");
  }
}

function res(content: string) {
  return NextResponse.json({ id: Date.now().toString(), role: "assistant", content });
}
