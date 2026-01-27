'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import { supabase } from '@/lib/supabase/client'
import { Material } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

export function MaterialSelector({ onSelect }: { onSelect: (material: Material) => void }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 500)
  const [results, setResults] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!debouncedSearch) {
        setResults([])
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from('materiales')
        .select('*')
        .ilike('nombre', `%${debouncedSearch}%`)
        .limit(5)

      if (data) setResults(data)
      setLoading(false)
    }
    fetchMaterials()
  }, [debouncedSearch])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar material..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-sm text-zinc-500">Buscando...</p>
      ) : results.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableBody>
              {results.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-zinc-50" onClick={() => onSelect(m)}>
                  <TableCell className="py-4">
                    <p className="font-bold text-sm">{m.nombre}</p>
                    <p className="text-xs text-zinc-500 uppercase">{m.unidad} | €{m.precio_unitario?.toLocaleString()}</p>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Button size="icon" variant="secondary" className="h-10 w-10">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : debouncedSearch ? (
        <p className="text-center text-sm text-zinc-500">No se encontraron resultados.</p>
      ) : null}
    </div>
  )
}
