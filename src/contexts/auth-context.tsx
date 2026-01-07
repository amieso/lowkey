'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authService, type AuthUser } from '@/services/auth-service'
import { collectionService } from '@/services'
import type { Profile } from '@/types/database'

// Auth states: 'loading' | 'authenticated' | 'unauthenticated'
type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthProviderProps {
  children: ReactNode
  initialAuthState?: AuthState
}

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  authState: AuthState
  isAuthModalOpen: boolean
  authModalMode: 'login' | 'signup'
  authMessage: string | null
  savedVideoSlugs: string[]
  isOnboardingOpen: boolean
  openAuthModal: (mode: 'login' | 'signup') => void
  closeAuthModal: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string, avatarColor?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
  refreshSavedVideos: () => Promise<void>
  addSavedVideo: (slug: string) => void
  removeSavedVideo: (slug: string) => void
  clearAuthMessage: () => void
  setAuthMessage: (message: string | null) => void
  completeOnboarding: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Separate component for handling auth callback params (needs Suspense)
function AuthCallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser, setAuthMessage } = useAuth()

  useEffect(() => {
    const authStatus = searchParams.get('auth')
    const errorStatus = searchParams.get('error')

    if (authStatus === 'success' || errorStatus === 'auth') {
      // Clean URL params
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('auth')
      newUrl.searchParams.delete('error')
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })

      if (authStatus === 'success') {
        // Small delay to ensure cookies are processed by browser after redirect
        setTimeout(() => {
          refreshUser().catch(() => {
            setAuthMessage('Sign in failed. Please try again.')
            setTimeout(() => setAuthMessage(null), 5000)
          })
        }, 100)
      } else if (errorStatus === 'auth') {
        setAuthMessage('Sign in failed. Please try again.')
        setTimeout(() => setAuthMessage(null), 5000)
      }
    }
  }, [searchParams, router, refreshUser, setAuthMessage])

  return null
}

function AuthProviderInner({ children, initialAuthState = 'loading' }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  // Start as loading until we have user data, even if server says authenticated
  // This prevents flash of "User" with default avatar before profile loads
  const [authState, setAuthState] = useState<AuthState>(
    initialAuthState === 'unauthenticated' ? 'unauthenticated' : 'loading'
  )
  const isInitializedRef = useRef(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [savedVideoSlugs, setSavedVideoSlugs] = useState<string[]>([])
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)

  // Show onboarding if user is authenticated but has no name set
  const needsOnboarding = authState === 'authenticated' && !!user?.profile && !user.profile.name && !onboardingCompleted

  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted(true)
  }, [])

  const refreshSavedVideos = useCallback(async (userId?: string) => {
    const id = userId || user?.id
    if (!id) return

    try {
      const collections = await collectionService.getCollections(id)
      const defaultCollection = collections.find(c => c.is_default)
      if (defaultCollection) {
        const fullCollection = await collectionService.getCollection(defaultCollection.id)
        if (fullCollection) {
          setSavedVideoSlugs(fullCollection.items.map(item => item.video_slug))
        }
      }
    } catch (error) {
      console.error('Error fetching saved videos:', error)
    }
  }, [user?.id])

  const addSavedVideo = useCallback((slug: string) => {
    setSavedVideoSlugs(prev => prev.includes(slug) ? prev : [...prev, slug])
  }, [])

  const removeSavedVideo = useCallback((slug: string) => {
    setSavedVideoSlugs(prev => prev.filter(s => s !== slug))
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getUser()
      setUser(currentUser)
      if (currentUser?.id) {
        setAuthState('authenticated')
        refreshSavedVideos(currentUser.id)
      } else {
        setAuthState('unauthenticated')
      }
      return currentUser
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
      setAuthState('unauthenticated')
      return null
    }
  }, [refreshSavedVideos])

  const clearAuthMessage = useCallback(() => {
    setAuthMessage(null)
  }, [])

  useEffect(() => {
    // Server already determined auth state via getUser() which validates with Supabase server
    // Only fetch user data if server says we're authenticated - don't override server's determination
    // This prevents flash from stale localStorage sessions that server already rejected
    const initAuth = async () => {
      try {
        // If server says unauthenticated, trust it - don't let stale client session override
        if (initialAuthState === 'unauthenticated') {
          isInitializedRef.current = true
          return
        }

        // Server says authenticated - fetch user data for the UI
        const currentUser = await authService.getUser()
        if (currentUser) {
          setUser(currentUser)
          setAuthState('authenticated') // Only show as authenticated after user data is loaded
          // Fetch saved videos
          const collections = await collectionService.getCollections(currentUser.id)
          const defaultCollection = collections.find(c => c.is_default)
          if (defaultCollection) {
            const fullCollection = await collectionService.getCollection(defaultCollection.id)
            if (fullCollection) {
              setSavedVideoSlugs(fullCollection.items.map(item => item.video_slug))
            }
          }
        } else {
          // Session expired between SSR and client hydration - update state
          setAuthState('unauthenticated')
        }
      } catch {
        setAuthState('unauthenticated')
      }
      isInitializedRef.current = true
    }

    initAuth()

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = authService.onAuthStateChange((authUser: AuthUser | null, event: string) => {
      console.log('[AuthContext] onAuthStateChange:', event, authUser?.email ?? 'null')

      // Skip INITIAL_SESSION - we handle that with initAuth above
      if (event === 'INITIAL_SESSION') {
        return
      }

      setUser(authUser)
      if (authUser) {
        setAuthState('authenticated')
        setIsAuthModalOpen(false)
        // Fetch saved videos
        collectionService.getCollections(authUser.id).then(collections => {
          const defaultCollection = collections.find(c => c.is_default)
          if (defaultCollection) {
            collectionService.getCollection(defaultCollection.id).then(fullCollection => {
              if (fullCollection) {
                setSavedVideoSlugs(fullCollection.items.map(item => item.video_slug))
              }
            })
          }
        })
      } else {
        setAuthState('unauthenticated')
        setSavedVideoSlugs([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const signIn = async (email: string, password: string) => {
    await authService.signIn({ email, password })
    await refreshUser()
    closeAuthModal()
  }

  const signUp = async (email: string, password: string, name?: string, avatarColor?: string) => {
    await authService.signUp({ email, password, name, avatarColor })
    // User may need to verify email, so don't close modal yet
  }

  const signInWithGoogle = async () => {
    await authService.signInWithOAuth('google')
    // Redirect happens, modal closes on callback
  }

  const signInWithMagicLink = async (email: string) => {
    await authService.signInWithMagicLink(email)
  }

  const signOut = async () => {
    await authService.signOut()
    setUser(null)
    setSavedVideoSlugs([])
    setAuthState('unauthenticated')
    // Force full page reload to clear server cache and get fresh auth state
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user?.profile ?? null,
        authState,
        isAuthModalOpen,
        authModalMode,
        authMessage,
        savedVideoSlugs,
        isOnboardingOpen: needsOnboarding,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
        refreshUser,
        refreshSavedVideos,
        addSavedVideo,
        removeSavedVideo,
        clearAuthMessage,
        setAuthMessage,
        completeOnboarding,
      }}
    >
      {children}
      <Suspense fallback={null}>
        <AuthCallbackHandler />
      </Suspense>
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children, initialAuthState }: AuthProviderProps) {
  return <AuthProviderInner initialAuthState={initialAuthState}>{children}</AuthProviderInner>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
