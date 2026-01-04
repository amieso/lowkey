'use client'

import { useSearchParams } from 'next/navigation'
import { GridSizeControls } from './grid-size-controls'
import { cn } from '@/lib/utils'

interface ControlBarProps {
  onGridIncrease: () => void
  onGridDecrease: () => void
  canGridIncrease: boolean
  canGridDecrease: boolean
  isFilterOpen: boolean
  onFilterToggle: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function ControlBar({
  onGridIncrease,
  onGridDecrease,
  canGridIncrease,
  canGridDecrease,
  isFilterOpen,
  onFilterToggle,
  searchQuery,
  onSearchChange,
}: ControlBarProps) {
  const searchParams = useSearchParams()
  const hasActiveFilter = searchParams.get('style') !== null

  return (
    <div className="flex items-center justify-between">
      {/* Left: Filter Toggle + Search */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFilterToggle}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors rounded-full border-2 w-[116px] justify-center',
            isFilterOpen || hasActiveFilter
              ? 'text-foreground/60 border-foreground/60'
              : 'text-muted border-surface hover:text-foreground/60 hover:border-foreground/60'
          )}
        >
          <span>{isFilterOpen ? 'Hide Filters' : 'Show Filters'}</span>
          {hasActiveFilter && !isFilterOpen && (
            <span className="text-xs text-muted">(1)</span>
          )}
        </button>

        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 py-1.5 text-sm bg-surface text-foreground placeholder:text-muted-dark/50 rounded-full border-2 border-surface transition-colors w-80 focus:outline-none focus:ring-0 focus:border-surface"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Right: Grid Size Controls */}
      <GridSizeControls
        onIncrease={onGridIncrease}
        onDecrease={onGridDecrease}
        canIncrease={canGridIncrease}
        canDecrease={canGridDecrease}
      />
    </div>
  )
}
