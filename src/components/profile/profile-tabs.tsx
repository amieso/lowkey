'use client'

interface ProfileTabsProps {
  activeTab: 'collections' | 'saved'
  onTabChange: (tab: 'collections' | 'saved') => void
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-surface rounded-full w-fit mb-8">
      <button
        onClick={() => onTabChange('saved')}
        className={`px-4 py-2 text-sm rounded-full transition-colors ${
          activeTab === 'saved'
            ? 'bg-white/10 text-foreground'
            : 'text-muted hover:text-foreground'
        }`}
      >
        Saved
      </button>
      <button
        onClick={() => onTabChange('collections')}
        className={`px-4 py-2 text-sm rounded-full transition-colors ${
          activeTab === 'collections'
            ? 'bg-white/10 text-foreground'
            : 'text-muted hover:text-foreground'
        }`}
      >
        Collections
      </button>
    </div>
  )
}
