'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { MorphText } from './ui/morph-text'
import { EmojiConfetti } from './ui/emoji-confetti'

const ROTATING_WORDS = ['launch video', 'product demo', 'announcement']

export function HeroSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email')
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

      // Reset to idle after 4 seconds
      setTimeout(() => {
        setStatus('idle')
      }, 4000)
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Try again.')
    }
  }

  return (
    <section className="px-4 md:px-6 py-16 md:py-32">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[12px] font-mono text-muted uppercase tracking-widest mb-7">
          From the makers of Amie
        </p>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-foreground leading-[1.1] tracking-tight">
          <MorphText prefix="Find your next" words={ROTATING_WORDS} />
        </h1>
        <p className="mt-4 text-lg text-muted leading-relaxed max-w-xl mx-auto">
          A curated collection of the best product launch videos. Subscribe to get the latest launches delivered to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 flex justify-center mx-auto">
          <div className="flex flex-col gap-1">
            <div className="relative">
              <EmojiConfetti trigger={status === 'success'} />
              <div
                className="relative h-10 rounded-full overflow-hidden bg-foreground/5"
              style={{
                width: status === 'success' ? 156 : 288,
                transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
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
                className="w-full h-full px-4 bg-transparent rounded-full text-sm text-foreground placeholder:text-muted-dark/50 placeholder:text-center text-center focus:outline-none"
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
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
              </div>
            </div>
            {errorMessage && <span className="text-[11px] text-red-500 text-center px-2">{errorMessage}</span>}
          </div>
        </form>
      </div>
    </section>
  )
}
