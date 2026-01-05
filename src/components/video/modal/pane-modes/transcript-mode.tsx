'use client'

import { useEffect, useRef, useMemo } from 'react'
import { Video } from '@/types/video'
import { getTranscriptForVideo } from '@/data/transcripts'

interface TranscriptModeProps {
  video: Video
  currentTime: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function TranscriptMode({ video, currentTime }: TranscriptModeProps) {
  const transcript = getTranscriptForVideo(video.id)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeEntryRef = useRef<HTMLDivElement>(null)

  const activeEntry = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (currentTime >= transcript[i].startTime) {
        return transcript[i]
      }
    }
    return transcript[0]
  }, [transcript, currentTime])

  // Auto-scroll to active entry
  useEffect(() => {
    if (activeEntryRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const entry = activeEntryRef.current
      const containerRect = container.getBoundingClientRect()
      const entryRect = entry.getBoundingClientRect()

      const isVisible =
        entryRect.top >= containerRect.top &&
        entryRect.bottom <= containerRect.bottom

      if (!isVisible) {
        entry.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeEntry?.id])

  if (transcript.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted">
        <p className="text-sm">No transcript available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2.5">
          {video.company}
        </p>
        <h2 className="text-xl font-medium text-foreground leading-tight tracking-tight">
          Transcript
        </h2>
      </div>

      {/* Transcript list */}
      <div
        ref={scrollContainerRef}
        className="flex flex-col gap-1 -mx-2"
      >
        {transcript.map((entry) => {
          const isActive = activeEntry?.id === entry.id
          return (
            <div
              key={entry.id}
              ref={isActive ? activeEntryRef : undefined}
              className={`flex gap-3 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <span className={`text-xs font-mono shrink-0 pt-0.5 ${
                isActive ? 'text-foreground' : 'text-muted/60'
              }`}>
                {formatTime(entry.startTime)}
              </span>
              <p className={`text-sm leading-relaxed ${
                isActive ? 'text-foreground' : 'text-muted'
              }`}>
                {entry.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
