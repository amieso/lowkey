'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export function Header() {
  const { authState, user, profile, openAuthModal, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  // Server provides initialAuthState, so we trust it immediately
  // Only show skeleton during true 'loading' state (not on initial render)
  const renderAuthSection = () => {
    if (authState === 'loading') {
      // Render a neutral skeleton placeholder during auth check
      return <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
    }

    if (authState === 'authenticated') {
      return (
        <>
          <Link
            href="/saved"
            className="text-sm text-foreground hover:text-foreground/80 transition-colors"
          >
            Saved
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center hover:opacity-80 transition-opacity"
              aria-label="Open user menu"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-border"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: profile?.avatar_color || '#A78BFA' }}
                >
                  <span className="text-[10px] font-medium text-white">{initials}</span>
                </div>
              )}
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-lg bg-neutral-900/95 backdrop-blur-sm p-1 shadow-lg">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{displayName}</p>
                    <p className="text-xs font-mono text-white/60 truncate">{user?.email}</p>
                  </div>

                  <div className="my-1 h-px bg-white/10" />

                  <button
                    onClick={async () => {
                      setShowUserMenu(false)
                      await signOut()
                    }}
                    className="w-full mt-1 rounded px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )
    }

    // unauthenticated
    return (
      <>
        <Link
          href="/about"
          className="text-sm text-foreground hover:text-foreground/80 transition-colors"
        >
          About
        </Link>
        <button
          onClick={() => openAuthModal('login')}
          className="text-sm text-foreground hover:text-foreground/80 transition-colors"
        >
          Login
        </button>
      </>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full pb-2">
      {/* Progressive blur layers */}
      <div className="absolute inset-0 backdrop-blur-[16px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_25%)]" />
      <div className="absolute inset-0 backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,black_10%,transparent_40%)]" />
      <div className="absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,black_20%,transparent_55%)]" />
      <div className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,black_35%,transparent_70%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black_50%,transparent_85%)]" />
      <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-transparent" />
      <div className="relative px-4 md:px-6">
        <div className="flex h-12 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-lg font-kanit font-bold text-foreground">lowkey</span>
          </Link>

          {/* Right side nav */}
          <nav className="flex items-center gap-4 md:gap-6 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            <a
              href="mailto:submit@lowkey.so"
              className="text-sm text-foreground hover:text-foreground/80 transition-colors"
            >
              Submit
            </a>
            {renderAuthSection()}
          </nav>
        </div>
      </div>
    </header>
  )
}
