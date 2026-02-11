'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { procesarTarifaAccion } from '@/lib/actions/ingesta'
import { toast } from 'sonner'

interface PdfUploaderProps {
  proveedorId: string
}

export function PdfUploader({ proveedorId }: PdfUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error("Por favor, sube un archivo PDF válido")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Esta acción llama internamente a extractMaterialsFromPDF de gemini.ts
      const result = await procesarTarifaAccion(formData, proveedorId)
      toast.success(`¡Sincronización completa! Se han procesado ${result.count} materiales.`)
    } catch (error: any) {
      console.error("Error al procesar PDF:", error)
      toast.error(error.message || "Error al leer el PDF con la IA")
    } finally {
      setIsUploading(false)
      setDragActive(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div 
      className={`
        relative flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-10 transition-all duration-300
        ${dragActive ? 'border-[#295693] bg-[#295693]/5 scale-[0.98]' : 'border-zinc-200 bg-zinc-50'}
        ${isUploading ? 'pointer-events-none opacity-80' : 'hover:border-[#295693]/50 hover:bg-zinc-100/50'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept=".pdf" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        disabled={isUploading}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center text-center">
          <Loader2 className="animate-spin text-[#295693] mb-4" size={48} />
          <p className="text-[#295693] font-black italic uppercase tracking-tighter text-lg">
            La IA está leyendo los precios...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <FileUp className="text-[#295693] mb-4" size={32} />
          <p className="text-zinc-800 font-bold text-lg leading-tight">Arrastra tu tarifa aquí</p>
          <p className="text-zinc-400 text-sm mt-1 mb-6">O haz clic para seleccionar archivo</p>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-white px-4 py-2 rounded-full border border-zinc-100">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Tarifas</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Unidades</span>
          </div>
        </div>
      )}
    </div>
  )
}