'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { EstadoObra } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus, User, MoreHorizontal } from 'lucide-react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ObraForm } from '@/components/forms/ObraForm'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { useDroppable, useDraggable } from '@dnd-kit/core'

// --- CONFIGURACIÓN DE COLUMNAS ---
const states: { label: string; value: EstadoObra; color: string }[] = [
  { label: 'Leads', value: 'lead', color: 'bg-slate-200' },
  { label: 'Presupuestos', value: 'presupuesto', color: 'bg-blue-100' },
  { label: 'En Curso', value: 'curso', color: 'bg-amber-100' },
  { label: 'Terminados', value: 'terminado', color: 'bg-green-100' },
]

// --- DATOS DE PRUEBA (Por si falla la conexión o está vacío) ---
const mockObras = [
  { id: 'mock-1', titulo: 'Reforma Loft Chueca', clientes: { nombre: 'Inversiones Madrileñas S.L.' }, estado: 'curso', porcentaje_progreso: 45, total_presupuesto: 45200 },
  { id: 'mock-2', titulo: 'Oficinas Azca', clientes: { nombre: 'Tech Solutions Madrid' }, estado: 'presupuesto', porcentaje_progreso: 0, total_presupuesto: 12500 },
  { id: 'mock-3', titulo: 'Hotel Gran Vía', clientes: { nombre: 'Hoteles del Sol' }, estado: 'lead', porcentaje_progreso: 0, total_presupuesto: 89000 },
  { id: 'mock-4', titulo: 'Vivienda Las Rozas', clientes: { nombre: 'Familia García-López' }, estado: 'terminado', porcentaje_progreso: 100, total_presupuesto: 32150 },
]

export default function ObrasPage() {
  const [obras, setObras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    fetchObras()
  }, [])

  const fetchObras = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('*, clientes(*)')
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        setObras(data)
      } else {
        console.log("No hay obras en la DB, cargando mock data...")
        setObras(mockObras)
      }
    } catch (err) {
      console.error("Error conectando a Supabase:", err)
      setObras(mockObras) // Si no hay conexión, mostramos los ejemplos
    }
    setLoading(false)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const obraId = active.id as string
    const nuevoEstado = over.id as EstadoObra

    const obraOriginal = obras.find(o => o.id === obraId)
    if (!obraOriginal || obraOriginal.estado === nuevoEstado) return

    // Actualización visual rápida
    setObras(prev => prev.map(o => 
      o.id === obraId ? { ...o, estado: nuevoEstado } : o
    ))

    // Guardar en base de datos (si no es un mock)
    if (!obraId.startsWith('mock-')) {
      const { error } = await supabase
        .from('obras')
        .update({ estado: nuevoEstado })
        .eq('id', obraId)

      if (error) {
        console.error("Error al actualizar estado:", error)
        fetchObras()
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Pipeline de Obras</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-[#295693] hover:bg-white/90 shadow-lg border-none font-bold">
              <Plus className="mr-2 h-4 w-4" /> Nueva Obra
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-zinc-900 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#295693]">Añadir Nueva Obra</DialogTitle>
            </DialogHeader>
            <ObraForm onSuccess={() => {
              setIsDialogOpen(false)
              fetchObras()
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
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

// --- SUBCOMPONENTE COLUMNA (DROPPABLE) ---
function DroppableColumn({ id, state, obras, loading }: any) {
  const { setNodeRef, isOver } = useDroppable({ id })
  
  return (
    <div 
      ref={setNodeRef}
      className={`rounded-2xl p-4 ${state.color} min-h-[600px] flex flex-col space-y-4 transition-all duration-300 shadow-inner ${
        isOver ? 'ring-4 ring-white/40 bg-opacity-90 scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="font-black text-zinc-700 uppercase tracking-tighter text-xs">{state.label}</h2>
        <Badge className="bg-white/60 text-zinc-800 font-bold border-none">{obras.length}</Badge>
      </div>

      <div className="space-y-3 flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-zinc-400 text-xs italic">Sincronizando...</div>
        ) : (
          obras.map((obra: any) => <DraggableCard key={obra.id} obra={obra} />)
        )}
      </div>
    </div>
  )
}

// --- SUBCOMPONENTE TARJETA (DRAGGABLE) ---
function DraggableCard({ obra }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: obra.id,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
  } : undefined

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes} 
      className={`touch-none ${isDragging ? 'opacity-30' : ''}`}
    >
      <Card className="border-none bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-sm font-extrabold text-zinc-900 leading-tight">{obra.titulo}</CardTitle>
          <CardDescription className="text-[10px] font-medium flex items-center text-zinc-400 mt-1 uppercase">
            <User className="mr-1 h-3 w-3" />
            {obra.clientes?.nombre || 'Particular / Sin Cliente'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {obra.estado === 'curso' && (
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-[9px] font-black text-zinc-400">
                <span>AVANCE</span>
                <span>{obra.porcentaje_progreso}%</span>
              </div>
              <Progress value={obra.porcentaje_progreso} className="h-1 bg-zinc-100" />
            </div>
          )}
          <div className="flex justify-between items-end mt-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-400 font-bold uppercase">Presupuesto</span>
              <span className="text-sm font-black text-[#295693]">
                €{obra.total_presupuesto?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="bg-zinc-50 p-1.5 rounded-lg">
               <MoreHorizontal className="h-4 w-4 text-zinc-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}