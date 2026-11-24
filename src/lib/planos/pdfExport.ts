'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderPdfPagesToImageUrls } from '@/lib/utils/pdfRender'

/**
 * Exporta a PDF todos los planos de una obra:
 *  - Portada-resumen con planos, ML/m² y sistemas.
 *  - Una página por plano (y por página del PDF original) con la imagen,
 *    las líneas medidas y sus acotaciones.
 *  - Leyenda de colores/sistemas al pie de cada plano.
 */

type Formula = 'ml_x_alto' | 'largo_x_ancho' | 'suma_ml' | 'alto_x_ancho_x_profundo'

interface Tramo {
  id: string
  metros: number
  metros_b?: number | null
  x1: number | null
  y1: number | null
  x2: number | null
  y2: number | null
  x3?: number | null
  y3?: number | null
  x4?: number | null
  y4?: number | null
}

interface Medicion {
  id: string
  nombre: string
  color: string
  alto: number
  ancho?: number | null
  profundo?: number | null
  plano_tramos: Tramo[]
}

interface Plano {
  id: string
  nombre: string
  zona?: string | null
  tipo_sistema?: string | null
  archivo_path: string
  mime_type?: string | null
  plano_tipos_sistema?: { nombre?: string | null; formula?: string | null } | null
}

const TIPO_A_FORMULA: Record<string, Formula> = {
  trasdosados: 'ml_x_alto',
  techos: 'largo_x_ancho',
  cortineros: 'suma_ml',
  hornacinas: 'alto_x_ancho_x_profundo',
}

