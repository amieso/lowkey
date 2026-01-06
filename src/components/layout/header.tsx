'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LogOut, X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { STYLE_LABELS } from '@/types/video'

export function Header() {
  const { authState, user, profile, openAuthModal, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const searchParams = useSearchParams()

  // Get active filter from URL params (only style triggers breadcrumbs, not productType)
  const activeStyle = searchParams.get('style') as keyof typeof STYLE_LABELS | null
  const activeView = searchParams.get('view')

  // Determine filter label - only for style filters, not product type tabs
  const getFilterLabel = () => {
    if (activeStyle && STYLE_LABELS[activeStyle]) {
      return { label: STYLE_LABELS[activeStyle], type: 'Style' }
    }
    if (activeView === 'companies') {
      return { label: 'All', type: 'Companies' }
    }
    return null
  }

  const filterInfo = getFilterLabel()

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  // During loading, show authenticated UI to prevent flash for logged-in users
  const renderAuthSection = () => {
    if (authState === 'loading' || authState === 'authenticated') {
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
                <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center">
                  <span className="text-[10px] font-medium text-muted">{initials}</span>
                </div>
              )}
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-56 py-1 bg-surface border border-border rounded-xl shadow-lg">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted truncate">{user?.email}</p>
                  </div>

                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        signOut()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-muted hover:text-foreground hover:bg-white/5 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
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
          {/* Logo and filter context */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-kanit font-bold text-foreground">lowkey</span>
            </Link>
            {filterInfo && (
              <>
                <span className="text-muted">/</span>
                <span className="text-sm text-muted">{filterInfo.type}</span>
                <span className="text-muted">/</span>
                <span className="text-sm text-foreground">{filterInfo.label}</span>
                <Link
                  href="/"
                  className="ml-1 p-1 text-muted hover:text-foreground transition-colors"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Right side nav */}
          <nav className="flex items-center gap-4 md:gap-6 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            <Link
              href="/submit"
              className="text-sm text-foreground hover:text-foreground/80 transition-colors"
            >
              Submit
            </Link>
            {renderAuthSection()}
          </nav>
        </div>
      </div>
    </header>
  )
}
