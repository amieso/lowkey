'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Input } from '@/components/ui/input'

type AuthStep = 'initial' | 'email' | 'verify'

export function AuthModal() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login } = useAuth()
  const [step, setStep] = useState<AuthStep>('initial')
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>(authModalMode)
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Sync mode with context when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode)
      setStep('initial')
      setEmail('')
      setCode('')
      setCountdown(60)
      setCanResend(false)
    }
  }, [isAuthModalOpen, authModalMode])

  // Countdown timer for resend
  useEffect(() => {
    if (step === 'verify' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCanResend(true)
    }
  }, [step, countdown])

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

  const handleGoogleAuth = () => {
    login()
    closeAuthModal()
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setStep('verify')
      setCountdown(60)
      setCanResend(false)
    }
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length === 6) {
      login()
      closeAuthModal()
    }
  }

  const handleResendCode = () => {
    if (canResend) {
      setCountdown(60)
      setCanResend(false)
      setCode('')
    }
  }

  const handleBack = () => {
    if (step === 'verify') {
      setStep('email')
      setCode('')
    } else if (step === 'email') {
      setStep('initial')
      setEmail('')
    }
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
                {step !== 'verify' && (
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
                className={`w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors ${step === 'verify' ? 'ml-auto' : ''}`}
                aria-label="Close modal"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            {/* Title and copy */}
            <div className="px-[50px] mt-2.5 mb-2.5 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step === 'verify' ? 'verify' : mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 id="auth-modal-title" className="text-xl font-medium text-foreground mb-2">
                    {step === 'verify'
                      ? 'Check Your Email'
                      : mode === 'login'
                        ? 'Welcome Back'
                        : 'Join Lowkey'}
                  </h2>
                  <p className="text-sm text-muted">
                    {step === 'verify' ? (
                      <>
                        We sent a verification code to {email}.{' '}
                        {canResend ? (
                          <button
                            onClick={handleResendCode}
                            className="text-foreground hover:underline"
                          >
                            Resend code
                          </button>
                        ) : (
                          <>
                            Resend code in <span className="font-mono">{countdown}</span>s
                          </>
                        )}
                      </>
                    ) : mode === 'login' ? (
                      'Sign in to pick up where you left off and access the full library.'
                    ) : (
                      'Create a free account to unlock every video in the library.'
                    )}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

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
                      className="w-full h-9 inline-flex items-center justify-center text-sm text-muted bg-white/10 rounded-full transition-colors hover:text-foreground hover:bg-white/15"
                    >
                      Continue with Google
                    </button>
                    <button
                      onClick={() => setStep('email')}
                      className="w-full h-9 inline-flex items-center justify-center text-sm text-muted border border-border rounded-full transition-colors hover:text-foreground hover:border-foreground"
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
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted border border-white/20 rounded-full transition-colors hover:text-foreground hover:border-white/40"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!email.trim()}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted bg-white/10 rounded-full transition-colors hover:text-foreground hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {mode === 'login' ? 'Log In' : 'Sign Up'}
                      </button>
                    </div>
                  </motion.form>
                )}

                {step === 'verify' && (
                  <motion.form
                    key="verify"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCodeSubmit}
                    className="flex flex-col gap-2"
                  >
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setCode(val)
                      }}
                      placeholder="000-000"
                      autoFocus
                      className="text-center font-mono tracking-widest"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted border border-white/20 rounded-full transition-colors hover:text-foreground hover:border-white/40"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={code.length !== 6}
                        className="flex-1 h-9 inline-flex items-center justify-center text-sm text-muted bg-white/10 rounded-full transition-colors hover:text-foreground hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Verify
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
