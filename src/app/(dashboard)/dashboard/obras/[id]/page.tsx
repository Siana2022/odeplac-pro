'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { 
  MessageSquare, Truck, AlertTriangle, CheckCircle2, 
  Send, Clock, Eye, EyeOff, Loader2, ChevronLeft, Calendar
} from "lucide-react"
import Link from 'next/link'
import { toast } from 'sonner'

export default function DetalleObraPage({ params }: { params: { id: string } }) {
  const [obra, setObra] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [tipo, setTipo] = useState('comentario')
  const [esPublico, setEsPublico] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const fetchDatos = useCallback(async () => {
    setLoadingData(true)
    // Traemos los datos de la obra
    const { data: obraData } = await supabase
      .from('obras')
      .select('*, clientes(nombre)')
      .eq('id', params.id)
      .single()
    
    if (obraData) setObra(obraData)

    // Traemos el historial de seguimiento
    const { data: timeline } = await supabase
      .from('obra_seguimiento')
      .select('*')
      .eq('obra_id', params.id)
      .order('created_at', { ascending: false })
    
    if (timeline) setComentarios(timeline)
    setLoadingData(false)
  }, [params.id])

  useEffect(() => {
    fetchDatos()
  }, [fetchDatos])

  const enviarHito = async () => {
    if (!nuevoMensaje.trim()) return
    setLoading(true)
    const { error } = await supabase.from('obra_seguimiento').insert({
      obra_id: params.id,
      mensaje: nuevoMensaje,
      tipo: tipo,
      es_publico: esPublico
    })

    if (!error) {
      setNuevoMensaje('')
      fetchDatos()
      toast.success("Evento registrado en el muro")
    } else {
      toast.error("Error al publicar")
    }
    setLoading(false)
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
      <Loader2 className="animate-spin h-10 w-10 mb-4" />
      <p className="font-bold uppercase tracking-widest text-xs">Cargando Obra...</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* CABECERA DINÁMICA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/obras">
            <Button variant="outline" size="icon" className="rounded-xl border-white/10 text-white hover:bg-white/5">
              <ChevronLeft/>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase">{obra?.nombre || 'Obra'}</h1>
            <p className="text-blue-200/60 text-sm font-medium">Cliente: {obra?.clientes?.nombre || 'General'}</p>
          </div>
        </div>
        <div className="hidden md:block bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-zinc-500 uppercase">Estado actual</p>
            <p className="text-green-400 font-bold text-sm">En ejecución</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-zinc-100 sticky top-6">
            <h2 className="text-zinc-800 font-black text-lg mb-6 flex items-center gap-2 italic">
              <Calendar className="text-[#295693]" size={20}/> ACTUALIZAR OBRA
            </h2>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['comentario', 'logistica', 'retraso', 'hito'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                    tipo === t ? 'bg-[#295693] border-[#295693] text-white shadow-md' : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:border-zinc-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <textarea
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="¿Qué novedades hay?"
              className="w-full bg-zinc-50 border-none rounded-2xl p-4 text-zinc-800 outline-none min-h-[120px] resize-none focus:ring-2 ring-[#295693]/10 mb-4 font-medium text-sm"
            />

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setEsPublico(!esPublico)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  esPublico ? 'bg-green-50 border-green-200 text-green-700' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                }`}
              >
                {esPublico ? <Eye size={18}/> : <EyeOff size={18}/>}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {esPublico ? 'Visible para cliente' : 'Solo notas internas'}
                </span>
              </button>
              
              <Button onClick={enviarHito} disabled={loading} className="bg-[#295693] text-white rounded-2xl h-14 font-black shadow-lg hover:bg-[#1e3f6d] w-full">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                PUBLICAR EN EL MURO
              </Button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TIMELINE */}
        <div className="lg:col-span-7">
          <div className="relative space-y-6">
            {/* LÍNEA VERTICAL */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-zinc-200/30"></div>

            {comentarios.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                 <p className="text-zinc-500 font-bold italic">No hay registros todavía.</p>
              </div>
            ) : (
              comentarios.map((c) => (
                <div key={c.id} className="relative flex gap-6 group">
                  {/* CÍRCULO CON ICONO */}
                  <div className={`relative z-10 w-10 h-10 rounded-full border-4 border-[#121212] bg-white flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-110`}>
                    {getIcon(c.tipo)}
                  </div>
                  
                  {/* CAJA DE MENSAJE */}
                  <div className="flex-1 bg-white p-5 rounded-[28px] shadow-sm border border-zinc-100 group-hover:border-[#295693]/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                           c.tipo === 'retraso' ? 'bg-red-100 text-red-600' : 
                           c.tipo === 'hito' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-500'
                         }`}>
                           {c.tipo}
                         </span>
                         <span className="text-zinc-300">•</span>
                         <time className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           {new Date(c.created_at).toLocaleDateString()}
                         </time>
                      </div>
                      {c.es_publico && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Eye size={12}/>
                          <span className="text-[8px] font-black uppercase">Público</span>
                        </div>
                      )}
                    </div>
                    <p className="text-zinc-700 font-medium text-sm leading-relaxed">{c.mensaje}</p>
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