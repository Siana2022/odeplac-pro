'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

const clienteSchema = z.object({
  nombre_fiscal: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
})

type ClienteFormValues = z.infer<typeof clienteSchema>

export function ClienteForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema)
  })

  const onSubmit = async (data: ClienteFormValues) => {
    setLoading(true)
    const { error } = await supabase.from('clientes').insert([data])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Cliente creado correctamente')
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre_fiscal">Nombre Fiscal</Label>
        <Input id="nombre_fiscal" {...register('nombre_fiscal')} />
        {errors.nombre_fiscal && <p className="text-xs text-red-500">{errors.nombre_fiscal.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" {...register('telefono')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" {...register('direccion')} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear Cliente'}
      </Button>
    </form>
  )
}
