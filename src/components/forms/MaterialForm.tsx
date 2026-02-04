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
import { Proveedor } from '@/types/database'
import { toast } from 'sonner'

const materialSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  precio_unitario: z.string().transform((val) => parseFloat(val) || 0),
  stock: z.string().transform((val) => parseFloat(val) || 0),
  unidad: z.string().default('ud'),
  proveedor_id: z.string().uuid('Selecciona un proveedor').optional().or(z.literal('')),
})

type MaterialFormValues = z.input<typeof materialSchema>

const DEMO_USER_ID = '05971cd1-57e1-4d97-8469-4dc104f6e691'

export function MaterialForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      unidad: 'ud',
      precio_unitario: '0',
      stock: '0'
    }
  } as any) // 👈 Esto silencia el conflicto entre texto y número

  useEffect(() => {
    const fetchProveedores = async () => {
      const { data } = await supabase.from('proveedores').select('id, nombre')
      if (data) setProveedores(data as Proveedor[])
    }
    fetchProveedores()
  }, [])

  const onSubmit = async (data: any) => {
    setLoading(true)
    const { error } = await supabase.from('materiales').insert([{
      ...data,
      usuario_id: DEMO_USER_ID,
      proveedor_id: data.proveedor_id || null
    }])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Material creado correctamente')
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Material</Label>
        <Input id="nombre" {...register('nombre')} placeholder="Ej: Placa de Yeso Laminado 13mm" />
        {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input id="descripcion" {...register('descripcion')} placeholder="Detalles técnicos..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="precio_unitario">Precio Unitario (€)</Label>
          <Input id="precio_unitario" type="number" step="0.01" {...register('precio_unitario')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Inicial</Label>
          <Input id="stock" type="number" step="0.01" {...register('stock')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="unidad">Unidad</Label>
            <Select defaultValue="ud" onValueChange={(val) => setValue('unidad', val)}>
                <SelectTrigger>
                    <SelectValue placeholder="ud" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ud">ud</SelectItem>
                    <SelectItem value="m2">m2</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="saco">saco</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Select onValueChange={(val) => setValue('proveedor_id', val)}>
                <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                    {proveedores.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear Material'}
      </Button>
    </form>
  )
}
