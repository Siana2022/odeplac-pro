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
import { crearMaterialAction } from '@/lib/actions/materiales'

// 1. Esquema de validación estricto
const materialFormSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  descripcion: z.string().default(''),
  precio_unitario: z.coerce.number().min(0, 'Precio inválido'),
  stock: z.coerce.number().min(0, 'Stock inválido'),
  unidad: z.string().min(1, 'La unidad es obligatoria'),
  proveedor_id: z.string().uuid().nullable().optional(),
})

// 2. Tipo inferido para la lógica interna
type MaterialFormValues = z.infer<typeof materialFormSchema>

export function MaterialForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  // 3. Usamos "any" en el genérico del hook para romper el bucle de validación de TS 
  // pero mantenemos la seguridad con el resolver de Zod y el tipado de onSubmit.
  const form = useForm<any>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      unidad: 'ud',
      precio_unitario: 0,
      stock: 0,
      proveedor_id: null
    }
  })

  useEffect(() => {
    const fetchProveedores = async () => {
      const { data } = await supabase
        .from('proveedores')
        .select('id, nombre')
        .order('nombre')
      if (data) setProveedores(data as Proveedor[])
    }
    fetchProveedores()
  }, [])

  // 4. Aquí recuperamos el tipado estricto para la Server Action
  const onSubmit = async (values: MaterialFormValues) => {
    setLoading(true)
    try {
      const payload = {
        ...values,
        // Limpieza final de datos
        proveedor_id: (values.proveedor_id === 'none' || !values.proveedor_id) ? null : values.proveedor_id
      }
      
      await crearMaterialAction(payload)
      toast.success('Material creado correctamente')
      form.reset()
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el material')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Material</Label>
        <Input 
          id="nombre" 
          {...form.register('nombre')} 
          placeholder="Ej: Placa de Yeso Laminado 13mm" 
        />
        {form.formState.errors.nombre && (
          <p className="text-[10px] text-red-500 font-medium">
            {String(form.formState.errors.nombre.message)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción (Opcional)</Label>
        <Input 
          id="descripcion" 
          {...form.register('descripcion')} 
          placeholder="Detalles técnicos..." 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="precio_unitario">Precio Unitario (€)</Label>
          <Input 
            id="precio_unitario" 
            type="number" 
            step="0.01" 
            {...form.register('precio_unitario')} 
          />
          {form.formState.errors.precio_unitario && (
            <p className="text-[10px] text-red-500 font-medium">
              {String(form.formState.errors.precio_unitario.message)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Inicial</Label>
          <Input 
            id="stock" 
            type="number" 
            step="0.01" 
            {...form.register('stock')} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Unidad</Label>
          <Select 
            defaultValue="ud" 
            onValueChange={(val) => form.setValue('unidad', val, { shouldValidate: true })}
          >
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
          <Label>Proveedor</Label>
          <Select 
            onValueChange={(val) => form.setValue('proveedor_id', val === 'none' ? null : val, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguno</SelectItem>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#295693] hover:bg-[#1e3d6b]" 
        disabled={loading}
      >
        {loading ? 'Guardando...' : 'Registrar en Inventario'}
      </Button>
    </form>
  )
}