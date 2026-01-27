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

const proveedorSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  categoria: z.string().optional(),
})

type ProveedorFormValues = z.infer<typeof proveedorSchema>

const DEMO_USER_ID = '05971cd1-57e1-4d97-8469-4dc104f6e691'

export function ProveedorForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema)
  })

  const onSubmit = async (data: ProveedorFormValues) => {
    setLoading(true)
    // Forced usuario_id for Demo
    const { error } = await supabase.from('proveedores').insert([{
      ...data,
      usuario_id: DEMO_USER_ID,
      metodo_ingesta: 'pdf' // default
    }])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Proveedor creado correctamente')
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Proveedor</Label>
        <Input id="nombre" {...register('nombre')} placeholder="Ej: Materiales Madrid S.L." />
        {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} placeholder="proveedor@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" {...register('telefono')} placeholder="912 345 678" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" {...register('direccion')} placeholder="Calle Industria 45, Polígono..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoria">Categoría</Label>
        <Input id="categoria" {...register('categoria')} placeholder="Ej: Pladur, Aislamientos, Herramientas" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear Proveedor'}
      </Button>
    </form>
  )
}
