'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings, ExternalLink } from 'lucide-react'
import type { Profile } from '@/types/database'
import type { AuthUser } from '@/services/auth-service'

interface ProfileHeaderProps {
  profile: Profile | null
  user: AuthUser
}

export function ProfileHeader({ profile, user }: ProfileHeaderProps) {
  const [imageError, setImageError] = useState(false)

  const displayName = profile?.name || user.email.split('@')[0]
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
      {/* Avatar */}
      <div className="relative">
        {profile?.avatar_url && !imageError ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="w-24 h-24 rounded-full object-cover border-2 border-border"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-surface border-2 border-border flex items-center justify-center">
            <span className="text-2xl font-medium text-muted">{initials}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
          {profile?.username && (
            <span className="text-muted">@{profile.username}</span>
          )}
        </div>

        {profile?.bio && (
          <p className="text-muted mb-2 max-w-md">{profile.bio}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-dark">
          {profile?.website_url && (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {new URL(profile.website_url).hostname}
            </a>
          )}
          {profile?.twitter_handle && (
            <a
              href={`https://twitter.com/${profile.twitter_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted transition-colors"
            >
              @{profile.twitter_handle}
            </a>
          )}
          <span>
            Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <Link
        href="/profile/settings"
        className="flex items-center gap-2 px-4 h-9 text-sm text-muted bg-surface border border-border rounded-full hover:text-foreground hover:border-foreground/50 transition-colors"
      >
        <Settings className="w-4 h-4" />
        Edit Profile
      </Link>
    </div>
  )
}
