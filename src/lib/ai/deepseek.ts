import OpenAI from 'openai'

/**
 * Proveedor de IA para ODEPLAC.
 * - `deepseek` usa DeepSeek OCR + deepseek-flash (recomendado).
 * - `gemini` mantiene el camino anterior como respaldo.
 * Se elige con AI_PROVIDER o, si no está definido, por la presencia de DEEPSEEK_API_KEY.
 */
export type AIProvider = 'deepseek' | 'gemini'

const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash'
const MAX_OUTPUT_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS || 32000)

export class DeepSeekError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'DeepSeekError'
    this.status = status
  }
}

export function aiProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER
  if (configured === 'gemini' || configured === 'deepseek') return configured
  return process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'gemini'
}

function apiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new DeepSeekError('Falta DEEPSEEK_API_KEY', 500)
  return key
}

function client(): OpenAI {
  return new OpenAI({ apiKey: apiKey(), baseURL: BASE_URL })
}

async function errorFromResponse(res: Response): Promise<DeepSeekError> {
  const raw = await res.text()
  let message = raw.slice(0, 300)
  try {
    const parsed = JSON.parse(raw)
    message = parsed.error?.message || parsed.message || message
  } catch {}
  return new DeepSeekError(message || `DeepSeek HTTP ${res.status}`, res.status)
}

/** OCR de un PDF o imagen. Devuelve el texto página a página. */
export async function deepseekOcr(file: File): Promise<{ text: string; pages: number }> {
  const form = new FormData()
  form.append('purpose', 'text_recognition')
  form.append('file', file, file.name || 'documento.pdf')

  const res = await fetch(`${BASE_URL}/v1/tools/ocr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  })

  if (!res.ok) throw await errorFromResponse(res)

  let data: any
  try {
    data = await res.json()
  } catch {
    throw new DeepSeekError('OCR de DeepSeek devolvió una respuesta no JSON', 502)
  }

  if (data.error) {
    throw new DeepSeekError(data.error.message || 'Error de OCR', data.error.code ? 502 : 500)
  }

  const text = (data.pages || [])
    .map((p: any) => String(p.text || '').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()

  if (!text) throw new DeepSeekError('No se pudo leer texto del documento', 422)

  return { text, pages: data.page_count || (data.pages || []).length }
}

/** Extrae JSON a partir de un texto, con salida JSON forzada. */
export async function deepseekJson(prompt: string, text: string, options?: { maxTokens?: number }): Promise<any> {
  try {
    const completion = await client().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nTEXTO EXTRAÍDO DEL DOCUMENTO:\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: options?.maxTokens ?? MAX_OUTPUT_TOKENS,
      // Extracción: no necesitamos razonamiento largo; acelera y abarata.
      ...({ reasoning_effort: 'low' } as any),
    })

    const choice = completion.choices[0]
    const content = choice?.message?.content || ''
    const finish = choice?.finish_reason || '?'
    const clean = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

    try {
      return JSON.parse(clean)
    } catch {
      // A veces añade texto antes/después del objeto JSON; intentamos aislarlo.
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(clean.slice(start, end + 1))
        } catch {}
      }
      console.warn('[deepseek] JSON inválido', { finish, chars: clean.length })
      throw new DeepSeekError(
        `DeepSeek no devolvió un JSON válido (finish: ${finish}, ${clean.length} caracteres). ` +
        'Puede ser una factura demasiado larga; vuelve a intentarlo o divídela por páginas.',
        422
      )
    }
  } catch (err: any) {
    if (err instanceof DeepSeekError) throw err
    const status = err?.status || err?.statusCode || 500
    throw new DeepSeekError(err?.message || 'Error llamando a DeepSeek', status)
  }
}

/** Chat de texto (asistente y entrenamiento). */
export async function deepseekChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { json?: boolean; maxTokens?: number; reasoning?: 'low' | 'high' | 'max' }
): Promise<string> {
  try {
    const completion = await client().chat.completions.create({
      model: MODEL,
      messages,
      ...(options?.json ? { response_format: { type: 'json_object' as const } } : {}),
      max_tokens: options?.maxTokens ?? 2000,
      ...({ reasoning_effort: options?.reasoning || 'low' } as any),
    })
    return completion.choices[0]?.message?.content || ''
  } catch (err: any) {
    if (err instanceof DeepSeekError) throw err
    const status = err?.status || err?.statusCode || 500
    throw new DeepSeekError(err?.message || 'Error llamando a DeepSeek', status)
  }
}
