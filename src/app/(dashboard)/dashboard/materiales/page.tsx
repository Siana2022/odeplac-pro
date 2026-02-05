'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Material, Proveedor } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Search, FileUp, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { MaterialForm } from '@/components/forms/MaterialForm'

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<any[]>([]) // Usamos any[] temporalmente para evitar errores de tipos con precio_coste
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchMateriales = async () => {
    setLoading(true)
    // ✅ Confirmado: Seleccionamos todo, incluyendo precio_coste y unidad
    const { data, error } = await supabase.from('materiales').select('*').order('nombre')
    if (error) {
      console.error("Error al cargar materiales:", error)
      toast.error("No se pudieron cargar los materiales")
    }
    if (data) setMateriales(data)
    setLoading(false)
  }

  const fetchProveedores = async () => {
    const { data } = await supabase.from('proveedores').select('*')
  }

  useEffect(() => {
    fetchMateriales()
    fetchProveedores()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExtracting(true)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]

      try {
        const response = await fetch('/api/materiales/extract', {
          method: 'POST',
          body: JSON.stringify({ pdf: base64 }),
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()
        if (data.materials) {
          toast.success(`${data.materials.length} materiales extraídos correctamente`)
          fetchMateriales()
        } else {
          toast.error('No se pudieron extraer materiales')
        }
      } catch (error) {
        toast.error('Error al procesar el PDF')
      } finally {
        setExtracting(false)
      }
    }
  }

  const filteredMateriales = materiales.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Catálogo de Materiales</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={extracting}
            />
            <Button variant="outline" disabled={extracting} className="bg-white/10 text-white border-white/20">
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Importar Albarán PDF
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-[#295693] hover:bg-white/90">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Material
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Material</DialogTitle>
              </DialogHeader>
              <MaterialForm onSuccess={() => {
                setIsDialogOpen(false)
                fetchMateriales()
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
          <Input
            placeholder="Buscar por nombre..."
            className="pl-8 bg-white/5 border-white/10 text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10">
              <TableHead className="text-white font-bold">Nombre</TableHead>
              <TableHead className="text-white font-bold">Descripción</TableHead>
              <TableHead className="text-white font-bold">Unidad</TableHead>
              <TableHead className="text-white font-bold">Precio Coste</TableHead>
              <TableHead className="text-white font-bold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-white/50">
                  <div className="flex justify-center items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando con base de datos...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredMateriales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-white/50 italic">
                  No se encontraron materiales. Prueba a añadir uno nuevo o importar un PDF.
                </TableCell>
              </TableRow>
            ) : (
              filteredMateriales.map((material) => (
                <TableRow key={material.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{material.nombre}</TableCell>
                  <TableCell className="text-white/60 text-xs">{material.descripcion || '-'}</TableCell>
                  <TableCell className="text-white/80">{material.unidad}</TableCell>
                  {/* ✅ CAMBIO CLAVE: Aquí es donde usamos precio_coste */}
                  <TableCell className="text-[#90caf9] font-bold">
                    {material.precio_coste ? `€${Number(material.precio_coste).toFixed(2)}` : '€0.00'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-white/30 hover:text-white">Editar</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}