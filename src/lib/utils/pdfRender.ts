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


/**
 * Renderiza TODAS las páginas de un PDF a imágenes PNG (object URLs).
 * Se usa para exportar un plano completo al PDF de medición.
 * El llamador debe revocar las URLs con URL.revokeObjectURL.
 */
export async function renderPdfPagesToImageUrls(
  url: string,
  targetWidth = 2400
): Promise<Array<{ imageUrl: string; width: number; height: number }>> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo descargar el plano')
  const data = new Uint8Array(await res.arrayBuffer())

  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise
  const pages: Array<{ imageUrl: string; width: number; height: number }> = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
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
    pages.push({ imageUrl: URL.createObjectURL(blob), width: canvas.width, height: canvas.height })
  }

  await task.destroy()
  return pages
}


/**
 * Prepara una factura para la IA:
 * - Imágenes: las comprime.
 * - PDF digital (con texto): lo deja igual, Gemini lo lee rápido.
 * - PDF escaneado (sin texto): renderiza sus páginas a JPEG 1600 px y genera
 *   un PDF ligero. Así Gemini no procesa escaneos enormes y no agota los 60 s.
 */
export async function prepararFacturaParaIA(file: File): Promise<File> {
  if (file.type.startsWith('image/')) return compressImageIfNeeded(file, 1800, 0.85)
  if (file.type !== 'application/pdf') return file
  if (file.size < 400 * 1024) return file

  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    const data = new Uint8Array(await file.arrayBuffer())
    const task = pdfjs.getDocument({ data })
    const pdf = await task.promise

    // ¿Tiene capa de texto? Entonces es un PDF digital y no hay que rasterizarlo.
    let textChars = 0
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      textChars += content.items.reduce((a, item: any) => a + (typeof item.str === 'string' ? item.str.length : 0), 0)
    }
    if (textChars > 200 * pdf.numPages) {
      await task.destroy()
      return file
    }

    // Escaneo: renderizar páginas a JPEG y reensamblar un PDF ligero.
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const maxPages = Math.min(pdf.numPages, 8)

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(2, 1600 / base.width)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear el lienzo')

      await page.render({ canvasContext: ctx, canvas, viewport }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)

      if (i > 1) doc.addPage('a4', 'portrait')
      const pageW = 210, pageH = 297, margin = 5
      const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height)
      const w = canvas.width * ratio
      const h = canvas.height * ratio
      doc.addImage(dataUrl, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST')
    }

    await task.destroy()
    const blob = doc.output('blob')
    if (!blob || blob.size >= file.size) return file

    return new File([blob], file.name.replace(/\.pdf$/i, '') + '.pdf', { type: 'application/pdf' })
  } catch (err) {
    console.warn('No se pudo optimizar el PDF; se envía el original', err)
    return file
  }
}
