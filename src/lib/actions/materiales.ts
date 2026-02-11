'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const materialSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  precio_unitario: z.number().min(0, 'El precio no puede ser negativo'),
  stock: z.number().min(0, 'El stock no puede ser negativo'),
  unidad: z.string().min(1, 'La unidad es obligatoria'),
  proveedor_id: z.string().uuid().nullable().optional(),
})

export async function crearMaterialAction(formData: z.infer<typeof materialSchema>) {
  const supabase = await createClient()
  
  // Obtenemos el ID del usuario (o el fallback de demo)
  const { data: { user } } = await supabase.auth.getUser()
  const usuario_id = user?.id || '05971cd1-57e1-4d97-8469-4dc104f6e691'

  const { data, error } = await supabase
    .from('materiales')
    .insert([
      {
        ...formData,
        usuario_id
      }
    ])
    .select()

  if (error) {
    throw new Error(error.message)
  }

  // Forzamos la actualización de las rutas que consumen materiales
  revalidatePath('/dashboard/materiales')
  revalidatePath('/') 
  
  return data
}