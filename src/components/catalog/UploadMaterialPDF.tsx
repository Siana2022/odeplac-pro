'use client'

import { useState } from 'react'
import { FileUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function UploadMaterialPDF() {
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setStatus('idle')

    try {
      // 1. Convertir PDF a Base64 para enviarlo a la IA
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1]

        // 2. Llamada a tu API de procesamiento (Asegúrate de tener esta ruta creada)
        const res = await fetch('/api/materials/process-pdf', {
          method: 'POST',
          body: JSON.stringify({ file: base64, fileName: file.name }),
          headers: { 'Content-Type': 'application/json' }
        })

        if (!res.ok) throw new Error('Error en el servidor')

        setStatus('success')
        // Recargar la página para ver los nuevos materiales
        window.location.reload()
      }
    } catch (error) {
      console.error('Error al subir:', error)
      setStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative">
      <label className="flex items-center gap-2 bg-[#295693] hover:bg-[#1e3d6b] text-white px-4 py-2 rounded-lg cursor-pointer transition-all shadow-md">
        {isUploading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : status === 'success' ? (
          <CheckCircle2 size={18} />
        ) : (
          <FileUp size={18} />
        )}
        <span className="font-medium">
          {isUploading ? 'Procesando...' : 'Sincronizar PDF'}
        </span>
        <input 
          type="file" 
          className="hidden" 
          accept=".pdf" 
          onChange={handleUpload}
          disabled={isUploading}
        />
      </label>
      
      {status === 'error' && (
        <p className="absolute top-12 left-0 text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={12} /> Error al procesar
        </p>
      )}
    </div>
  )
}