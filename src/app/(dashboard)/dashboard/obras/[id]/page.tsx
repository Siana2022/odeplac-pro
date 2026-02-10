'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { 
  MessageSquare, Truck, AlertTriangle, CheckCircle2, 
  Send, Clock, Eye, EyeOff, Loader2, ChevronLeft, Calendar
} from "lucide-react"
import Link from 'next/link'
import { toast } from 'sonner'

// Definimos la interfaz de params como una Promesa para Next.js 15
interface PageProps {
  params: Promise<{ id: string }>
}

export default function DetalleObraPage({ params }: PageProps) {
  // 🚀 UNWRAP de los params para evitar el error "undefined"
  const resolvedParams = use(params);
  const obraId = resolvedParams.id;

  const [obra, setObra] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [tipo, setTipo] = useState('comentario')
  const [esPublico, setEsPublico] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Función para cargar datos de la obra y su muro
  const fetchDatos = useCallback(async () => {
    if (!obraId) return;
    
    setLoadingData(true)
    console.log("🔍 [DEBUG] Cargando datos para Obra ID:", obraId);

    try {
      // 1. Datos de la obra
      const { data: obraData, error: obraError } = await supabase
        .from('obras')
        .select('*, clientes(nombre)')
        .eq('id', obraId)
        .single()
      
      if (obraError) throw obraError;
      setObra(obraData)

      // 2. Historial de seguimiento
      const { data: timeline, error: timelineError } = await supabase
        .from('obra_seguimiento')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
      
      if (timelineError) throw timelineError;
      setComentarios(timeline || [])
      
    } catch (err: any) {
      console.error("❌ [ERROR FETCH]:", err.message);
      toast.error("No se pudo cargar la información de la obra");
    } finally {
      setLoadingData(false)
    }
  }, [obraId])

  useEffect(() => {
    fetchDatos()
  }, [fetchDatos])

  // Función para publicar en el muro
  const enviarHito = async () => {
    if (!nuevoMensaje.trim() || !obraId) {
      toast.error("Escribe un mensaje antes de publicar");
      return;
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('obra_seguimiento').insert({
        obra_id: obraId,
        mensaje: nuevoMensaje,
        tipo: tipo,
        es_publico: esPublico
      })

      if (error) throw error;

      setNuevoMensaje('')
      toast.success("Hito registrado correctamente");
      fetchDatos(); // Refrescamos el muro
    } catch (err: any) {
      console.error("❌ [ERROR PUBLICAR]:", err.message);
      toast.error("Error al guardar en el muro");
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'logistica': return <Truck size={20} className="text-blue-500" />
      case 'retraso': return <AlertTriangle size={20} className="text-red-500" />
      case 'hito': return <CheckCircle2 size={20} className="text-green-500" />
      default: return <MessageSquare size={20} className="text-zinc-400" />
    }
  }

  if (loadingData) return (
    <div className="flex flex-col items-center justify-center py-24 text-white/50">
      <Loader2 className="animate-spin h-10 w-10 mb-4 text-[#295693]" />
      <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando con la obra...</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/obras">
            <Button variant="outline" size="icon" className="rounded-xl border-white/10 text-white hover:bg-[#295693]">
              <ChevronLeft size={20}/>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">
              {obra?.nombre || 'Expediente Obra'}
            </h1>
            <p className="text-blue-200/50 text-xs font-bold uppercase tracking-widest">
              Cliente: {obra?.clientes?.nombre || 'General'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LADO IZQUIERDO: INPUT */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[40px] p-6 shadow-2xl border border-zinc-100 sticky top-6">
            <div className="flex items-center gap-2 mb-6 text-[#295693]">
              <Calendar size={20} />
              <h2 className="font-black italic text-lg uppercase tracking-tight">Nuevo Evento</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['comentario', 'logistica', 'retraso', 'hito'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                    tipo === t ? 'bg-[#295693] border-[#295693] text-white shadow-lg' : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:border-zinc-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <textarea
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="¿Qué ha pasado hoy?"
              className="w-full bg-zinc-50 border-none rounded-3xl p-5 text-zinc-800 outline-none min-h-[140px] resize-none focus:ring-2 ring-[#295693]/10 mb-4 font-medium"
            />

            <div className="space-y-3">
              <button 
                onClick={() => setEsPublico(!esPublico)}
                className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  esPublico ? 'bg-green-50 border-green-200 text-green-700' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                }`}
              >
                {esPublico ? <Eye size={18}/> : <EyeOff size={18}/>}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {esPublico ? 'Visible para el cliente' : 'Nota interna privada'}
                </span>
              </button>
              
              <Button onClick={enviarHito} disabled={loading} className="bg-[#295693] text-white rounded-[24px] h-16 font-black shadow-xl hover:bg-[#1e3f6d] w-full text-sm">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Send size={20} className="mr-2" />}
                PUBLICAR EN EL MURO
              </Button>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: TIMELINE */}
        <div className="lg:col-span-7">
          <div className="relative space-y-8">
            {/* LÍNEA DE TIEMPO ESTÉTICA */}
            <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-zinc-200/50"></div>

            {comentarios.length === 0 ? (
              <div className="text-center py-24 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                 <MessageSquare className="mx-auto text-white/5 mb-4" size={48} />
                 <p className="text-zinc-500 font-bold italic">No hay actividad registrada en esta obra.</p>
              </div>
            ) : (
              comentarios.map((c) => (
                <div key={c.id} className="relative flex gap-6 group">
                  {/* BURBUJA TIPO */}
                  <div className={`relative z-10 w-12 h-12 rounded-2xl border-4 border-[#121212] bg-white flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:rotate-12`}>
                    {getIcon(c.tipo)}
                  </div>
                  
                  {/* MENSAJE */}
                  <div className="flex-1 bg-white p-6 rounded-[32px] shadow-sm border border-zinc-100 transition-all hover:shadow-xl hover:border-[#295693]/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                           c.tipo === 'retraso' ? 'bg-red-50 text-red-600' : 
                           c.tipo === 'hito' ? 'bg-green-50 text-green-600' : 
                           c.tipo === 'logistica' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-500'
                         }`}>
                           {c.tipo}
                         </span>
                         <time className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                           {new Date(c.created_at).toLocaleDateString()} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </time>
                      </div>
                      {c.es_publico && (
                        <div className="bg-green-100 text-green-700 p-1.5 rounded-full" title="Visible para el cliente">
                          <Eye size={12}/>
                        </div>
                      )}
                    </div>
                    <p className="text-zinc-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">{c.mensaje}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}