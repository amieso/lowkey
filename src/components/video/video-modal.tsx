'use client'

import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoPlayer } from './video-player'
import { InfoPane } from './info-pane'

interface VideoModalProps {
  video: Video
  onClose: () => void
}

export function VideoModal({ video, onClose }: VideoModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [handleEscape])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        className="relative z-10 flex flex-col md:flex-row w-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Video panel (left) with softbox shadow */}
        <div className="relative shrink-0">
          {/* Softbox shadow - blurred version behind */}
          <div
            className="absolute inset-0 scale-[0.98] blur-3xl opacity-50 rounded-3xl bg-black -z-10"
            style={{ transform: 'translateY(20px) scale(0.95)' }}
          />
          <div className="w-[60vw] min-w-[500px] max-w-[1100px] aspect-video rounded-2xl overflow-hidden">
            <VideoPlayer
              src={video.videoUrl}
              poster={video.thumbnailUrl}
              aspectRatio={video.aspectRatio}
            />
          </div>
        </div>

        {/* Info panel (right) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="w-[320px] shrink-0 overflow-y-auto p-6 bg-surface rounded-2xl ml-2 border border-border shadow-sm"
        >
          <InfoPane video={video} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
