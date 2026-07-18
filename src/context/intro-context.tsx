'use client'

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

type IntroPhase = 'tracing' | 'holding' | 'settling' | 'done'

interface IntroContextType {
  introComplete: boolean
  setIntroComplete: (value: boolean) => void
  shouldShowIntro: boolean
  setShouldShowIntro: (value: boolean) => void
  contentReady: boolean
  setContentReady: (value: boolean) => void
  introPhase: IntroPhase
  setIntroPhase: (phase: IntroPhase) => void
  /** How many leading grid cards the intro lands on (supercut split). The
   *  grid holds these cards' reveal until 'done' so the landed pieces cover
   *  them; the intro lowers it to 1 when it can't split (narrow layouts). */
  introTargetCount: number
  setIntroTargetCount: (n: number) => void
  /** How many of those pieces have seated so far. A target card reveals the
   *  moment its piece lands (the piece still covers the media box, so
   *  visually this is the meta text fading in right at touchdown). */
  introLandedCount: number
  setIntroLandedCount: (n: number) => void
  /** True once the intro's pieces have largely cleared the hero area
   *  (mid-fall). The hero fades 50% → 100% off this, timed to when it
   *  actually becomes visible rather than the split instant. */
  introHeroReveal: boolean
  setIntroHeroReveal: (v: boolean) => void
  /** True once every registered above-the-fold preview has painted a frame. */
  mediaReady: boolean
  /** A preview declares it's loading and should gate the intro reveal. */
  registerMedia: (id: string) => void
  /** A preview reports it has painted its first frame. */
  markMediaLoaded: (id: string) => void
}

const IntroContext = createContext<IntroContextType | null>(null)

export function IntroProvider({ children }: { children: ReactNode }) {
  const [introComplete, setIntroComplete] = useState(false)
  const [shouldShowIntro, setShouldShowIntro] = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const [introPhase, setIntroPhase] = useState<IntroPhase>('tracing')
  const [introTargetCount, setIntroTargetCount] = useState(4)
  const [introLandedCount, setIntroLandedCount] = useState(0)
  const [introHeroReveal, setIntroHeroReveal] = useState(false)

  const pendingMediaRef = useRef<Set<string>>(new Set())
  const loadedMediaRef = useRef<Set<string>>(new Set())
  const [mediaReady, setMediaReady] = useState(false)

  const recomputeMediaReady = useCallback(() => {
    const pending = pendingMediaRef.current
    const loaded = loadedMediaRef.current
    // Nothing above the fold to wait for counts as ready — but the moment a real
    // preview registers (before the blink ends) this flips false until it paints.
    setMediaReady([...pending].every((id) => loaded.has(id)))
  }, [])

  const registerMedia = useCallback((id: string) => {
    if (pendingMediaRef.current.has(id)) return
    pendingMediaRef.current.add(id)
    recomputeMediaReady()
  }, [recomputeMediaReady])

  const markMediaLoaded = useCallback((id: string) => {
    if (loadedMediaRef.current.has(id)) return
    loadedMediaRef.current.add(id)
    recomputeMediaReady()
  }, [recomputeMediaReady])

  return (
    <IntroContext.Provider
      value={{
        introComplete,
        setIntroComplete,
        shouldShowIntro,
        setShouldShowIntro,
        contentReady,
        setContentReady,
        introPhase,
        setIntroPhase,
        introTargetCount,
        setIntroTargetCount,
        introLandedCount,
        setIntroLandedCount,
        introHeroReveal,
        setIntroHeroReveal,
        mediaReady,
        registerMedia,
        markMediaLoaded,
      }}
    >
      {children}
    </IntroContext.Provider>
  )
}

export function useIntroContext() {
  const context = useContext(IntroContext)
  if (!context) {
    // Return safe defaults when used outside provider
    return {
      introComplete: true,
      setIntroComplete: () => {},
      shouldShowIntro: false,
      setShouldShowIntro: () => {},
      contentReady: true,
      setContentReady: () => {},
      introPhase: 'done' as IntroPhase,
      setIntroPhase: () => {},
      introTargetCount: 0,
      setIntroTargetCount: () => {},
      introLandedCount: 0,
      setIntroLandedCount: () => {},
      introHeroReveal: true,
      setIntroHeroReveal: () => {},
      mediaReady: true,
      registerMedia: () => {},
      markMediaLoaded: () => {},
    }
  }
  return context
}
