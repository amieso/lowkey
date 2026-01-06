'use client'

import { useState } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { collectionService } from '@/services'

interface SaveButtonProps {
  videoSlug: string
  className?: string
  size?: 'sm' | 'md'
}

export function SaveButton({ videoSlug, className = '', size = 'md' }: SaveButtonProps) {
  const { user, authState, openAuthModal, savedVideoSlugs, addSavedVideo, removeSavedVideo } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const isSaved = savedVideoSlugs.includes(videoSlug)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (authState !== 'authenticated') {
      openAuthModal('signup')
      return
    }

    if (!user?.id) return

    // Optimistic update
    if (isSaved) {
      removeSavedVideo(videoSlug)
    } else {
      addSavedVideo(videoSlug)
    }

    setIsLoading(true)
    try {
      if (isSaved) {
        await collectionService.quickUnsave(user.id, videoSlug)
      } else {
        await collectionService.quickSave(user.id, videoSlug)
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      // Revert on error
      if (isSaved) {
        addSavedVideo(videoSlug)
      } else {
        removeSavedVideo(videoSlug)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  return (
    <button
      onClick={handleClick}
      className={`text-white/80 hover:text-white transition-colors ${className}`}
      aria-label={isSaved ? 'Remove from saved' : 'Save video'}
    >
      {isLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isSaved ? (
        <Check className={iconSize} />
      ) : (
        <Plus className={iconSize} />
      )}
    </button>
  )
}
