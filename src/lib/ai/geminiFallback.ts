import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Modelos a probar, en orden. El primero se puede forzar con GEMINI_MODEL.
 * Si un proyecto no tiene acceso a gemini-2.5-flash (404), se prueba el
 * siguiente automáticamente en vez de fallar toda la subida.
 */
export function geminiModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim()
  const defaults = [
    // Modelos actuales (Gemini 3). Los 2.5/2.0 están retirados para cuentas nuevas.
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    // Compatibilidad con claves/proyectos antiguos
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
  ]
  return Array.from(new Set([configured, ...defaults].filter(Boolean) as string[]))
}

export function isModelUnavailable(error: any): boolean {
  const status = error?.status ?? error?.statusCode
  const message = String(error?.message || error || '').toLowerCase()
  return (
    String(status) === '404' ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('is not found') ||
    message.includes('not supported') ||
    message.includes('does not exist')
  )
}

/**
 * Llama a Gemini probando modelos hasta que uno responda.
 * - 404 / modelo no disponible → siguiente modelo
 * - 503 / saturación → reintenta el mismo y, si no, siguiente modelo
 * - 403 / 429 / otros → error inmediato (no se arregla cambiando de modelo)
 */
export async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  request: any,
  options?: { generationConfig?: Record<string, any>; retries?: number }
): Promise<{ result: any; model: string }> {
  const models = geminiModelCandidates()
  const retries = options?.retries ?? 2
  let lastError: any

  for (const name of models) {
    const model = genAI.getGenerativeModel({
      model: name,
      ...(options?.generationConfig ? { generationConfig: options.generationConfig } : {}),
    })

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await model.generateContent(request)
        if (name !== models[0]) console.warn(`[gemini] usando modelo alternativo: ${name}`)
        return { result, model: name }
      } catch (err: any) {
        lastError = err

        if (isModelUnavailable(err)) {
          console.warn(`[gemini] modelo no disponible: ${name}`)
          break
        }

        const status = err?.status ?? err?.statusCode
        const es503 = String(status) === '503' || /503|unavailable|high demand|overloaded/i.test(String(err?.message || ''))
        if (es503) {
          if (attempt < retries - 1) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
            continue
          }
          console.warn(`[gemini] modelo saturado tras reintentos: ${name}`)
          break
        }

        throw err
      }
    }
  }

  const message = lastError?.message || String(lastError || 'sin detalle')
  const error = new Error(
    `Ningún modelo de Gemini disponible con esta clave (${models.join(', ')}). Último error: ${message}`
  )
  ;(error as any).status = 404
  throw error
}