const FORMULA_LABEL: Record<Formula, string> = {
  ml_x_alto: 'ML × alto',
  largo_x_ancho: 'Largo × ancho',
  suma_ml: 'Suma de ML',
  alto_x_ancho_x_profundo: 'Alto × ancho × profundo',
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formulaOf(p: Plano): Formula {
  const f = p.plano_tipos_sistema?.formula
  if (f === 'largo_x_ancho' || f === 'suma_ml' || f === 'ml_x_alto' || f === 'alto_x_ancho_x_profundo') return f
  return TIPO_A_FORMULA[p.tipo_sistema || ''] || 'ml_x_alto'
}

function mlOf(m: Medicion): number {
  return m.plano_tramos.reduce((a, t) => a + Number(t.metros || 0), 0)
}

function m2Of(m: Medicion, formula: Formula): number {
  if (formula === 'suma_ml' || formula === 'alto_x_ancho_x_profundo') return 0
  if (formula === 'largo_x_ancho') {
    return m.plano_tramos.reduce(
      (a, t) => a + Number(t.metros || 0) * Number(t.metros_b != null ? t.metros_b : m.alto || 0),
      0
    )
  }
  return mlOf(m) * Number(m.alto || 0)
}

function m3Of(m: Medicion): number {
  return Number(m.alto || 0) * Number(m.ancho || 0) * Number(m.profundo || 0)
}

function tipoNombre(p: Plano): string {
  return (
    p.plano_tipos_sistema?.nombre ||
    (p.tipo_sistema === 'trasdosados' ? 'Trasdosados / Tabiques'
      : p.tipo_sistema === 'techos' ? 'Falsos techos'
        : p.tipo_sistema === 'hornacinas' ? 'Hornacinas / Oscuros'
        : p.tipo_sistema === 'cortineros' ? 'Cortineros'
          : 'Mediciones')
  )
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  try {
    if (typeof img.decode === 'function') await img.decode()
    else await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('No se pudo cargar la imagen')) })
    return img
  } catch {
    throw new Error('No se pudo leer la imagen del plano (CORS o archivo no disponible)')
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawDimension(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
  color: string,
  lineW: number,
  font: number,
  label: string
) {
  const x1 = a.x * W, y1 = a.y * H, x2 = b.x * W, y2 = b.y * H
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const tick = Math.max(6, lineW * 3.2)

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = lineW
  ctx.lineCap = 'round'

  // línea de cota
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()

  // ticks perpendiculares en los extremos
  ctx.beginPath()
  ctx.moveTo(x1 - nx * tick, y1 - ny * tick); ctx.lineTo(x1 + nx * tick, y1 + ny * tick)
  ctx.moveTo(x2 - nx * tick, y2 - ny * tick); ctx.lineTo(x2 + nx * tick, y2 + ny * tick)
  ctx.stroke()

  // puntos de anclaje
  const r = Math.max(3, lineW * 1.4)
  ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x2, y2, r, 0, Math.PI * 2); ctx.fill()

  // etiqueta
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const off = font * 0.85
  let lx = mx + nx * off
  let ly = my + ny * off

  ctx.font = `800 ${font}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(label).width
  const pad = font * 0.35
  let bx = lx - tw / 2 - pad
  let by = ly - font / 2 - pad
  const bw = tw + pad * 2
  const bh = font + pad * 2

  bx = Math.max(2, Math.min(W - bw - 2, bx))
  by = Math.max(2, Math.min(H - bh - 2, by))

  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  roundRect(ctx, bx, by, bw, bh, font * 0.28)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, lineW * 0.5)
  ctx.stroke()

  ctx.fillStyle = '#0f172a'
  ctx.fillText(label, bx + bw / 2, by + bh / 2)
  ctx.restore()
}

function renderPlanCanvas(
  img: HTMLImageElement,
  meds: Medicion[],
  formula: Formula,
  withOverlay: boolean
): HTMLCanvasElement {
  const maxW = 2400
  const scale = Math.min(1, maxW / (img.naturalWidth || maxW))
  const W = Math.max(1, Math.round((img.naturalWidth || maxW) * scale))
  const H = Math.max(1, Math.round((img.naturalHeight || maxW) * scale))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img, 0, 0, W, H)

  if (!withOverlay) return canvas

  // Un poco más gruesas que antes para que no se confundan con las líneas del plano
  const lineW = Math.max(3.2, W / 480)
  const font = Math.max(12, Math.round(W / 95))

  for (const m of meds) {
    for (const t of m.plano_tramos) {
      if (t.x1 != null && t.y1 != null && t.x2 != null && t.y2 != null) {
        const label = formula === 'largo_x_ancho' ? `L ${fmt(Number(t.metros))} m` : `${fmt(Number(t.metros))} m`
        drawDimension(ctx, W, H, { x: Number(t.x1), y: Number(t.y1) }, { x: Number(t.x2), y: Number(t.y2) }, m.color || '#ec4899', lineW, font, label)
      }
      if (t.x3 != null && t.y3 != null && t.x4 != null && t.y4 != null) {
        const label = formula === 'largo_x_ancho'
          ? `A ${fmt(Number(t.metros_b ?? 0))} m`
          : `${fmt(Number(t.metros_b ?? 0))} m`
        drawDimension(ctx, W, H, { x: Number(t.x3), y: Number(t.y3) }, { x: Number(t.x4), y: Number(t.y4) }, m.color || '#ec4899', lineW, font, label)
      }
    }
  }

  return canvas
}

function drawHeader(doc: jsPDF, pw: number, plan: Plano | null, obra: string, pageNo: number, total: number) {
  doc.setFillColor(30, 61, 107)
  doc.rect(0, 0, pw, 17, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('ODEPLAC PRO', 10, 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Medición de planos', 10, 13)

  doc.setFontSize(8)
  const right = `Página ${pageNo} de ${total}`
  doc.text(right, pw - 10, 8, { align: 'right' })
  doc.setFontSize(7)
  doc.text(obra.slice(0, 80), pw - 10, 13, { align: 'right' })

  if (plan) {
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const nombre = plan.nombre.length > 72 ? plan.nombre.slice(0, 70) + '…' : plan.nombre
    doc.text(nombre, 10, 26)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    const sub = [plan.zona || 'Sin zona', tipoNombre(plan)].filter(Boolean).join(' · ')
    doc.text(sub, 10, 30.5)
  }
}

function legendCols(n: number): number {
  if (n > 20) return 3
  if (n > 5) return 2
  return 1
}

function legendRowH(n: number): number {
  return n > 20 ? 7 : 8.2
}

function legendHeight(meds: Medicion[]): number {
  if (meds.length === 0) return 16
  const cols = legendCols(meds.length)
  const rows = Math.ceil(meds.length / cols)
  return Math.min(112, 14 + rows * legendRowH(meds.length))
}

function drawLegend(
  doc: jsPDF,
  meds: Medicion[],
  formula: Formula,
  x: number,
  y: number,
  width: number
) {
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(x, y, width, legendHeight(meds), 2, 2, 'FD')

  doc.setTextColor(30, 61, 107)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('LEYENDA DE SISTEMAS', x + 3, y + 5)

  if (meds.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.text('Este plano no tiene mediciones.', x + 3, y + 10)
    return
  }

  const cols = legendCols(meds.length)
  const rowH = legendRowH(meds.length)
  const colW = (width - 8) / cols
  const rows = Math.ceil(meds.length / cols)
  const nameSize = cols === 3 ? 6.8 : 7.4
  const detailSize = cols === 3 ? 6.1 : 6.7

  // Separador vertical entre columnas
  if (cols > 1) {
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.25)
    for (let c = 1; c < cols; c++) {
      doc.line(x + c * colW, y + 8, x + c * colW, y + 10 + rows * rowH)
    }
  }

  meds.forEach((m, i) => {
    const col = Math.floor(i / rows)
    const row = i % rows
    const cx = x + 3 + col * colW
    const cy = y + 11 + row * rowH

    const rgb = hexToRgb(m.color || '#ec4899')
    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.roundedRect(cx, cy - 2.2, 3.8, 3.8, 0.8, 0.8, 'F')

    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(nameSize)
    const maxChars = cols === 3 ? 30 : 36
    const nombre = m.nombre.length > maxChars ? m.nombre.slice(0, maxChars - 1) + '…' : m.nombre
    doc.text(nombre, cx + 6, cy)

    const ml = mlOf(m)
    const m2 = m2Of(m, formula)
    const detalle = formula === 'alto_x_ancho_x_profundo'
      ? `${fmt(Number(m.alto || 0))} × ${fmt(Number(m.ancho || 0))} × ${fmt(Number(m.profundo || 0))} = ${fmt(m3Of(m))} m³`
      : formula === 'suma_ml'
        ? `${fmt(ml)} ml`
        : `${fmt(ml)} ml · ${fmt(m2)} m²`
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(detailSize)
    doc.setTextColor(100, 116, 139)
    doc.text(detalle, cx + 6, cy + 3.6)
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [236, 72, 153]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

interface RenderedPage {
  plan: Plano
  dataUrl: string
  width: number
  height: number
  meds: Medicion[]
  formula: Formula
  continuation: boolean
}

function addPlanPage(
  doc: jsPDF,
  page: RenderedPage,
  obra: string,
  pageNo: number,
  total: number
) {
  const orient = page.width >= page.height ? 'landscape' : 'portrait'
  doc.addPage('a3', orient)

  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  drawHeader(doc, pw, page.plan, obra, pageNo, total)

  const margin = 8
  const headerH = 34
  const footerH = 8
  const lh = page.continuation ? 10 : legendHeight(page.meds)
  const availW = pw - margin * 2
  const availH = ph - headerH - footerH - lh - margin

  const scale = Math.min(availW / page.width, availH / page.height)
  const w = page.width * scale
  const h = page.height * scale
  const x = (pw - w) / 2
  const y = headerH + margin

  doc.setDrawColor(226, 232, 240)
  doc.rect(x, y, w, h)
  doc.addImage(page.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST')

  if (!page.continuation) {
    drawLegend(doc, page.meds, page.formula, margin, ph - footerH - lh + 1, pw - margin * 2)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184)
  doc.text(`ODEPLAC PRO · ${obra}`, margin, ph - 3)
  doc.text(`${pageNo}`, pw - margin, ph - 3, { align: 'right' })
}

export async function exportarPlanosPdf(options: {
  supabase: SupabaseClient
  obraId: string
  onProgress?: (message: string) => void
}): Promise<void> {
  const { supabase, obraId, onProgress } = options

  const { data: obra, error: obraError } = await supabase
    .from('obras')
    .select('id, titulo, clientes(nombre)')
    .eq('id', obraId)
    .single()
  if (obraError || !obra) throw new Error('No se pudo cargar la obra')

  const { data: planosData, error: planosError } = await supabase
    .from('planos')
    .select('*, plano_tipos_sistema(*)')
    .eq('obra_id', obraId)
    .order('created_at', { ascending: true })
  if (planosError) throw new Error(planosError.message)
  const planos = (planosData || []) as Plano[]
  if (planos.length === 0) throw new Error('Esta obra no tiene planos')

  const { data: medsData, error: medsError } = await supabase
    .from('plano_mediciones')
    .select('*, plano_tramos(*)')
    .in('plano_id', planos.map(p => p.id))
    .order('created_at', { ascending: true })
  if (medsError) throw new Error(medsError.message)

  const medsPorPlano = new Map<string, Medicion[]>()
  ;(medsData || []).forEach((m: any) => {
    const med: Medicion = {
      ...m,
      plano_tramos: [...(m.plano_tramos || [])].sort((a: any, b: any) =>
        String(a.created_at || '').localeCompare(String(b.created_at || ''))
      ),
    }
    const list = medsPorPlano.get(m.plano_id) || []
    list.push(med)
    medsPorPlano.set(m.plano_id, list)
  })

  const filas: Array<{ p: Plano; formula: Formula; meds: Medicion[]; ml: number; m2: number; m3: number }> = []
  const sistemasGlobales = new Map<string, { nombre: string; color: string; ml: number; m2: number; m3: number; formula: Formula }>()
  let totalMl = 0
  let totalM2 = 0
  let totalM3 = 0

  for (const p of planos) {
    const formula = formulaOf(p)
    const meds = medsPorPlano.get(p.id) || []
    const ml = meds.reduce((a, m) => a + mlOf(m), 0)
    const m2 = meds.reduce((a, m) => a + m2Of(m, formula), 0)
    const m3 = meds.reduce((a, m) => a + m3Of(m), 0)
    totalMl += ml
    totalM2 += m2
    totalM3 += m3
    filas.push({ p, formula, meds, ml, m2, m3 })

    for (const m of meds) {
      const key = `${m.nombre}|${m.color}`
      const prev = sistemasGlobales.get(key) || { nombre: m.nombre, color: m.color, ml: 0, m2: 0, m3: 0, formula }
      prev.ml += mlOf(m)
      prev.m2 += m2Of(m, formula)
      prev.m3 += m3Of(m)
      sistemasGlobales.set(key, prev)
    }
  }

  // ── Renderizar planos a imágenes (antes de montar el PDF, para saber páginas)
  const rendered: RenderedPage[] = []

  for (let i = 0; i < filas.length; i++) {
    const { p, formula, meds } = filas[i]
    onProgress?.(`Preparando plano ${i + 1} de ${filas.length}: ${p.nombre}`)

    const { data: signed, error: signedError } = await supabase.storage
      .from('planos')
      .createSignedUrl(p.archivo_path, 3600)
    if (signedError || !signed) throw new Error(`No se pudo abrir "${p.nombre}": ${signedError?.message || ''}`)

    const esPdf = p.mime_type === 'application/pdf' || /\.pdf$/i.test(p.archivo_path)
    const paginas = esPdf
      ? await renderPdfPagesToImageUrls(signed.signedUrl, 2400)
      : [{ imageUrl: signed.signedUrl, width: 0, height: 0 }]

    for (let pi = 0; pi < paginas.length; pi++) {
      const img = await loadImage(paginas[pi].imageUrl)
      const canvas = renderPlanCanvas(img, pi === 0 ? meds : [], formula, pi === 0)
      rendered.push({
        plan: p,
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height,
        meds: pi === 0 ? meds : [],
        formula,
        continuation: pi > 0,
      })
    }

    if (esPdf) {
      for (const page of paginas) URL.revokeObjectURL(page.imageUrl)
    }
  }

  const totalPages = rendered.length + 1
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
  const fecha = new Date().toLocaleDateString('es-ES')

  // ── Portada / resumen ─────────────────────────────────────────────────────
  {
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    drawHeader(doc, pw, null, String(obra.titulo || ''), 1, totalPages)

    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.text('RESUMEN DE MEDICIÓN', 10, 34)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text(`Obra: ${obra.titulo || ''}`, 10, 42)
    doc.text(`Cliente: ${(obra as any).clientes?.nombre || 'Sin cliente'}`, 10, 47.5)
    doc.text(`Fecha: ${fecha}`, 10, 53)
    doc.text(`Planos: ${planos.length}`, 10, 58.5)

    autoTable(doc, {
      startY: 66,
      head: [['Plano', 'Zona', 'Sistema', 'ML', 'm²', 'm³']],
      body: filas.map(f => [f.p.nombre, f.p.zona || '—', tipoNombre(f.p), fmt(f.ml), fmt(f.m2), fmt(f.m3)]),
      foot: [['TOTAL', '', '', fmt(totalMl), fmt(totalM2), fmt(totalM3)]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 61, 107], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [30, 61, 107], textColor: 255, fontStyle: 'bold' },
      margin: { left: 10, right: 10 },
    })

    const afterTable = (doc as any).lastAutoTable?.finalY || 120
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 61, 107)
    doc.text('SISTEMAS Y COLORES', 10, afterTable + 10)

    const sistemas = Array.from(sistemasGlobales.values())
    autoTable(doc, {
      startY: afterTable + 14,
      head: [['', 'Sistema', 'Cálculo', 'ML', 'm²', 'm³']],
      body: sistemas.map(s => ['●', s.nombre, FORMULA_LABEL[s.formula], fmt(s.ml), fmt(s.m2), fmt(s.m3)]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [30, 61, 107], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
      margin: { left: 10, right: 10 },
      didParseCell: data => {
        if (data.section === 'body' && data.column.index === 0) {
          const s = sistemas[data.row.index]
          const rgb = hexToRgb(s?.color || '#ec4899')
          data.cell.styles.textColor = rgb
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`ODEPLAC PRO · ${obra.titulo || ''}`, 10, ph - 3)
    doc.text('1', pw - 10, ph - 3, { align: 'right' })
  }

  // ── Páginas de planos ─────────────────────────────────────────────────────
  rendered.forEach((page, index) => {
    addPlanPage(doc, page, String(obra.titulo || ''), index + 2, totalPages)
  })

  const safe = String(obra.titulo || 'obra')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
  const date = new Date().toISOString().slice(0, 10)
  doc.save(`Medicion_${safe}_${date}.pdf`)
}
