'use client'

import { useAuth } from '@/contexts/auth-context'
import { HeroSection } from './hero-section'

export function HomeContent() {
  const { authState } = useAuth()

  // Show hero when logged out OR during loading (assume logged out)
  // This prevents cards from flashing before hero appears
  // Trade-off: logged-in users briefly see hero, but that's less jarring
  if (authState === 'authenticated') {
    return null
  }

  return <HeroSection />
}
