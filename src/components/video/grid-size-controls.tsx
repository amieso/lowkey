'use client'

import { cn } from '@/lib/utils'

interface GridSizeControlsProps {
  onIncrease: () => void
  onDecrease: () => void
  canIncrease: boolean
  canDecrease: boolean
}

export function GridSizeControls({
  onIncrease,
  onDecrease,
  canIncrease,
  canDecrease,
}: GridSizeControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onIncrease}
        disabled={!canIncrease}
        aria-label="Smaller items (more columns)"
        className={cn(
          'flex h-9 w-9 items-center justify-center transition-colors bg-surface rounded-full stroke-muted',
          canIncrease
            ? 'hover:stroke-foreground'
            : 'stroke-muted/30 cursor-not-allowed'
        )}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="stroke-inherit" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="7" x2="11" y2="7" />
        </svg>
      </button>
      <button
        onClick={onDecrease}
        disabled={!canDecrease}
        aria-label="Larger items (fewer columns)"
        className={cn(
          'flex h-9 w-9 items-center justify-center transition-colors bg-surface rounded-full stroke-muted',
          canDecrease
            ? 'hover:stroke-foreground'
            : 'stroke-muted/30 cursor-not-allowed'
        )}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="stroke-inherit" strokeWidth="2" strokeLinecap="round">
          <line x1="7" y1="3" x2="7" y2="11" />
          <line x1="3" y1="7" x2="11" y2="7" />
        </svg>
      </button>
    </div>
  )
}
