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
  const [materiales, setMateriales] = useState<Material[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchMateriales = async () => {
    setLoading(true)
    const { data } = await supabase.from('materiales').select('*').order('nombre')
    if (data) setMateriales(data)
    setLoading(false)
  }

  const fetchProveedores = async () => {
    const { data } = await supabase.from('proveedores').select('*')
    if (data) setProveedores(data)
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
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Materiales</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={extracting}
            />
            <Button variant="outline" disabled={extracting}>
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Importar PDF
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Material
              </Button>
            </DialogTrigger>
            <DialogContent>
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar materiales..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Precio Unit.</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Cargando materiales...
                </TableCell>
              </TableRow>
            ) : filteredMateriales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No se encontraron materiales.
                </TableCell>
              </TableRow>
            ) : (
              filteredMateriales.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.nombre}</TableCell>
                  <TableCell>{material.categoria || '-'}</TableCell>
                  <TableCell>{material.unidad}</TableCell>
                  <TableCell>€{material.precio_unitario?.toLocaleString()}</TableCell>
                  <TableCell>{material.stock || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Editar</Button>
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
