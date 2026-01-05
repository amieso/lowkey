'use client'

import { Lock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export function LockedOverlay() {
  const { openAuthModal } = useAuth()

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* SVG gradient overlay - more stable rendering than CSS gradients */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="locked-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0" />
            <stop offset="40%" stopColor="#0a0a0a" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#0a0a0a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#locked-gradient)" />
      </svg>

      {/* CTA content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
        <div className="flex flex-col items-center text-center mt-8">
          <Lock className="w-6 h-6 text-muted mb-8" strokeWidth={1.5} />

          <h2 className="text-2xl md:text-[28px] font-medium text-foreground mb-3 tracking-tight">
            Access all videos
          </h2>

          <p className="text-sm text-muted mb-8 max-w-sm leading-relaxed">
            Get unlimited access to the full library of product launch videos and pro features.
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => openAuthModal('signup')}
              className="inline-flex items-center justify-center px-4 py-2 text-sm text-muted bg-surface rounded-full transition-colors hover:text-foreground"
            >
              Join Lowkey
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center justify-center px-4 py-[6px] text-sm text-muted border-2 border-surface rounded-full transition-colors hover:text-foreground/60 hover:border-foreground/60"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
