'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-medium text-foreground mb-1">
          Something went wrong
        </h1>
        <p className="text-sm text-muted mb-6">
          We encountered an error loading this page.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Go home
          </button>
          <Button onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
