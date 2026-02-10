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
    if (!clienteId) return;
    setLoading(true)
    
    console.log("🔍 [DEBUG] Buscando datos para cliente:", clienteId);

    // 1. Datos del Cliente
    const { data: cli } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
    if (cli) setCliente(cli)

    // 2. Obras de este cliente
    const { data: obs } = await supabase.from('obras').select('*').eq('cliente_id', clienteId)
    setObras(obs || [])
    console.log("✅ [DEBUG] Obras encontradas:", obs?.length);

    if (obs && obs.length > 0) {
      // 3. Timeline Global: IDs de todas las obras de este cliente
      const idsObras = obs.map(o => o.id)
      
      const { data: seguimiento, error: segError } = await supabase
        .from('obra_seguimiento')
        .select('*') // Primero traemos todo de forma simple
        .in('obra_id', idsObras)
        .order('created_at', { ascending: false })
      
      if (segError) {
        console.error("❌ [ERROR TIMELINE]:", segError.message);
      } else {
        // Mapeamos los nombres de las obras manualmente para no depender de JOINS complejos
        const timelineConNombres = seguimiento?.map(h => ({
          ...h,
          nombre_obra: obs.find(o => o.id === h.obra_id)?.nombre || 'Obra'
        }))
        setTimelineGlobal(timelineConNombres || [])
        console.log("✅ [DEBUG] Comentarios encontrados:", seguimiento?.length);
      }
    }

    setLoading(false)
  }, [clienteId])

  useEffect(() => { fetchTodo() }, [fetchTodo])

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'logistica': return <Truck size={18} className="text-blue-500" />
      case 'retraso': return <AlertTriangle size={18} className="text-red-500" />
      case 'hito': return <CheckCircle2 size={18} className="text-green-500" />
      default: return <MessageSquare size={18} className="text-zinc-400" />
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-white/50">
      <Loader2 className="animate-spin h-10 w-10 mb-4" />
      <p className="font-bold uppercase tracking-widest text-[10px]">Cargando historial del cliente...</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clientes">
            <Button variant="outline" size="icon" className="rounded-xl border-white/10 text-white hover:bg-white/5">
              <ChevronLeft size={20}/>
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
            {cliente?.nombre || 'Cliente'}
          </h1>
        </div>
        <Button className="w-full md:w-auto bg-white/5 text-white border border-white/10 rounded-2xl font-bold hover:bg-[#295693] h-12">
          <Sparkles className="mr-2 h-4 w-4 text-blue-400" /> Consultar IA sobre este cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INFO CONTACTO Y OBRAS */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tarjeta Contacto */}
          <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-[40px] p-8 text-white">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-6 italic">Contacto Directo</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-zinc-300">
                <div className="bg-white/5 p-2 rounded-lg"><Mail size={16}/></div>
                <span className="text-sm font-medium truncate">{cliente?.email || 'Sin email'}</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-300">
                <div className="bg-white/5 p-2 rounded-lg"><Phone size={16}/></div>
                <span className="text-sm font-medium">{cliente?.telefono || 'Sin teléfono'}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Obras */}
          <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-[40px] p-8 text-white">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-6 italic">Proyectos vinculados</h2>
            <div className="space-y-3">
              {obras.length === 0 ? (
                <p className="text-xs text-zinc-500 font-bold italic">No hay proyectos activos.</p>
              ) : (
                obras.map(o => (
                  <Link key={o.id} href={`/dashboard/obras/${o.id}`}>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5 hover:border-[#295693]/40 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <LayoutDashboard size={18} className="text-zinc-500 group-hover:text-blue-400 transition-colors"/>
                        <span className="text-sm font-bold tracking-tight">{o.nombre}</span>
                      </div>
                      <span className="text-[8px] font-black px-2 py-1 bg-green-500/10 text-green-400 rounded-md uppercase">
                        {o.estado || 'CURSO'}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MURO GLOBAL */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[48px] p-8 shadow-2xl min-h-[600px] border border-zinc-100">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-zinc-800 font-black text-2xl italic uppercase tracking-tighter flex items-center gap-3">
                <Clock className="text-[#295693]" size={24} /> Actividad Reciente
              </h2>
              <span className="bg-zinc-100 text-[10px] font-black px-4 py-1.5 rounded-full text-zinc-400 uppercase tracking-widest">
                Total: {timelineGlobal.length}
              </span>
            </div>

            <div className="space-y-8 relative">
              {/* LÍNEA VERTICAL */}
              <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-zinc-100"></div>

              {timelineGlobal.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-zinc-300">
                   <MessageSquare size={48} className="opacity-10 mb-4" />
                   <p className="font-bold italic">No hay actividad registrada en ninguna obra.</p>
                </div>
              ) : (
                timelineGlobal.map((h) => (
                  <div key={h.id} className="relative flex gap-6 group">
                    <div className="relative z-10 w-12 h-12 rounded-2xl border-4 border-white bg-zinc-50 flex items-center justify-center shadow-sm shrink-0">
                      {getIcon(h.tipo)}
                    </div>
                    <div className="flex-1 bg-zinc-50/50 p-6 rounded-[32px] border border-zinc-100 transition-all hover:bg-zinc-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-[#295693] uppercase tracking-tighter">
                            {h.nombre_obra}
                          </span>
                          <span className="text-zinc-300 text-xs">•</span>
                          <time className="text-[10px] font-bold text-zinc-400">
                            {new Date(h.created_at).toLocaleDateString()}
                          </time>
                        </div>
                        {h.es_publico && (
                          <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md uppercase">Público</span>
                        )}
                      </div>
                      <p className="text-zinc-700 text-sm font-medium leading-relaxed">{h.mensaje}</p>
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