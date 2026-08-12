'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ArrowIcon } from '@/components/ui/player-icons'
import { trackGoal, GOALS } from '@/lib/analytics'
import { hasSubscribed, markSubscribed } from '@/lib/subscription'

// Session-scoped dismissal: closing the pill hides it for the rest of the
// visit, not forever — unlike a successful signup, which hides it for good.
const DISMISSED_KEY = 'lowkey_player_capture_dismissed'

// Let people settle into watching before asking for anything. The title
// chrome fades in at ~0.15s; this arrives well after, as an afterthought.
const APPEAR_DELAY_MS = 2000
// How long the success message lingers before the pill fades away.
const SUCCESS_LINGER_MS = 2400

interface PlayerEmailCaptureProps {
  /** CSS top expression placing the pill just below the expanded video frame. */
  top: string
}

// Quiet email capture in the letterbox space below the expanded player —
// a liquid-glass pill matching the rest of the floating chrome.
export function PlayerEmailCapture({ top }: PlayerEmailCaptureProps) {
  // Decided once per open: already-subscribed browsers and this-session
  // dismissals never see the pill. Only rendered client-side (gated on the
  // mounted player), so storage is safe to read in the initializer.
  const [eligible] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return !hasSubscribed() && sessionStorage.getItem(DISMISSED_KEY) === null
    } catch {
      return true
    }
  })
  const [shown, setShown] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!eligible) return
    const id = window.setTimeout(() => setShown(true), APPEAR_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [eligible])

  // After a signup, show the confirmation briefly, then bow out.
  useEffect(() => {
    if (status !== 'success') return
    const id = window.setTimeout(() => setDone(true), SUCCESS_LINGER_MS)
    return () => window.clearTimeout(id)
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      markSubscribed()
      trackGoal(GOALS.newsletterSignup, { location: 'player' })
    } catch {
      setStatus('error')
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Still hidden for this render; it may reappear next video.
    }
  }

  const message =
    status === 'success'
      ? "You're in — new launches land in your inbox."
      : status === 'error'
        ? "That email didn't work — try another?"
        : 'Get new launches in your inbox'

  return (
    <AnimatePresence>
      {eligible && shown && !dismissed && !done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-0 right-0 z-[130] flex justify-center pointer-events-none px-4"
          style={{ top }}
        >
          <div className="group/capture flex items-center gap-1.5 pointer-events-auto">
            <LiquidGlass tint="rgba(0,0,0,0.35)">
              <form onSubmit={handleSubmit} className="flex h-9 items-center gap-3 pl-4 pr-[4px]">
                <span
                  className={`text-xs whitespace-nowrap transition-colors ${
                    status === 'error' ? 'text-red-300/90' : 'text-white/60'
                  }`}
                >
                  {message}
                </span>
                {/* Collapses away once subscribed so the pill shrinks around
                    the confirmation instead of jump-cutting. */}
                <div
                  className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${
                    status === 'success' ? 'w-0 opacity-0' : 'w-[258px] opacity-100'
                  }`}
                >
                  <span className="h-4 w-px shrink-0 bg-white/15" />
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (status === 'error') setStatus('idle')
                    }}
                    onKeyDown={(e) => {
                      // Keep keys inside the field: left/right would flip to
                      // the neighbouring video, Escape would close the modal.
                      // (First Escape just blurs; a second one still closes.)
                      e.stopPropagation()
                      if (e.key === 'Escape') e.currentTarget.blur()
                    }}
                    disabled={status === 'loading'}
                    className="h-full w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    aria-label="Subscribe"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity hover:opacity-90"
                    style={{
                      opacity: email ? 1 : 0,
                      pointerEvents: email ? 'auto' : 'none',
                      transition: 'opacity 150ms ease-out',
                    }}
                  >
                    {status === 'loading' ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    ) : (
                      <ArrowIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </form>
            </LiquidGlass>
            {status !== 'success' && (
              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="flex h-6 w-6 items-center justify-center rounded-full text-sm leading-none text-white/50 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover/capture:opacity-100 focus-visible:opacity-100"
              >
                ×
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
