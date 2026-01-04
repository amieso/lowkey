'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { VideoStyle } from '@/types/video'

const FILTER_OPTIONS: { value: VideoStyle; label: string }[] = [
  { value: 'kinetic-text', label: 'Kinetic' },
  { value: '3d', label: '3D' },
  { value: 'motion-graphics', label: 'Motion' },
  { value: 'product-demo', label: 'Demo' },
]

export function FilterDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentFilter = searchParams.get('style') || null
  const activeCount = currentFilter ? 1 : 0

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleFilterSelect = (value: VideoStyle | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) {
      params.delete('style')
    } else {
      params.set('style', value)
    }
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 text-sm transition-colors',
          activeCount > 0
            ? 'text-foreground'
            : 'text-muted hover:text-foreground'
        )}
      >
        <span>Filter{activeCount > 0 ? ` (${activeCount})` : ''}</span>
        <svg
          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-border bg-background p-1.5 shadow-lg">
          {/* Clear filter option */}
          <button
            onClick={() => handleFilterSelect(null)}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              !currentFilter
                ? 'bg-surface text-foreground'
                : 'text-muted hover:bg-surface hover:text-foreground'
            )}
          >
            All
          </button>

          {/* Filter options */}
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterSelect(option.value)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                currentFilter === option.value
                  ? 'bg-surface text-foreground'
                  : 'text-muted hover:bg-surface hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
