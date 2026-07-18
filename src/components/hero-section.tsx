'use client'

import { useState } from 'react'
import { ArrowIcon } from './ui/player-icons'
import { EmojiConfetti } from './ui/emoji-confetti'
import { trackGoal, GOALS } from '@/lib/analytics'
import { useIntroContext } from '@/context/intro-context'

export function HeroSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  // During the intro the hero sits half-dimmed under the supercut; once the
  // falling pieces have largely cleared it (introHeroReveal, mid-fall) it
  // eases to full opacity — it fades IN as it becomes visible instead of
  // just being uncovered at 100%.
  const { shouldShowIntro, introHeroReveal } = useIntroContext()
  const dimmed = shouldShowIntro && !introHeroReveal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMessage('Invalid email')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) throw new Error()

      setStatus('success')
      setEmail('')
      trackGoal(GOALS.newsletterSignup, { location: 'hero' })

      // Reset to idle after 4 seconds
      setTimeout(() => {
        setStatus('idle')
      }, 4000)
    } catch {
      setStatus('error')
      setErrorMessage('Email not supported')
    }
  }

  return (
    <section
      className="px-4 md:px-6 pt-[50px] pb-12 md:pt-[116px] md:pb-32"
      style={{ opacity: dimmed ? 0.5 : 1, transition: 'opacity 0.6s ease-out' }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-foreground leading-[1.1] tracking-tight">
          The rumors are true.
          <br />
          These are the best product launch videos.
        </h1>
        <p className="mt-4 text-base md:text-lg text-muted leading-relaxed max-w-xl mx-auto">
          Subscribe to get the latest launches delivered to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 md:mt-10 w-full md:w-auto flex justify-center">
          <div className="relative w-full md:w-auto">
            <div className="relative flex justify-center">
              <EmojiConfetti trigger={status === 'success'} />
              <div
              className={`relative h-10 rounded-full overflow-hidden bg-foreground/5 transition-all duration-300 ${
                status === 'success' ? 'w-[156px]' : 'w-full md:w-[346px]'
              }`}
            >
              <input
                type="email"
                placeholder="Enter your email"
                value={status === 'success' ? '' : email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === 'error') {
                    setStatus('idle')
                    setErrorMessage('')
                  }
                }}
                disabled={status === 'success'}
                className="w-full h-full px-4 bg-transparent rounded-full text-base text-foreground placeholder:text-muted-dark/50 placeholder:text-center text-center focus:outline-none"
                style={{
                  opacity: status === 'success' ? 0 : 1,
                  transition: 'opacity 150ms ease-out'
                }}
                required
              />

              {/* Success text - appears centered after shrink */}
              <span
                className="absolute inset-0 flex items-center justify-center text-sm text-foreground whitespace-nowrap pointer-events-none"
                style={{
                  opacity: status === 'success' ? 1 : 0,
                  transition: 'opacity 150ms ease-out 200ms'
                }}
              >
                You're subscribed!
              </span>

              {/* Submit button */}
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="absolute right-[4px] top-[4px] h-[32px] w-[32px] rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                style={{
                  opacity: email && status !== 'success' ? 1 : 0,
                  pointerEvents: email && status !== 'success' ? 'auto' : 'none',
                  transition: 'opacity 150ms ease-out'
                }}
              >
                {status === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <ArrowIcon className="w-4 h-4" />
                )}
              </button>
              </div>
            </div>
            {errorMessage && <span className="absolute top-full mt-4 left-0 right-0 text-sm text-red-400 text-center">{errorMessage}</span>}
          </div>
        </form>
      </div>
    </section>
  )
}
