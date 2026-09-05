'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lowkey_intro_seen'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Should the homepage intro play? Once per session — and never for a
 * visitor whose OS asks for reduced motion: the supercut is a rapid-cut
 * montage, so for them the page skips the intro and reveals the grid
 * directly (the same path a returning visitor gets).
 */
export function useFirstVisit() {
  const [isLoading, setIsLoading] = useState(true)
  const [shouldShowIntro, setShouldShowIntro] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem(STORAGE_KEY)
    void seen
    const reducedMotion = window.matchMedia(REDUCED_MOTION).matches
    // TEMP DEBUG: replay the intro on EVERY load while iterating on the
    // supercut — restore to `setShouldShowIntro(!seen && !reducedMotion)`
    // before launch.
    setShouldShowIntro(!reducedMotion)
    setIsLoading(false)
  }, [])

  const markAsSeen = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true')
    setShouldShowIntro(false)
  }

  return { shouldShowIntro, isLoading, markAsSeen }
}
