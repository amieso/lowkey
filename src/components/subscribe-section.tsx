'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SubscribeSection() {
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

    // Simulate API call (replace with real API in Phase B)
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('Subscribe:', email)
    setStatus('success')
    setEmail('')
  }

  return (
    <section className="py-12 border-t border-border">
      <div className="text-center">
        <h2 className="text-base font-medium text-foreground">
          Get the best launch videos weekly
        </h2>
        <p className="mt-1 text-sm text-muted">
          Curated inspiration delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className="mt-4">
            <p className="text-sm text-foreground">You're in. Check your inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2 max-w-xs mx-auto">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status === 'error') {
                  setStatus('idle')
                  setErrorMessage('')
                }
              }}
              error={status === 'error' ? errorMessage : undefined}
              className="flex-1"
            />
            <Button type="submit" size="sm" loading={status === 'loading'}>
              Subscribe
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
