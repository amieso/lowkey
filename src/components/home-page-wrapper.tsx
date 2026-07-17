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

  // Still loading from sessionStorage - show nothing
  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  // No intro needed AND never started one - render children immediately
  if (!showIntroFromHook && !introStarted) {
    return <>{children}</>
  }

  // Intro path - once started, stay here even after markAsSeen runs.
  // Children mount immediately (behind the opaque overlay) so the visible
  // previews load while the supercut frames preload — the intro holds its
  // start until they've painted. The header logo and grid animate off the
  // intro phase (not mount), so they still fly in at the settling reveal.
  return (
    <>
      <SupercutIntro
        onComplete={handleIntroComplete}
        onContentReady={handleContentReady}
      />
      {children}
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
