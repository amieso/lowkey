'use client'

import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'

// Orders grid-preview first-frame loading so previews paint roughly top-down
// instead of all racing the network at once. Without this, every above-the-fold
// card fires its HLS load simultaneously and whichever asset Mux returns first
// paints first — so the 2nd/3rd card routinely lost to one further down.
//
// At most MAX_CONCURRENT previews load their first frame at a time, admitted by
// vertical position (lower `priority` = higher up = goes first). A slot frees as
// soon as its preview paints (or gives up), so a slow/cold asset never blocks
// the ones below it. Only the initial first-frame race is gated; once a preview
// has painted it loads its (shallow) loop buffer freely.

const MAX_CONCURRENT = 4

type Registration = { priority: number; want: boolean }

const registrations = new Map<symbol, Registration>()
const listeners = new Set<() => void>()
let admitted = new Set<symbol>()

function recompute() {
  const wanters = [...registrations.entries()].filter(([, r]) => r.want)
  wanters.sort((a, b) => a[1].priority - b[1].priority)
  const next = new Set(wanters.slice(0, MAX_CONCURRENT).map(([key]) => key))

  // Only publish (and re-render subscribers) when the admitted set changes.
  const changed =
    next.size !== admitted.size || [...next].some((key) => !admitted.has(key))
  if (!changed) return
  admitted = next
  listeners.forEach((notify) => notify())
}

/**
 * Returns whether this preview currently holds a load slot. Pass `want = true`
 * while the preview wants to load its first frame (on-screen, not yet painted);
 * flip it false once it has painted or given up so the next card in line is
 * admitted.
 */
export function usePreviewLoadSlot(priority: number, want: boolean): boolean {
  const keyRef = useRef<symbol | null>(null)
  if (keyRef.current === null) keyRef.current = Symbol('preview-slot')
  const key = keyRef.current

  useEffect(() => {
    registrations.set(key, { priority, want })
    recompute()
    return () => {
      registrations.delete(key)
      recompute()
    }
  }, [key, priority, want])

  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    () => admitted.has(key),
    () => false, // never admitted during SSR — there's no loading there
  )
}
