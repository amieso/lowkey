'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { ArrowIcon } from '@/components/ui/player-icons'
import { unslugifyCompany } from '@/lib/utils'

interface RequestCompanyProps {
  slug: string
}

export function RequestCompany({ slug }: RequestCompanyProps) {
  const companyName = unslugifyCompany(slug)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

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
        body: JSON.stringify({ email, requestedCompany: slug }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
      setErrorMessage('Email not supported')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 md:px-6 py-8">
        <div className="flex flex-col items-center text-center pt-16 md:pt-28">
          <p className="text-sm font-mono text-muted uppercase tracking-widest mb-5">
            Not in the collection yet
          </p>
          <h1 className="text-2xl md:text-3xl font-medium text-foreground leading-[1.1] tracking-tight max-w-xl">
            We don&apos;t have launch videos for {companyName} yet
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted leading-relaxed max-w-md">
            Want us to add them? Drop your email and we&apos;ll let you know the moment {companyName} lands on Lowkey.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 w-full md:w-auto flex justify-center">
            <div className="relative w-full md:w-auto">
              <div
                className={`relative h-10 rounded-full overflow-hidden bg-foreground/5 transition-all duration-300 ${
                  status === 'success' ? 'w-[156px]' : 'w-full md:w-[288px]'
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
                    transition: 'opacity 150ms ease-out',
                  }}
                  required
                />

                <span
                  className="absolute inset-0 flex items-center justify-center text-sm text-foreground whitespace-nowrap pointer-events-none"
                  style={{
                    opacity: status === 'success' ? 1 : 0,
                    transition: 'opacity 150ms ease-out 200ms',
                  }}
                >
                  Request sent!
                </span>

                <button
                  type="submit"
                  disabled={status === 'loading' || status === 'success'}
                  className="absolute right-[4px] top-[4px] h-[32px] w-[32px] rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                  style={{
                    opacity: email && status !== 'success' ? 1 : 0,
                    pointerEvents: email && status !== 'success' ? 'auto' : 'none',
                    transition: 'opacity 150ms ease-out',
                  }}
                >
                  {status === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <ArrowIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errorMessage && (
                <span className="absolute top-full mt-4 left-0 right-0 text-sm text-red-400 text-center">
                  {errorMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
