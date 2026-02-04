'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { EstadoObra } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal, User } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ObraForm } from '@/components/forms/ObraForm'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

const states: { label: string; value: EstadoObra; color: string }[] = [
  { label: 'Leads', value: 'lead', color: 'bg-slate-200' },
  { label: 'Presupuestos', value: 'presupuesto', color: 'bg-blue-100' },
  { label: 'En Curso', value: 'curso', color: 'bg-amber-100' },
  { label: 'Terminados', value: 'terminado', color: 'bg-green-100' },
]

const mockObras = [
  { id: '1', titulo: 'Reforma Loft Chueca', clientes: { nombre: 'Inversiones Madrileñas S.L.' }, estado: 'curso', porcentaje_progreso: 45, total_presupuesto: 45200 },
  { id: '2', titulo: 'Oficinas Azca', clientes: { nombre: 'Tech Solutions Madrid' }, estado: 'presupuesto', porcentaje_progreso: 0, total_presupuesto: 12500 },
  { id: '3', titulo: 'Hotel Gran Vía', clientes: { nombre: 'Hoteles del Sol' }, estado: 'lead', porcentaje_progreso: 0, total_presupuesto: 89000 },
  { id: '4', titulo: 'Vivienda Las Rozas', clientes: { nombre: 'Familia García-López' }, estado: 'terminado', porcentaje_progreso: 100, total_presupuesto: 32150 },
]

export default function ObrasPage() {
  const [obras, setObras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const fetchObras = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('obras')
          .select('*, clientes(*)')
          .order('updated_at', { ascending: false })

        if (data && data.length > 0) {
          setObras(data)
        } else {
          setObras(mockObras)
        }
      } catch (_e) {
        setObras(mockObras)
      }
      setLoading(false)
    }
    fetchObras()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('obras')
      .select('*, clientes(*)')
      .order('updated_at', { ascending: false })

    if (data) setObras(data)
    setLoading(false)
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
            <DialogHeader>
              <DialogTitle>Añadir Nueva Obra</DialogTitle>
            </DialogHeader>
            <ObraForm onSuccess={() => {
              setIsDialogOpen(false)
              handleRefresh()
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {states.map((state) => (
          <div key={state.value} className={`rounded-xl p-4 ${state.color} min-h-[600px] flex flex-col space-y-4 shadow-inner`}>
            <div className="flex items-center justify-between px-2">
              <h2 className="font-bold text-zinc-800 uppercase tracking-wider text-sm">{state.label}</h2>
              <Badge variant="secondary" className="bg-white/50 text-zinc-800">
                {obras.filter(o => o.estado === state.value).length}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {loading ? (
                 <div className="text-center py-10 text-xs text-zinc-500">Cargando...</div>
              ) : (
                obras
                  .filter(o => o.estado === state.value)
                  .map(obra => (
                    <Link key={obra.id} href={`/dashboard/obras/${obra.id}`}>
                    <Card className="border-none bg-white shadow-sm hover:shadow-md transition-all">
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
                            <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                              <span>PROGRESO</span>
                              <span>{obra.porcentaje_progreso}%</span>
                            </div>
                            <Progress value={obra.porcentaje_progreso} className="h-1 bg-zinc-100" />
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-sm font-bold text-[#295693]">€{obra.total_presupuesto?.toLocaleString() || '0'}</span>
                          <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                        </div>
                      </CardContent>
                    </Card>
                    </Link>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}