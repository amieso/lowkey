'use client'

import { useAuth } from '@/contexts/auth-context'
import { HeroSection } from './hero-section'

export function HomeContent() {
  const { authState } = useAuth()

  // During loading, hide hero to prevent flash for logged-in users
  // Only show hero when we KNOW user is logged out
  if (authState !== 'unauthenticated') {
    return null
  }

  return <HeroSection />
}
