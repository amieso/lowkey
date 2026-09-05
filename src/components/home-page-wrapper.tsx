'use client'

import { useEffect, useState } from 'react'
// The eye-blink intro (IntroAnimation) is kept in intro-animation.tsx —
// swap the import back to restore it over the supercut.
import { SupercutIntro } from '@/components/intro/supercut-intro'
import { useFirstVisit } from '@/hooks/use-first-visit'
import { IntroProvider, useIntroContext } from '@/context/intro-context'

interface HomePageWrapperProps {
  children: React.ReactNode
}

function HomePageContent({ children }: HomePageWrapperProps) {
  const { shouldShowIntro: showIntroFromHook, isLoading, markAsSeen } = useFirstVisit()
  const { setIntroComplete, setShouldShowIntro, setContentReady } = useIntroContext()

  // Once intro starts, commit to intro path - prevents remount when markAsSeen runs
  // This fixes double-loading: without this, markAsSeen() changes showIntroFromHook to false,
  // causing React to switch render branches and remount all children
  const [introStarted, setIntroStarted] = useState(false)

  // Sync the hook state with context on mount
  useEffect(() => {
    if (!isLoading && showIntroFromHook) {
      setIntroStarted(true)
      setShouldShowIntro(true)
    }
    // If no intro needed, mark as complete so logo animates
    if (!isLoading && !showIntroFromHook && !introStarted) {
      setIntroComplete(true)
    }
  }, [isLoading, showIntroFromHook, introStarted, setShouldShowIntro, setIntroComplete])

  const handleIntroComplete = () => {
    markAsSeen() // Mark for next visit, but don't change render branch
    setIntroComplete(true)
  }

  const handleContentReady = () => {
    setContentReady(true)
  }

  // The page is ALWAYS rendered — including on the server — with a slot in
  // front of it: a static cover while the session check runs, the intro once
  // it says so, nothing otherwise. The slot changes; the children never
  // remount (same fragment position throughout). The old shape returned a
  // bare black div until client JS had run, so a visitor whose scripts
  // never executed (or hydrated) saw black forever, with no error and no
  // page — the exact "stays black" report. Now the server HTML carries the
  // real page under a cover that CSS alone lifts if nothing else does.
  const slot = isLoading ? (
    <NoScriptCover />
  ) : showIntroFromHook || introStarted ? (
    // Intro path - once started, stay here even after markAsSeen runs.
    // Children are already mounted (behind the opaque overlay) so the visible
    // previews load while the supercut frames preload. The header logo and
    // grid animate off the intro phase (not mount), so they still fly in at
    // the settling reveal.
    <SupercutIntro
      onComplete={handleIntroComplete}
      onContentReady={handleContentReady}
    />
  ) : null

  return (
    <>
      {slot}
      {children}
    </>
  )
}

// Opaque cover for the pre-hydration frame. The intro replaces it the moment
// the session check runs; if client JS never runs at all, a CSS animation
// lifts it after NOSCRIPT_COVER_S so the server-rendered page shows anyway.
// (Nothing else on the page can act without JS, so the delay only matters
// in that failure case — a healthy load swaps this out within a frame.)
const NOSCRIPT_COVER_S = 6
function NoScriptCover() {
  return (
    <>
      <style>{`@keyframes lk-cover-release{to{opacity:0;visibility:hidden}}`}</style>
      <div
        className="fixed inset-0 z-[100] bg-[#0a0a0a]"
        style={{ animation: `lk-cover-release 0.5s ease-out ${NOSCRIPT_COVER_S}s forwards` }}
      />
    </>
  )
}

export function HomePageWrapper({ children }: HomePageWrapperProps) {
  return (
    <IntroProvider>
      <HomePageContent>{children}</HomePageContent>
    </IntroProvider>
  )
}
