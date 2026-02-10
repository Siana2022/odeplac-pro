'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { 
  Mail, Phone, MapPin, ChevronLeft, 
  MessageSquare, Truck, AlertTriangle, CheckCircle2,
  Clock, Loader2, Sparkles, LayoutDashboard
} from "lucide-react"
import Link from 'next/link'

export default function DetalleClientePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clienteId = resolvedParams.id;

  const [cliente, setCliente] = useState<any>(null)
  const [obras, setObras] = useState<any[]>([])
  const [timelineGlobal, setTimelineGlobal] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodo = useCallback(async () => {
    setLoading(true)
    
    // 1. Datos del Cliente
    const { data: cli } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
    setCliente(cli)

    // 2. Obras de este cliente
    const { data: obs } = await supabase.from('obras').select('*').eq('cliente_id', clienteId)
    setObras(obs || [])

    if (obs && obs.length > 0) {
      // 3. Timeline Global: Traemos los hitos de TODAS sus obras de golpe
      const idsObras = obs.map(o => o.id)
      const { data: seguimiento } = await supabase
        .from('obra_seguimiento')
        .select('*, obras(nombre)') // Traemos el nombre de la obra para saber de cuál es cada hito
        .in('obra_id', idsObras)
        .order('created_at', { ascending: false })
      
      setTimelineGlobal(seguimiento || [])
    }

    setLoading(false)
  }, [clienteId])

  useEffect(() => { fetchTodo() }, [fetchTodo])

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'logistica': return <Truck size={16} className="text-blue-500" />
      case 'retraso': return <AlertTriangle size={16} className="text-red-500" />
      case 'hito': return <CheckCircle2 size={16} className="text-green-500" />
      default: return <MessageSquare size={16} className="text-zinc-400" />
    }
  }

  if (loading) return <div className="p-20 text-center text-white/50"><Loader2 className="animate-spin mx-auto mb-4"/> Cargando ficha...</div>

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clientes"><Button variant="outline" size="icon" className="rounded-xl border-white/10 text-white"><ChevronLeft/></Button></Link>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">{cliente?.nombre}</h1>
        </div>
        <Button className="bg-white/5 text-white border border-white/10 rounded-2xl font-bold hover:bg-[#295693]">
          <Sparkles className="mr-2 h-4 w-4 text-blue-400" /> Consultar IA sobre este cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INFO CONTACTO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-8 text-white">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-6">Información de Contacto</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-300"><Mail size={18}/><span className="text-sm font-medium">{cliente?.email || 'Sin email'}</span></div>
              <div className="flex items-center gap-3 text-zinc-300"><Phone size={18}/><span className="text-sm font-medium">{cliente?.telefono || 'Sin teléfono'}</span></div>
              <div className="flex items-center gap-3 text-zinc-300"><MapPin size={18}/><span className="text-sm font-medium">{cliente?.direccion || 'Sin dirección'}</span></div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-8 text-white">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-6 italic">Proyectos Activos</h2>
            <div className="space-y-3">
              {obras.map(o => (
                <Link key={o.id} href={`/dashboard/obras/${o.id}`}>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-[#295693] transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <LayoutDashboard size={18} className="text-zinc-500 group-hover:text-blue-400"/>
                      <span className="text-sm font-bold">{o.nombre}</span>
                    </div>
                    <span className="text-[8px] font-black px-2 py-0.5 bg-green-500/20 text-green-400 rounded-md uppercase">{o.estado}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* TIMELINE GLOBAL UNIFICADO */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[40px] p-8 shadow-2xl min-h-[500px]">
            <h2 className="text-zinc-800 font-black text-xl mb-8 italic uppercase tracking-tighter flex items-center gap-3">
              <Clock className="text-[#295693]" /> Muro de Actividad Reciente
            </h2>

            <div className="space-y-6 relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-zinc-100"></div>

              {timelineGlobal.length === 0 ? (
                <p className="text-center py-20 text-zinc-400 font-bold italic">No hay actividad registrada en sus obras.</p>
              ) : (
                timelineGlobal.map((h) => (
                  <div key={h.id} className="relative flex gap-6 group">
                    <div className="relative z-10 w-10 h-10 rounded-xl border-2 border-white bg-zinc-50 flex items-center justify-center shadow-sm shrink-0">
                      {getIcon(h.tipo)}
                    </div>
                    <div className="flex-1 bg-zinc-50/50 p-5 rounded-[24px] border border-zinc-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-[#295693] uppercase tracking-tighter">
                            {h.obras?.nombre}
                          </span>
                          <span className="text-zinc-300 text-xs">•</span>
                          <time className="text-[10px] font-bold text-zinc-400">
                            {new Date(h.created_at).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                      <p className="text-zinc-700 text-sm font-medium">{h.mensaje}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}