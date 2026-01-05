'use client'

import { useState } from 'react'
import { X, Info, LayoutList } from 'lucide-react'
import { Video } from '@/types/video'
import { InfoMode, BreakdownMode } from './pane-modes'

type PaneMode = 'info' | 'breakdown'

interface InfoPaneProps {
  video: Video
  currentTime: number
  onClose: () => void
  onSeek?: (time: number) => void
}

interface ModeIconProps {
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
  label: string
}

function ModeIcon({ icon: Icon, active, onClick, label }: ModeIconProps) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
        active
          ? 'text-white'
          : 'text-white/40 hover:text-white/70'
      }`}
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

export function InfoPane({ video, currentTime, onClose, onSeek }: InfoPaneProps) {
  const [mode, setMode] = useState<PaneMode>('info')

  return (
    <aside className="shrink-0 w-[380px]">
      <div className="relative w-[380px] h-[calc(min(1344px,calc(100vw-400px))*9/16)] bg-surface rounded-lg flex flex-col">
        {/* Close button */}
        <div className="shrink-0 flex justify-end p-4 pb-1.5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Content area - fills available space */}
        <div className="flex-1 min-h-0 px-6">
          {mode === 'info' && (
            <div className="h-full overflow-y-auto scrollbar-hide -mx-[14px] px-[14px] pb-20">
              <InfoMode video={video} />
            </div>
          )}
          {mode === 'breakdown' && (
            <div
              className="h-full -mx-6 px-6"
              style={{
                maskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 208px), rgba(0,0,0,0.95) calc(100% - 190px), rgba(0,0,0,0.85) calc(100% - 170px), rgba(0,0,0,0.7) calc(100% - 150px), rgba(0,0,0,0.5) calc(100% - 130px), rgba(0,0,0,0.3) calc(100% - 110px), rgba(0,0,0,0.15) calc(100% - 90px), rgba(0,0,0,0.05) calc(100% - 75px), transparent calc(100% - 60px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 208px), rgba(0,0,0,0.95) calc(100% - 190px), rgba(0,0,0,0.85) calc(100% - 170px), rgba(0,0,0,0.7) calc(100% - 150px), rgba(0,0,0,0.5) calc(100% - 130px), rgba(0,0,0,0.3) calc(100% - 110px), rgba(0,0,0,0.15) calc(100% - 90px), rgba(0,0,0,0.05) calc(100% - 75px), transparent calc(100% - 60px), transparent 100%)',
              }}
            >
              <BreakdownMode video={video} currentTime={currentTime} onSeek={onSeek} />
            </div>
          )}
        </div>


        {/* Mode toggle - at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-[12] h-[72px] flex items-center justify-center gap-4">
          <ModeIcon
            icon={Info}
            active={mode === 'info'}
            onClick={() => setMode('info')}
            label="Info"
          />
          <ModeIcon
            icon={LayoutList}
            active={mode === 'breakdown'}
            onClick={() => setMode('breakdown')}
            label="Breakdown"
          />
        </div>
      </div>
    </aside>
  )
}
