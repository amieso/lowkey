'use client'

import { useState } from 'react'
import { MorphText } from './ui/morph-text'

const ROTATING_WORDS = ['launch video', 'product demo', 'announcement']

export function HeroSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
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
          A curated collection of the best product launch videos.
          Get inspired by how top companies announce their products.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          {status === 'success' ? (
            <p className="text-sm text-green-400">Thanks for subscribing!</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-2 text-sm bg-surface border border-border rounded-full text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 w-56"
                required
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center px-4 py-2 text-sm text-muted bg-surface rounded-full transition-colors hover:text-foreground disabled:opacity-50"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
          <a
            href="mailto:submit@lowkey.so"
            className="inline-flex items-center justify-center px-4 py-[6px] text-sm text-muted border-2 border-surface rounded-full transition-colors hover:text-foreground/60 hover:border-foreground/60"
          >
            Submit Video
          </a>
        </div>
      </div>
    </section>
  )
}
