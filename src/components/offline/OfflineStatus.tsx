'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { flushQueue, getQueue, queueSize } from '@/lib/offline/queue'
import { toast } from 'sonner'
import { CloudOff, Loader2, RefreshCw } from 'lucide-react'

/**
 * Indicador de cobertura y cola de sincronización.
 * Se muestra solo si no hay red o hay cambios pendientes.
 */
export default function OfflineStatus() {
  const supabase = useMemo(() => createClient(), [])
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  const refresh = useCallback(() => {
    setPending(queueSize())
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
  }, [])

  const sync = useCallback(
    async (notify: boolean) => {
      if (syncingRef.current || (typeof navigator !== 'undefined' && !navigator.onLine)) return
      if (getQueue().length === 0) return

      syncingRef.current = true
      setSyncing(true)
      try {
        const { synced, pending: remaining, failed } = await flushQueue(supabase)
        setPending(remaining)

        if (synced > 0) {
          if (notify) {
            toast.success(`${synced} cambio${synced === 1 ? '' : 's'} sincronizado${synced === 1 ? '' : 's'}`, {
              action: { label: 'Recargar', onClick: () => window.location.reload() },
            })
          } else {
            toast.success(`${synced} cambio${synced === 1 ? '' : 's'} sincronizado${synced === 1 ? '' : 's'}`)
          }
        }

        if (failed > 0) {
          toast.error(
            `${failed} cambio${failed === 1 ? '' : 's'} no se pudo enviar. Se reintentará más tarde.`
          )
        }
      } finally {
        syncingRef.current = false
        setSyncing(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    refresh()
    if (navigator.onLine) void sync(false)

    const handleOnline = () => {
      refresh()
      void sync(true)
    }
    const handleOffline = () => refresh()
    const handleQueue = () => refresh()
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh()
        if (navigator.onLine) void sync(false)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('odeplac:offline-queue-changed', handleQueue)
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('odeplac:offline-queue-changed', handleQueue)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [refresh, sync])

  if (online && pending === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl ${
          !online
            ? 'bg-amber-500/95 text-amber-950 border-amber-300'
            : 'bg-[#1e3d6b]/95 text-white border-white/20'
        }`}
      >
        {!online ? (
          <CloudOff size={15} strokeWidth={2.6} />
        ) : syncing ? (
          <Loader2 size={15} strokeWidth={2.6} className="animate-spin" />
        ) : (
          <RefreshCw size={15} strokeWidth={2.6} />
        )}

        <span>
          {!online
            ? `Sin conexión${pending > 0 ? ` · ${pending} pendiente${pending === 1 ? '' : 's'}` : ''}`
            : `${pending} cambio${pending === 1 ? '' : 's'} por enviar`}
        </span>

        {online && !syncing && pending > 0 && (
          <button
            onClick={() => void sync(true)}
            className="ml-1 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-white/25"
          >
            Enviar
          </button>
        )}
      </div>
    </div>
  )
}
