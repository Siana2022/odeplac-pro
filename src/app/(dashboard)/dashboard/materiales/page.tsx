'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { 
  Upload, FileText, Loader2, ChevronLeft, ExternalLink, 
  TrendingUp, Calendar, Check, Trash2, Percent, Tag, Plus 
} from "lucide-react"
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog"

export default function TarifasPage() {
  const [file, setFile] = useState<File | null>(null)
  const [proveedores, setProveedores] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any[]>([])
  const [listaCategorias, setListaCategorias] = useState<any[]>([])
  
  const [selectedProveedor, setSelectedProveedor] = useState('')
  const [categoria, setCategoria] = useState('')
  const [margen, setMargen] = useState(30)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [updatesFound, setUpdatesFound] = useState<any[]>([])
  const [activeTarifa, setActiveTarifa] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)

  const fetchData = async () => {
    const { data: provs } = await supabase.from('proveedores').select('*').order('nombre')
    if (provs) setProveedores(provs)
    const { data: tars } = await supabase.from('proveedores_tarifas').select('*, proveedores (nombre)').order('fecha_subida', { ascending: false })
    if (tars) setTarifas(tars)
  }

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias_materiales').select('*').order('nombre')
    if (data) setListaCategorias(data)
  }

  useEffect(() => { 
    fetchData()
    fetchCategorias() 
  }, [])

  const crearCategoria = async () => {
    if (!nuevaCategoria) return
    const { error } = await supabase.from('categorias_materiales').insert({ nombre: nuevaCategoria })
    if (!error) {
      toast.success("Tipología creada")
      setNuevaCategoria('')
      setShowAddCat(false)
      fetchCategorias()
    }
  }

  const handleAnalizarIA = async (tarifa: any) => {
    setIsAnalyzing(tarifa.id)
    setActiveTarifa(tarifa)
    try {
      // 1. Verificar si ya tenemos caché del resultado
      if (tarifa.resultado_ia) {
        setUpdatesFound(tarifa.resultado_ia)
        setShowComparison(true)
        setIsAnalyzing(null)
        return
      }

      const response = await fetch('/api/ai/analyze-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: tarifa.archivo_url, tarifaId: tarifa.id })
      })
      
      if (response.status === 429) throw new Error("Cuota de Gemini agotada. Prueba en 1 minuto.")
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setUpdatesFound(data.updates)
      setShowComparison(true)
    } catch (error: any) {
      toast.error("Error", { description: error.message })
    } finally { setIsAnalyzing(null) }
  }

  const aplicarCambios = async () => {
    console.log("🚀 [VOLCADO] Iniciando proceso...");
    console.log("🚀 [VOLCADO] Datos:", { activeTarifa, categoria, margen, total: updatesFound.length });

    if (!activeTarifa || !categoria) {
      console.error("❌ [VOLCADO] Falta tarifa o categoría");
      toast.error("Error: Selecciona una tipología antes de volcar.");
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/materiales/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          materiales: updatesFound, 
          proveedorId: activeTarifa.proveedor_id,
          tarifaId: activeTarifa.id,
          categoria: categoria,
          margen: margen
        })
      })

      const resData = await response.json()

      if (response.ok) {
        console.log("✅ [VOLCADO] Éxito:", resData);
        toast.success(`Catálogo actualizado: ${resData.count} materiales.`)
        setShowComparison(false)
      } else {
        throw new Error(resData.error || "Error desconocido en el servidor")
      }
    } catch (e: any) {
      console.error("❌ [VOLCADO] Fallo crítico:", e);
      toast.error("Error al volcar", { description: e.message })
    } finally { setIsImporting(false) }
  }

  const handleUpload = async () => {
    if (!file || !selectedProveedor || !categoria) return
    setIsUploading(true)
    try {
      const filePath = `tarifas/${selectedProveedor}/${Date.now()}_${file.name}`
      await supabase.storage.from('proveedores').upload(filePath, file)
      await supabase.from('proveedores_tarifas').insert({ 
        proveedor_id: selectedProveedor, 
        nombre_archivo: file.name, 
        archivo_url: filePath,
        categoria: categoria 
      })
      fetchData()
      setFile(null)
      toast.success("Archivo subido")
    } catch (e) { toast.error("Error al subir") }
    setIsUploading(false)
  }

  const handleDelete = async (tarifa: any) => {
    if (!confirm(`¿Borrar "${tarifa.nombre_archivo}"?`)) return
    await supabase.storage.from('proveedores').remove([tarifa.archivo_url])
    await supabase.from('proveedores_tarifas').delete().eq('id', tarifa.id)
    fetchData()
    toast.success("Eliminado")
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      
      {/* MODAL CATEGORÍA */}
      <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
        <DialogContent className="bg-white rounded-3xl p-6 border-none shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Nueva Tipología</DialogTitle>
            <DialogDescription>Añade una categoría para clasificar tus materiales.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <input className="w-full p-4 border-2 border-zinc-200 rounded-2xl bg-zinc-50 outline-none focus:border-[#295693]" placeholder="Ej: Aislamientos..." value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
            <Button onClick={crearCategoria} className="w-full bg-[#295693] text-white rounded-2xl h-14 font-bold">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL COMPARATIVA */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="bg-white max-w-3xl rounded-3xl p-0 overflow-hidden shadow-2xl border-none">
          <div className="bg-[#295693] p-6 text-white flex justify-between items-center">
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Previsualización de Precios</DialogTitle>
                <DialogDescription className="text-blue-100/70 text-xs">Margen: {margen}% | {categoria}</DialogDescription>
              </DialogHeader>
            </div>
            <TrendingUp size={32} className="opacity-20" />
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="col-span-6">Producto</div>
                <div className="col-span-3 text-right">Coste</div>
                <div className="col-span-3 text-right text-[#295693]">PVP (Venta)</div>
              </div>
              {updatesFound.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 items-center">
                  <div className="col-span-6">
                    <p className="text-sm font-bold text-zinc-800 truncate">{item.nombre}</p>
                    <p className="text-[10px] text-zinc-400 font-bold">{item.referencia || 'S/R'}</p>
                  </div>
                  <div className="col-span-3 text-right text-zinc-500 font-bold text-sm">
                    {Number(item.precio).toFixed(2)}€
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-lg font-black text-green-600">
                      {(Number(item.precio) * (1 + margen/100)).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Button onClick={() => setShowComparison(false)} variant="outline" className="flex-1 rounded-xl h-12 font-bold">Cancelar</Button>
              <Button 
                onClick={() => {
                  console.log("🖱️ Clic en Volcar detectado");
                  aplicarCambios();
                }} 
                disabled={isImporting} 
                className="flex-1 bg-[#295693] text-white font-bold rounded-xl h-12 shadow-lg"
              >
                {isImporting ? <Loader2 className="animate-spin mr-2"/> : "Confirmar y Volcar Catálogo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/materiales"><Button variant="outline" size="icon" className="rounded-xl text-white border-white/20"><ChevronLeft/></Button></Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Tarifas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden sticky top-6">
            <div className="bg-[#295693] p-6 text-white font-bold text-center uppercase tracking-widest text-xs">Nueva Importación</div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Proveedor</label>
                <select className="w-full p-4 border-2 border-zinc-300 rounded-2xl bg-zinc-100 text-zinc-900 font-bold text-sm outline-none" value={selectedProveedor} onChange={(e) => setSelectedProveedor(e.target.value)}>
                  <option value="">¿De quién es el PDF?</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Tipología</label>
                    <button onClick={() => setShowAddCat(true)} className="text-[10px] font-black text-[#295693] hover:underline">+ Crear</button>
                  </div>
                  <select className="w-full p-3 border-2 border-zinc-300 rounded-xl bg-zinc-100 font-bold text-xs" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    <option value="">Elegir...</option>
                    {listaCategorias.map(cat => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Margen %</label>
                  <div className="relative">
                    <input type="number" className="w-full p-3 border-2 border-zinc-300 rounded-xl bg-zinc-100 font-bold text-xs" value={margen} onChange={(e) => setMargen(Number(e.target.value))} />
                    <Percent size={12} className="absolute right-3 top-3.5 text-zinc-400" />
                  </div>
                </div>
              </div>

              <div className={`border-2 border-dashed rounded-3xl p-8 text-center bg-zinc-100 cursor-pointer ${file ? 'border-green-500' : 'border-zinc-300'}`}>
                <input type="file" id="pdf-up" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <label htmlFor="pdf-up" className="cursor-pointer flex flex-col items-center">
                  <FileText className={`h-10 w-10 mb-2 ${file ? 'text-green-600' : 'text-zinc-400'}`} />
                  <span className="text-[10px] font-black uppercase break-all">{file ? file.name : 'Subir PDF'}</span>
                </label>
              </div>

              <Button onClick={handleUpload} disabled={isUploading || !file || !selectedProveedor} className="w-full bg-[#295693] text-white rounded-2xl h-16 font-black shadow-lg">
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                Guardar Tarifa
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-white font-bold text-xl px-2 flex items-center gap-2"><Calendar size={20} className="text-blue-300"/> Historial</h2>
          {tarifas.map((t) => (
            <div key={t.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400"><FileText size={24} /></div>
                <div>
                  <h3 className="text-white font-bold text-base">{t.nombre_archivo}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-blue-300 text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/10 rounded-md">{t.proveedores?.nombre}</span>
                    <span className="text-zinc-400 text-[9px] font-black uppercase px-2 py-0.5 bg-white/5 rounded-md">{t.categoria}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAnalizarIA(t)} disabled={isAnalyzing !== null} className="bg-green-600 hover:bg-green-500 text-white rounded-full text-[10px] font-bold px-5 h-10">
                  {isAnalyzing === t.id ? <Loader2 size={14} className="animate-spin mr-2"/> : <TrendingUp size={14} className="mr-2"/>}
                  {t.resultado_ia ? "Ver Datos" : "Sincronizar"}
                </Button>
                <Button onClick={() => handleDelete(t)} className="h-10 w-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all"><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}