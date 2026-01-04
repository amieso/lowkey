'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { VideoStyle } from '@/types/video'
import { videos } from '@/data/videos'

const FILTER_OPTIONS: { value: VideoStyle; label: string }[] = [
  { value: 'kinetic-text', label: 'Kinetic' },
  { value: '3d', label: '3D' },
  { value: 'motion-graphics', label: 'Motion' },
  { value: 'product-demo', label: 'Demo' },
]

function getVideoCountByStyle(style: VideoStyle): number {
  return videos.filter((v) => v.style === style).length
}

interface FilterSidebarProps {
  isOpen: boolean
}

export function FilterSidebar({ isOpen }: FilterSidebarProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentFilter = searchParams.get('style') || null

  const handleFilterSelect = (value: VideoStyle | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) {
      params.delete('style')
    } else {
      params.set('style', value)
    }
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  return (
    <aside
      className={cn(
        'shrink-0 pr-6 overflow-hidden transition-all duration-300 ease-out',
        isOpen ? 'w-40 opacity-100' : 'w-0 pr-0 opacity-0'
      )}
    >
      <div>
        {/* Type Section */}
        <div>
          <h3 className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3">Type</h3>
          <div className="space-y-1.5">
            {/* All option */}
            <button
              onClick={() => handleFilterSelect(null)}
              className={cn(
                'flex items-center w-full text-left text-sm py-1 transition-colors',
                !currentFilter
                  ? 'text-foreground'
                  : 'text-muted hover:text-foreground'
              )}
            >
              <span>All</span>
              <span className="font-mono text-xs ml-2.5">[{videos.length}]</span>
            </button>

            {/* Filter options */}
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterSelect(option.value)}
                className={cn(
                  'flex items-center w-full text-left text-sm py-1 transition-colors',
                  currentFilter === option.value
                    ? 'text-foreground'
                    : 'text-muted hover:text-foreground'
                )}
              >
                <span>{option.label}</span>
                <span className="font-mono text-xs ml-2.5">[{getVideoCountByStyle(option.value)}]</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
