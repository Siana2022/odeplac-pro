import { createClient } from '@/lib/supabase/server'
import { MaterialForm } from '@/components/forms/MaterialForm'
import { PdfUploader } from '@/components/shared/PdfUploader'
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Trash2, 
  Edit3, 
  FileUp 
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

export default async function MaterialesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const query = (await searchParams).q || ''
  const supabase = await createClient()

  // Consulta a Supabase con join a proveedores para ver quién vende qué
  let selectQuery = supabase
    .from('materiales')
    .select(`
      *,
      proveedores (
        nombre
      )
    `)
    .order('nombre', { ascending: true })

  if (query) {
    selectQuery = selectQuery.ilike('nombre', `%${query}%`)
  }

  const { data: materiales } = await selectQuery

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* CABECERA ESTILO ODEPLAC */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">Catálogo</h1>
          <p className="text-blue-200/60 font-medium tracking-wide">Precios de referencia extraídos de tus proveedores</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {/* MODAL PARA SINCRONIZAR PDF */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none rounded-2xl border-white/10 text-white hover:bg-white/5 h-12 px-6 font-bold gap-2">
                <FileUp size={18} />
                Sincronizar PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white rounded-[40px] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic text-[#295693] uppercase tracking-tighter">
                  Sincronizar Tarifas
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <PdfUploader proveedorId="none" />
              </div>
            </DialogContent>
          </Dialog>

          {/* MODAL PARA NUEVO MATERIAL MANUAL */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none bg-[#295693] text-white rounded-2xl px-6 font-bold shadow-lg h-12">
                <Plus className="mr-2 h-5 w-5" /> Nuevo Material
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-white rounded-[40px] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic text-[#295693] uppercase tracking-tighter">
                  Nuevo Material
                </DialogTitle>
              </DialogHeader>
              <MaterialForm onSuccess={() => {}} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* BUSCADOR */}
      <form className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-4 text-zinc-400" size={20} />
          <input 
            name="q"
            defaultValue={query}
            className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:ring-2 ring-[#295693] transition-all placeholder:text-zinc-500"
            placeholder="Buscar por nombre o categoría..."
          />
        </div>
        <Button type="submit" variant="outline" className="rounded-2xl border-white/10 text-white w-14 h-14 shrink-0 hover:bg-white/5">
          <Filter size={20} />
        </Button>
      </form>

      {/* TABLA DE MATERIALES */}
      {!materiales || materiales.length === 0 ? (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] py-24 text-center">
          <Package className="mx-auto h-16 w-16 text-white/10 mb-4" />
          <h3 className="text-white font-bold text-xl uppercase italic">Catálogo Vacío</h3>
          <p className="text-zinc-500 mt-2">No hay materiales registrados. Sube un PDF o añade uno manual.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-zinc-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Material / Proveedor</th>
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Categoría</th>
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] text-right">Coste Referencia</th>
                  <th className="p-6 text-[10px] font-black uppercase text-[#295693] tracking-[0.2em] text-right">PVP Estimado</th>
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {materiales.map((m: any) => (
                  <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-[#295693] group-hover:bg-[#295693] group-hover:text-white transition-all duration-300">
                          <Package size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800 text-base leading-tight mb-1">{m.nombre}</p>
                          <p className="text-[10px] text-[#295693] font-black uppercase tracking-widest italic opacity-70">
                            {m.proveedores?.nombre || 'General / Varios'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-zinc-100 text-zinc-500 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">
                        {m.categoria || 'Sin Categoría'}
                      </span>
                    </td>
                    <td className="p-6 text-right font-bold text-zinc-500 text-sm">
                      {Number(m.precio_unitario || 0).toFixed(2)}€ <span className="text-[10px] text-zinc-400">/ {m.unidad}</span>
                    </td>
                    <td className="p-6 text-right font-black text-[#295693] text-xl italic">
                      {(Number(m.precio_unitario || 0) * 1.2).toFixed(2)}€
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 text-zinc-400 hover:text-[#295693] hover:bg-[#295693]/5 transition-all">
                          <Edit3 size={20}/>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 size={20}/>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-50/50 p-6 text-center border-t border-zinc-100">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
               Total Almacén: {materiales.length} Referencias Activas
             </p>
          </div>
        </div>
      )}
    </div>
  )
}