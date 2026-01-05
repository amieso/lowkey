'use client'

import { useState } from 'react'
import { X, ArrowUpRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Video, STYLE_LABELS, PRODUCT_TYPE_LABELS } from '@/types/video'

interface InfoPaneProps {
  video: Video
  onClose: () => void
}

// Mock data to fill in gaps
const mockCredits = [
  { role: 'Director', name: 'Adam Lisagor' },
  { role: 'Producer', name: 'Sarah Chen' },
  { role: 'DP', name: 'Marcus Wei' },
  { role: 'Editor', name: 'Jake Morrison' },
  { role: 'Motion Design', name: 'Elena Voss' },
  { role: 'Sound Design', name: 'David Park' },
]

const mockLinks = {
  website: { label: 'Website', url: 'https://example.com' },
  twitter: { label: 'Twitter', url: 'https://twitter.com/example' },
  youtube: { label: 'YouTube', url: 'https://youtube.com/watch?v=example' },
}

export function InfoPane({ video, onClose }: InfoPaneProps) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const year = new Date(video.publishedDate).getFullYear()

  // Use real data if available, otherwise mock
  const credits = video.credits.length > 0 ? video.credits : mockCredits
  const links = [
    { label: 'Website', url: video.websiteUrl || mockLinks.website.url },
    { label: 'Twitter', url: video.twitterUrl || mockLinks.twitter.url },
    { label: 'YouTube', url: video.youtubeUrl || mockLinks.youtube.url },
  ]

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  return (
    <aside className="shrink-0 w-[380px]">
      <div className="w-[380px] h-full bg-surface rounded-lg flex flex-col">
        {/* Close button */}
        <div className="flex justify-end p-4 pb-1.5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2.5">
              {video.company}
            </p>
            <h2 className="text-xl font-medium text-foreground leading-tight tracking-tight">
              {video.title}
            </h2>
          </div>

          {/* Summary - always visible, no accordion */}
          <div className="mb-6">
            <p className="text-sm text-muted leading-relaxed mb-4">
              {video.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 border border-white/[0.12] rounded-full text-muted">
                {year}
              </span>
              <span className="text-xs px-3 py-1 border border-white/[0.12] rounded-full text-muted">
                {STYLE_LABELS[video.style]}
              </span>
              <span className="text-xs px-3 py-1 border border-white/[0.12] rounded-full text-muted">
                {PRODUCT_TYPE_LABELS[video.productType]}
              </span>
            </div>
          </div>

          {/* Accordion sections */}
          <div className="-mx-[14px] flex flex-col gap-1.5">
            {/* Credits */}
            <div
              onClick={() => toggleSection('credits')}
              className="bg-white/5 rounded-lg py-4 px-4 cursor-pointer group"
            >
              <div className="w-full flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-widest ${openSection === 'credits' ? 'text-foreground' : 'text-muted'} group-hover:text-foreground transition-colors`}>
                  Credits
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted/50 transition-transform duration-200 ${openSection === 'credits' ? 'rotate-180' : ''}`} />
              </div>
              {openSection === 'credits' && (
                <div className="mt-4 -mx-4 -mb-4 bg-white/[0.03] rounded-b-lg px-4 py-3">
                  {credits.map((credit, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-muted">{credit.role}</span>
                      {'url' in credit && credit.url ? (
                        <Link
                          href={credit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:text-muted transition-colors"
                        >
                          {credit.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-foreground">{credit.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div
              onClick={() => toggleSection('links')}
              className="bg-white/5 rounded-lg py-4 px-4 cursor-pointer group"
            >
              <div className="w-full flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-widest ${openSection === 'links' ? 'text-foreground' : 'text-muted'} group-hover:text-foreground transition-colors`}>
                  Links
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted/50 transition-transform duration-200 ${openSection === 'links' ? 'rotate-180' : ''}`} />
              </div>
              {openSection === 'links' && (
                <div className="mt-4 -mx-4 -mb-4 bg-white/[0.03] rounded-b-lg px-4 py-3">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-muted">{link.label}</span>
                      <Link
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-foreground hover:text-muted transition-colors truncate max-w-[180px]"
                      >
                        <span className="truncate">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
