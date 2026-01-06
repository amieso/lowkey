'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Input } from '@/components/ui/input'

type AuthStep = 'initial' | 'email' | 'password' | 'magic-link-sent'

export function AuthModal() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, signIn, signUp, signInWithGoogle, signInWithMagicLink } = useAuth()
  const [step, setStep] = useState<AuthStep>('initial')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>(authModalMode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync mode with context when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode)
      setStep('initial')
      setEmail('')
      setPassword('')
      setName('')
      setError(null)
      setIsLoading(false)
    }
  }, [isAuthModalOpen, authModalMode])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAuthModal()
      }
    },
    [closeAuthModal]
  )

  useEffect(() => {
    if (isAuthModalOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isAuthModalOpen, handleEscape])

  const handleGoogleAuth = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await signInWithMagicLink(email)
      setStep('magic-link-sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setStep('password')
      setError(null)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, name || undefined)
        // Show success message for signup (email verification may be required)
        setStep('magic-link-sent')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step === 'password') {
      setStep('email')
      setPassword('')
    } else if (step === 'email') {
      setStep('initial')
      setEmail('')
    } else if (step === 'magic-link-sent') {
      setStep('email')
    }
  }

  const getTitle = () => {
    if (step === 'magic-link-sent') return 'Check Your Email'
    return mode === 'login' ? 'Welcome Back' : 'Join Lowkey'
  }

  const getDescription = () => {
    if (step === 'magic-link-sent') {
      return `We sent a sign-in link to ${email}. Click the link to continue.`
    }
    return mode === 'login'
      ? 'Sign in to pick up where you left off and access the full library.'
      : 'Create a free account to unlock every video in the library.'
  }

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg"
        >
          {/* Backdrop - click to close */}
          <div className="absolute inset-0" onClick={closeAuthModal} />

          {/* Logo above modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative z-10 mb-6"
          >
            <span className="text-2xl font-kanit font-bold text-foreground">lowkey</span>
          </motion.div>

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1], layout: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
            layout
            className="relative z-10 w-full max-w-sm mx-4 bg-surface rounded-[32px] border border-border overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-12">
              <AnimatePresence mode="wait">
                {step !== 'magic-link-sent' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-9 bg-white/5 rounded-full p-[3px]"
                  >
                    <button
                      onClick={() => setMode('login')}
                      className={`h-[30px] px-4 text-sm rounded-full transition-colors ${
                        mode === 'login'
                          ? 'bg-white/10 text-foreground'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => setMode('signup')}
                      className={`h-[30px] px-4 text-sm rounded-full transition-colors ${
                        mode === 'signup'
                          ? 'bg-white/10 text-foreground'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Sign up
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={closeAuthModal}
                className={`w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors ${step === 'magic-link-sent' ? 'ml-auto' : ''}`}
                aria-label="Close modal"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            {/* Title and copy */}
            <div className="px-[50px] mt-2.5 mb-2.5 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step}-${mode}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 id="auth-modal-title" className="text-xl font-medium text-foreground mb-2">
                    {getTitle()}
                  </h2>
                  <p className="text-sm text-muted">
                    {getDescription()}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 overflow-hidden"
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2 px-4 pt-12 pb-4">
              <AnimatePresence mode="wait">
                {step === 'initial' && (
                  <motion.div
                    key="initial"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2"
                  >
                    <button
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="w-full h-9 inline-flex items-center justify-center gap-2 text-sm text-muted bg-white/10 rounded-full transition-colors hover:text-foreground hover:bg-white/15 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Continue with Google'
                      )}
                    </button>
                    <button
                      onClick={() => setStep('email')}
                      disabled={isLoading}
                      className="w-full h-9 inline-flex items-center justify-center text-sm text-muted border border-border rounded-full transition-colors hover:text-foreground hover:border-foreground disabled:opacity-50"
                    >
                      Continue with Email
                    </button>
                  </motion.div>
                )}

                {step === 'email' && (
                  <motion.form
                    key="email"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleEmailSubmit}
                    className="flex flex-col gap-2"
                  >
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoFocus
                      disabled={isLoading}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isLoading}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted border border-white/20 rounded-full transition-colors hover:text-foreground hover:border-white/40 disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!email.trim() || isLoading}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted bg-white/10 rounded-full transition-colors hover:text-foreground hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleMagicLink}
                      disabled={!email.trim() || isLoading}
                      className="w-full h-9 inline-flex items-center justify-center text-sm text-muted-dark hover:text-muted transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Send magic link instead'
                      )}
                    </button>
                  </motion.form>
                )}

                {step === 'password' && (
                  <motion.form
                    key="password"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handlePasswordSubmit}
                    className="flex flex-col gap-2"
                  >
                    {mode === 'signup' && (
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name (optional)"
                        disabled={isLoading}
                      />
                    )}
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                      autoFocus
                      disabled={isLoading}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isLoading}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted border border-white/20 rounded-full transition-colors hover:text-foreground hover:border-white/40 disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!password.trim() || isLoading}
                        className="flex-1 h-9 inline-flex items-center justify-center gap-2 text-sm text-muted bg-white/10 rounded-full transition-colors hover:text-foreground hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : mode === 'login' ? (
                          'Log In'
                        ) : (
                          'Sign Up'
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}

                {step === 'magic-link-sent' && (
                  <motion.div
                    key="magic-link-sent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2"
                  >
                    <button
                      type="button"
                      onClick={handleBack}
                      className="w-full h-9 inline-flex items-center justify-center text-sm text-muted border border-white/20 rounded-full transition-colors hover:text-foreground hover:border-white/40"
                    >
                      Use a different email
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
