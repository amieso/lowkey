'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authService, type AuthUser } from '@/services/auth-service'
import { collectionService } from '@/services'
import type { Profile } from '@/types/database'

// Auth states: 'loading' | 'authenticated' | 'unauthenticated'
type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  authState: AuthState
  isAuthModalOpen: boolean
  authModalMode: 'login' | 'signup'
  authMessage: string | null
  savedVideoSlugs: string[]
  openAuthModal: (mode: 'login' | 'signup') => void
  closeAuthModal: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
  refreshSavedVideos: () => Promise<void>
  addSavedVideo: (slug: string) => void
  removeSavedVideo: (slug: string) => void
  clearAuthMessage: () => void
  setAuthMessage: (message: string | null) => void
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
        setAuthMessage('Signing in...')
        refreshUser()
          .then((authUser) => {
            if (authUser) {
              setAuthMessage(`Welcome${authUser.profile?.name ? `, ${authUser.profile.name}` : ''}!`)
            } else {
              setAuthMessage('Signed in successfully!')
            }
            setTimeout(() => setAuthMessage(null), 3000)
          })
          .catch(() => {
            setAuthMessage('Sign in failed. Please try again.')
            setTimeout(() => setAuthMessage(null), 5000)
          })
      } else if (errorStatus === 'auth') {
        setAuthMessage('Sign in failed. Please try again.')
        setTimeout(() => setAuthMessage(null), 5000)
      }
    }
  }, [searchParams, router, refreshUser, setAuthMessage])

  return null
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  // CRITICAL: Start as 'loading' always - this prevents any flash
  // Components treat 'loading' same as 'authenticated' to prevent logged-out flash
  const [authState, setAuthState] = useState<AuthState>('loading')
  const isInitializedRef = useRef(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [savedVideoSlugs, setSavedVideoSlugs] = useState<string[]>([])

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
    // Initial load - only run once on mount
    const initAuth = async () => {
      try {
        // Race against timeout - don't let auth check hang forever
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000) // 3 second timeout
        })

        const currentUser = await Promise.race([
          authService.getUser(),
          timeoutPromise
        ])

        setUser(currentUser)
        if (currentUser?.id) {
          setAuthState('authenticated')
          // Fetch saved videos in background
          collectionService.getCollections(currentUser.id).then(collections => {
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
        }
      } catch (err) {
        console.error('[AuthContext] initAuth error:', err)
        setUser(null)
        setAuthState('unauthenticated')
      } finally {
        isInitializedRef.current = true
      }
    }

    initAuth()

    // Listen for auth changes AFTER initial load
    // This prevents the listener from overriding state during hydration
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      // Only respond to auth changes after initialization is complete
      // This prevents flash from listener firing before initAuth completes
      setUser(authUser)
      if (authUser) {
        setAuthState('authenticated')
        setIsAuthModalOpen(false)
      } else if (isInitializedRef.current) {
        // Only set to unauthenticated if we're already initialized
        // Otherwise, let initAuth handle it
        setAuthState('unauthenticated')
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

  const signUp = async (email: string, password: string, name?: string) => {
    await authService.signUp({ email, password, name })
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
      }}
    >
      {children}
      <Suspense fallback={null}>
        <AuthCallbackHandler />
      </Suspense>
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
