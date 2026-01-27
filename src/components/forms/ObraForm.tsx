'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/types/database'
import { toast } from 'sonner'

const obraSchema = z.object({
  cliente_id: z.string().uuid('Selecciona un cliente'),
  titulo: z.string().min(3, 'El título es obligatorio'),
  estado: z.enum(['lead', 'presupuesto', 'curso', 'terminado']),
})

type ObraFormValues = z.infer<typeof obraSchema>

export function ObraForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ObraFormValues>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      estado: 'lead'
    }
  })

  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase.from('clientes').select('id, nombre')
      if (data) setClientes(data as any)
    }
    fetchClientes()
  }, [])

  const onSubmit = async (data: ObraFormValues) => {
    setLoading(true)
    const { error } = await supabase.from('obras').insert([data])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Obra creada correctamente')
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cliente">Cliente</Label>
        <Select onValueChange={(value) => setValue('cliente_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map(cliente => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.cliente_id && <p className="text-xs text-red-500">{errors.cliente_id.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="titulo">Título de la Obra</Label>
        <Input id="titulo" {...register('titulo')} placeholder="Ej: Reforma Local Gran Vía" />
        {errors.titulo && <p className="text-xs text-red-500">{errors.titulo.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="estado">Estado Inicial</Label>
        <Select defaultValue="lead" onValueChange={(value: any) => setValue('estado', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="presupuesto">Presupuesto</SelectItem>
            <SelectItem value="curso">En Curso</SelectItem>
            <SelectItem value="terminado">Terminado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear Obra'}
      </Button>
    </form>
  )
}
