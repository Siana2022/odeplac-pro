/**
 * Utilidades de cliente para archivos PDF / imágenes (planos y facturas).
 * Solo usar desde componentes 'use client'.
 */

/** Renderiza la primera página de un PDF (desde URL) a una imagen PNG y devuelve un object URL. */
export async function renderPdfToImageUrl(
  url: string,
  targetWidth = 2400
): Promise<{ imageUrl: string; width: number; height: number }> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo descargar el plano')
  const data = new Uint8Array(await res.arrayBuffer())

  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise
  const page = await pdf.getPage(1)

  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(4, targetWidth / base.width)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo')

  await page.render({ canvasContext: ctx, canvas, viewport }).promise

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Error al generar imagen'))), 'image/png')
  )
  await task.destroy()
  return { imageUrl: URL.createObjectURL(blob), width: canvas.width, height: canvas.height }
}

/**
 * Reduce imágenes grandes (fotos / escaneos) para que la subida sea ligera.
 * Los PDF y las imágenes pequeñas se devuelven sin cambios.
 */
export async function compressImageIfNeeded(file: File, maxSide = 2200, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') return file
  if (file.size < 1.5 * 1024 * 1024) return file

  try {
    const bitmap = await createImageBitmap(file)
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * ratio)
    canvas.height = Math.round(bitmap.height * ratio)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export const ACCEPTED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const ACCEPTED_DOC_ATTR = '.pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*'

export function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_')
}
