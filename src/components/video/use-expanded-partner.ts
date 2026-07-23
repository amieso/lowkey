'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackGoal, GOALS } from '@/lib/analytics'

// Expansion state for the partner card's lightbox, mirroring the URL mechanics
// of use-expanded-video: opening pushes /partner via the History API (no Next
// navigation, so the grid stays mounted), closing pops that entry, and
// Back/Forward reconcile the overlay to the URL. A reload or shared link on
// /partner therefore lands on the real server-rendered page, which stays
// intact for SEO — the overlay is just the in-grid presentation of it.
export function useExpandedPartner() {
  const [expanded, setExpanded] = useState(false)
  // Same push/pop bookkeeping as use-expanded-video: only pop an entry we
  // pushed ourselves, and don't echo URL writes back through popstate.
  const pushedEntryRef = useRef(false)
  const syncingFromPopRef = useRef(false)

  const writeUrl = useCallback((url: string, mode: 'push' | 'replace') => {
    if (typeof window === 'undefined') return
    const state = window.history.state
    if (mode === 'push') window.history.pushState(state, '', url)
    else window.history.replaceState(state, '', url)
  }, [])

  const open = useCallback(() => {
    setExpanded(true)
    trackGoal(GOALS.partnerOpen, { source: 'grid' })
    if (syncingFromPopRef.current) return
    writeUrl('/partner', 'push')
    pushedEntryRef.current = true
  }, [writeUrl])

  const close = useCallback(() => {
    setExpanded(false)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    if (syncingFromPopRef.current) return
    if (pushedEntryRef.current) {
      pushedEntryRef.current = false
      window.history.back()
    } else {
      // Reached via Forward: no entry of ours to pop, so rewrite in place.
      writeUrl('/', 'replace')
    }
  }, [writeUrl])

  useEffect(() => {
    const handlePopState = () => {
      syncingFromPopRef.current = true
      setExpanded(window.location.pathname === '/partner')
      pushedEntryRef.current = false
      requestAnimationFrame(() => {
        syncingFromPopRef.current = false
      })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return { expanded, open, close }
}
