'use client'

import { useAuth } from '@/contexts/auth-context'
import { HeroSection } from './hero-section'

export function HomeContent() {
  const { authState } = useAuth()

  // Hide hero if authenticated
  if (authState === 'authenticated') {
    return null
  }

  // Show hero for unauthenticated users and during initial loading
  return <HeroSection />
}
