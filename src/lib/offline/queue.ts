import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cola de escrituras pendientes para trabajar sin cobertura.
 *
 * Guarda inserciones en localStorage y las reintenta al recuperar la red.
 * Cada operación lleva un `id` UUID generado en el dispositivo para que el
 * reintento sea idempotente (si ya se guardó, el duplicado se descarta).
 */

export type OfflineOperation = {
  id: string
  table: string
  payload: Record<string, unknown>
  label: string
  createdAt: string
}

const STORAGE_KEY = 'odeplac:offline-queue:v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getQueue(): OfflineOperation[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function queueSize(): number {
  return getQueue().length
}

function persist(queue: OfflineOperation[]): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    window.dispatchEvent(new CustomEvent('odeplac:offline-queue-changed'))
  } catch {
    // Sin espacio o almacenamiento bloqueado: no romper la app
  }
}

export function enqueueOperation(
  table: string,
  payload: Record<string, unknown>,
  label: string
): OfflineOperation {
  const op: OfflineOperation = {
    id: crypto.randomUUID(),
    table,
    payload,
    label,
    createdAt: new Date().toISOString(),
  }
  persist([...getQueue(), op])
  return op
}

export function removeOperation(id: string): void {
  persist(getQueue().filter(op => op.id !== id))
}

export function clearQueue(): void {
  persist([])
}

/** Detecta fallos de red/cobertura frente a errores reales de la base de datos. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ((error as { message?: string } | null)?.message ?? '')

  return /failed to fetch|networkerror|network error|fetch failed|load failed|timeout|timed out|aborted|err_internet|err_network|connection|offline|sin conexi[oó]n/i.test(
    message
  )
}

/**
 * Intenta insertar. Si falla por falta de red, deja la operación en cola.
 * Devuelve `queued` para que la pantalla pueda actualizar su estado local.
 */
export async function saveOrQueue(
  supabase: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
  label: string
): Promise<{ queued: boolean; error?: string }> {
  try {
    const { error } = await supabase.from(table).insert([payload])
    if (!error) return { queued: false }
    if (isNetworkError(error)) {
      enqueueOperation(table, payload, label)
      return { queued: true }
    }
    return { queued: false, error: error.message }
  } catch (err) {
    if (isNetworkError(err)) {
      enqueueOperation(table, payload, label)
      return { queued: true }
    }
    return { queued: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Envía las operaciones pendientes.
 * - duplicado (23505): ya estaba guardada → se descarta
 * - error de red: se para y se reintenta más tarde
 * - error de negocio (RLS, columna inexistente...): se conserva para no perder datos
 */
export async function flushQueue(
  supabase: SupabaseClient
): Promise<{ synced: number; pending: number; failed: number }> {
  if (!canUseStorage() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { synced: 0, pending: queueSize(), failed: 0 }
  }

  let synced = 0
  let failed = 0

  for (const op of getQueue()) {
    try {
      const { error } = await supabase.from(op.table).insert([op.payload])

      if (!error) {
        removeOperation(op.id)
        synced++
        continue
      }

      const message = (error.message || '').toLowerCase()
      const duplicate =
        error.code === '23505' ||
        message.includes('duplicate key') ||
        message.includes('already exists')

      if (duplicate) {
        removeOperation(op.id)
        synced++
        continue
      }

      if (isNetworkError(error)) break

      failed++
      console.warn(`[offline] No se pudo sincronizar ${op.table}:`, error.message)
    } catch (err) {
      if (isNetworkError(err)) break
      failed++
      console.warn(`[offline] Error inesperado sincronizando ${op.table}:`, err)
    }
  }

  return { synced, pending: queueSize(), failed }
}
