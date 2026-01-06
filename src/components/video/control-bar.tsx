'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { GridSizeControls } from './grid-size-controls'
import { ProductType, PRODUCT_TYPE_LABELS } from '@/types/video'
import { cn } from '@/lib/utils'

const PRODUCT_TABS: { label: string; value: ProductType | null }[] = [
  { label: 'All', value: null },
  { label: 'SaaS', value: 'saas' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Fintech', value: 'fintech' },
  { label: 'E-commerce', value: 'ecommerce' },
  { label: 'Dev Tools', value: 'dev-tools' },
  { label: 'AI', value: 'ai' },
]

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
  const router = useRouter()
  const pathname = usePathname()
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const hasActiveFilter = searchParams.get('style') !== null
  const urlProductType = searchParams.get('productType') as ProductType | null

  // Local state for instant UI feedback
  const [localProductType, setLocalProductType] = useState<ProductType | null>(urlProductType)

  // Sync local state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalProductType(urlProductType)
  }, [urlProductType])

  // Use local state for UI, URL state for data
  const currentProductType = localProductType

  // Focus input when search expands
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchExpanded])

  // Keep search expanded if there's a query
  useEffect(() => {
    if (searchQuery) {
      setIsSearchExpanded(true)
    }
  }, [searchQuery])

  const getTabHref = (productType: ProductType | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (productType) {
      params.set('productType', productType)
    } else {
      params.delete('productType')
    }
    const queryString = params.toString()
    return queryString ? `${pathname}?${queryString}` : pathname
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left: Filter Toggle + Search + Divider + Product Tabs */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Filter Toggle */}
        <button
          onClick={onFilterToggle}
          className={cn(
            'flex items-center gap-1.5 h-9 px-4 text-sm transition-colors rounded-full border shrink-0',
            isFilterOpen || hasActiveFilter
              ? 'text-foreground border-foreground/60'
              : 'text-muted border-border hover:text-foreground hover:border-foreground/40'
          )}
        >
          <span>Filters</span>
          {hasActiveFilter && !isFilterOpen && (
            <span className="text-xs text-muted">(1)</span>
          )}
        </button>

        {/* Search - Expandable with animation */}
        <div
          ref={searchContainerRef}
          className={cn(
            'relative shrink-0 h-9 rounded-full border border-border transition-all duration-200 ease-out',
            isSearchExpanded
              ? 'w-48 sm:w-64 bg-surface'
              : 'w-9 hover:border-foreground/40'
          )}
        >
          {/* Search icon - always visible */}
          <div
            onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
            className={cn(
              'absolute -left-px -top-px w-9 h-9 z-10 flex items-center justify-center transition-colors',
              isSearchExpanded ? 'text-muted-dark/50' : 'text-muted hover:text-foreground/60 cursor-pointer'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input and close button */}
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'absolute inset-0 w-full h-full pl-10 pr-9 text-sm bg-transparent text-foreground placeholder:text-muted-dark/50 focus:outline-none transition-opacity duration-200',
              isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            tabIndex={isSearchExpanded ? 0 : -1}
          />
          {isSearchExpanded && (
            <button
              onClick={() => {
                onSearchChange('')
                setIsSearchExpanded(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border shrink-0 mx-[10px]" />

        {/* Product Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {PRODUCT_TABS.map((tab) => {
            const isActive = currentProductType === tab.value
            return (
              <button
                key={tab.label}
                onClick={() => {
                  setLocalProductType(tab.value) // Instant UI update
                  router.push(getTabHref(tab.value), { scroll: false })
                }}
                className={cn(
                  'shrink-0 h-9 px-4 inline-flex items-center rounded-full text-sm font-medium border cursor-pointer',
                  isActive
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted border-border hover:text-foreground hover:border-foreground/40'
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Grid Size Controls (hidden below lg) */}
      <div className="hidden lg:block shrink-0">
        <GridSizeControls
          onIncrease={onGridIncrease}
          onDecrease={onGridDecrease}
          canIncrease={canGridIncrease}
          canDecrease={canGridDecrease}
        />
      </div>
    </div>
  )
}
