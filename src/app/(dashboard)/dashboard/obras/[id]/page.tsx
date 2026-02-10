'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { 
  MessageSquare, Truck, AlertTriangle, CheckCircle2, 
  Send, Clock, Eye, EyeOff, Loader2 
} from "lucide-react"
import { toast } from 'sonner'

export default function TimelineObra({ params }: { params: { id: string } }) {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [tipo, setTipo] = useState('comentario')
  const [esPublico, setEsPublico] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchSeguimiento() }, [])

  const fetchSeguimiento = async () => {
    const { data } = await supabase
      .from('obra_seguimiento')
      .select('*')
      .eq('obra_id', params.id)
      .order('created_at', { ascending: false })
    if (data) setComentarios(data)
  }

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
      fetchSeguimiento()
      toast.success("Hito registrado")
    }
    setLoading(false)
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'logistica': return <Truck className="text-blue-500" />
      case 'retraso': return <AlertTriangle className="text-red-500" />
      case 'hito': return <CheckCircle2 className="text-green-500" />
      default: return <MessageSquare className="text-zinc-400" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* SELECTOR DE TIPO Y ENTRADA */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl border border-zinc-100">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['comentario', 'logistica', 'retraso', 'hito'].map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tipo === t ? 'bg-[#295693] text-white shadow-lg' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="¿Qué ha pasado hoy en la obra?"
          className="w-full bg-zinc-50 border-none rounded-2xl p-4 text-zinc-800 outline-none min-h-[100px] resize-none focus:ring-2 ring-[#295693]/20"
        />

        <div className="flex justify-between items-center mt-4">
          <button 
            onClick={() => setEsPublico(!esPublico)}
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter ${esPublico ? 'text-green-600' : 'text-zinc-400'}`}
          >
            {esPublico ? <Eye size={16}/> : <EyeOff size={16}/>}
            {esPublico ? 'Visible para cliente' : 'Solo interno'}
          </button>
          
          <Button onClick={enviarHito} disabled={loading} className="bg-[#295693] text-white rounded-xl px-8 font-bold">
            {loading ? <Loader2 className="animate-spin" /> : <Send size={18} className="mr-2" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* MURO DE NOTICIAS */}
      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
        {comentarios.map((c) => (
          <div key={c.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            {/* ICONO CENTRAL */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow-md z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              {getIcon(c.tipo)}
            </div>
            
            {/* CONTENIDO */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-[24px] shadow-sm border border-zinc-100">
              <div className="flex items-center justify-between mb-2">
                <time className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={12}/> {new Date(c.created_at).toLocaleDateString()}
                </time>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${c.es_publico ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  {c.es_publico ? 'Público' : 'Privado'}
                </span>
              </div>
              <p className="text-zinc-700 font-medium text-sm leading-relaxed">{c.mensaje}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}