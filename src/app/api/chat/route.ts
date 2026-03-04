import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; 

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
    
    // 1. CARGA DE DATOS (Añadimos la relación con la tabla clientes)
    const [ { data: cl }, { data: ob }, { data: pr }, { data: ma } ] = await Promise.all([
      supabase.from('clientes').select('nombre'),
      // Traemos el título, estado, el seguimiento Y el nombre del cliente asociado
      supabase.from('obras').select('id, titulo, estado, clientes(nombre), obra_seguimiento(mensaje, created_at, tipo)'), 
      supabase.from('proveedores').select('nombre'),
      supabase.from('materiales').select('nombre, precio_coste')
    ]);

    const numMat = ma?.length || 0;

    // --- LÓGICA DE PRIORIDAD ODEPLAC ---

    // A. SALUDOS
    if (cleanMsg === "hola" || cleanMsg === "buenos dias" || cleanMsg === "buenas tardes") {
        return res("¡Hola Omayra! Soy OdeplacAI. ¿En qué puedo ayudarte hoy?");
    }

    // B. LÓGICA DE OBRAS (Ahora incluye CLIENTE)
    if (cleanMsg.includes("obra") || cleanMsg.includes("proyecto") || cleanMsg.includes("estado") || cleanMsg.includes("seguimiento") || cleanMsg.includes("va") || cleanMsg.includes("asignada")) {
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
          // Extraemos el nombre del cliente (manejando que clientes es un objeto o array según la relación)
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

    // C. MATERIALES, CLIENTES Y PROVEEDORES (Se mantiene igual)
    // ... (resto del código del paso anterior)
    
    // NOTA: Para abreviar incluyo solo la lógica de materiales y clientes debajo:
    if (cleanMsg.includes("cliente") || (cleanMsg.includes("cuales") && lastMsg.includes("cliente"))) {
      return res(`Tus clientes registrados:\n${cl?.map(c => `- ${c.nombre}`).join("\n")}`);
    }

    const palabrasChat = cleanMsg.split(" ");
    const stopWords = ["tengo", "donde", "cuales", "quien", "esta", "tenemos", "hay", "eres", "tiempo"];
    const palabrasInteres = palabrasChat.filter(p => p.length > 3 && !stopWords.includes(p));
    
    if (palabrasInteres.length > 0) {
      const variaciones = palabrasInteres.flatMap(p => {
        let v = [p];
        if (p.endsWith('es') && p.length > 4) v.push(p.slice(0, -2)); 
        if (p.endsWith('s') && !p.endsWith('es')) v.push(p.slice(0, -1)); 
        return v;
      });
      const encontrados = ma?.filter(m => {
        const nombreMat = normalize(m.nombre);
        return variaciones.some(v => nombreMat.includes(v));
      });
      if (encontrados && encontrados.length > 0) {
        const lista = encontrados.slice(0, 15).map(m => `- ${m.nombre}: ${m.precio_coste}€`).join("\n");
        return res(`He encontrado estos materiales:\n\n${lista}`);
      }
    }

    // IA PARA EL RESTO
    const response = await fetch("http://5.189.161.169:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:1b",
        prompt: `Asistente OdeplacAI. Breve. Pregunta: ${currentMsgRaw}`,
        stream: false,
        options: { temperature: 0.2 }
      })
    });
    const data = await response.json();
    return res(data.response.trim());

  } catch (error: any) {
    return res("Error al consultar los datos.");
  }
}

function res(content: string) {
  return NextResponse.json({ id: Date.now().toString(), role: "assistant", content });
}