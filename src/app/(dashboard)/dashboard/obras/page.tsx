'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { EstadoObra } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus, User, MoreHorizontal } from 'lucide-react'
// ✅ CORRECCIÓN: 'closestCorners' ahora empieza con minúscula para evitar errores de compilación
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ObraForm } from '@/components/forms/ObraForm'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { useDroppable, useDraggable } from '@dnd-kit/core'

const states: { label: string; value: EstadoObra; color: string }[] = [
  { label: 'Leads', value: 'lead', color: 'bg-slate-200' },
  { label: 'Presupuestos', value: 'presupuesto', color: 'bg-blue-100' },
  { label: 'En Curso', value: 'curso', color: 'bg-amber-100' },
  { label: 'Terminados', value: 'terminado', color: 'bg-green-100' },
]

export default function ObrasPage() {
  const [obras, setObras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Sensores para detectar el arrastre (mínimo 5px de movimiento para empezar a mover)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    fetchObras()
  }, [])

  const fetchObras = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('obras')
      .select('*, clientes(*)')
      .order('updated_at', { ascending: false })
    if (data) setObras(data)
    setLoading(false)
  }

  // LÓGICA DE ACTUALIZACIÓN AL SOLTAR LA TARJETA
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const obraId = active.id as string
    const nuevoEstado = over.id as EstadoObra

    const obraOriginal = obras.find(o => o.id === obraId)
    if (!obraOriginal || obraOriginal.estado === nuevoEstado) return

    // Actualización visual inmediata (Optimistic Update)
    setObras(prev => prev.map(o => 
      o.id === obraId ? { ...o, estado: nuevoEstado } : o
    ))

    // Actualización real en la base de datos
    const { error } = await supabase
      .from('obras')
      .update({ estado: nuevoEstado })
      .eq('id', obraId)

    if (error) {
      console.error("Error al mover obra:", error)
      fetchObras() // Si hay error, recargamos los datos reales para sincronizar
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Pipeline de Obras</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-[#295693] hover:bg-white/90">
              <Plus className="mr-2 h-4 w-4" /> Nueva Obra
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-zinc-900">
            <DialogHeader><DialogTitle>Añadir Nueva Obra</DialogTitle></DialogHeader>
            <ObraForm onSuccess={() => { setIsDialogOpen(false); fetchObras(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} // ✅ CORREGIDO
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {states.map((state) => (
            <DroppableColumn 
              key={state.value} 
              id={state.value} 
              state={state} 
              obras={obras.filter(o => o.estado === state.value)}
              loading={loading}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}

// --- SUBCOMPONENTE COLUMNA ---
function DroppableColumn({ id, state, obras, loading }: any) {
  const { setNodeRef, isOver } = useDroppable({ id })
  
  return (
    <div 
      ref={setNodeRef}
      className={`rounded-xl p-4 ${state.color} min-h-[600px] flex flex-col space-y-4 transition-all duration-200 ${
        isOver ? 'ring-4 ring-white/30 bg-opacity-80 scale-[1.02]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="font-bold text-zinc-800 uppercase tracking-wider text-sm">{state.label}</h2>
        <Badge className="bg-white/50 text-zinc-800 border-none">{obras.length}</Badge>
      </div>

      <div className="space-y-3 flex-1">
        {loading ? (
          <div className="text-center py-10 text-xs text-zinc-500 italic">Cargando...</div>
        ) : (
          obras.map((obra: any) => <DraggableCard key={obra.id} obra={obra} />)
        )}
      </div>
    </div>
  )
}

// --- SUBCOMPONENTE TARJETA ---
function DraggableCard({ obra }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: obra.id,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes} 
      className={`touch-none ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className="border-none bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm font-bold text-zinc-900">{obra.titulo}</CardTitle>
          <CardDescription className="text-[11px] flex items-center text-zinc-500">
            <User className="mr-1 h-3 w-3" />
            {obra.clientes?.nombre || 'Sin cliente'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          {obra.estado === 'curso' && (
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>PROGRESO</span>
                <span>{obra.porcentaje_progreso}%</span>
              </div>
              <Progress value={obra.porcentaje_progreso} className="h-1 bg-zinc-100" />
            </div>
          )}
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm font-bold text-[#295693]">
              €{obra.total_presupuesto?.toLocaleString() || '0'}
            </span>
            <MoreHorizontal className="h-4 w-4 text-zinc-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}