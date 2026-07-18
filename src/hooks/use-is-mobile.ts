'use client'

import { useSyncExternalStore } from 'react'

// Matches Tailwind's `sm` breakpoint, so a JS branch and a `sm:` class always
// agree about what "mobile" means. The expanded player can't do this in CSS
// alone — phones get a structurally different layout (video pinned to the top,
// chrome stacked below in its own panel) rather than a restyled overlay.
const QUERY = '(max-width: 639px)'

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // assume desktop during SSR
  )
}
