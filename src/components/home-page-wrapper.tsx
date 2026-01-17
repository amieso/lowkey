'use client'

import { useEffect, useState } from 'react'
import { IntroAnimation } from '@/components/intro/intro-animation'
import { useFirstVisit } from '@/hooks/use-first-visit'
import { IntroProvider, useIntroContext } from '@/context/intro-context'

interface HomePageWrapperProps {
  children: React.ReactNode
}

function HomePageContent({ children }: HomePageWrapperProps) {
  const { shouldShowIntro: showIntroFromHook, isLoading, markAsSeen } = useFirstVisit()
  const { setIntroComplete, setShouldShowIntro, contentReady, setContentReady } = useIntroContext()

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

  // Intro path - once started, stay here even after markAsSeen runs
  // Children mount when contentReady (when settling starts at 2.3s)
  // This allows Header logo to animate from center during settling
  return (
    <>
      <IntroAnimation
        onComplete={handleIntroComplete}
        onContentReady={handleContentReady}
      />
      {contentReady && children}
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
