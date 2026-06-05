'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Footer } from '@/components/layout/footer'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardSkeleton } from '@/components/video/video-card-skeleton'
import { AnimatedLogo } from '@/components/ui/animated-logo'
import { MorphText } from '@/components/ui/morph-text'
import { EmojiConfetti } from '@/components/ui/emoji-confetti'
import { Button } from '@/components/ui/button'
import { CompanyLink } from '@/components/ui/company-link'
import { IntroLogo } from '@/components/intro/intro-logo'
import {
  PlayIcon,
  PauseIcon,
  ExpandIcon,
  MinimizeIcon,
  SoundFullIcon,
  SoundMidIcon,
  SoundOffIcon,
  SkipForwardIcon,
  SkipBackwardIcon,
} from '@/components/ui/player-icons'
import { Video } from '@/types/video'
import { IntroProvider } from '@/context/intro-context'

const sampleVideo: Video = {
  id: '1',
  slug: 'lovable',
  companySlug: 'lovable',
  title: 'Lovable Launch',
  company: 'Lovable',
  description: 'Lovable transforms how we build software.',
  videoUrl: 'https://stream.mux.com/9pi2UtJeVRmop8DoZN81ufk58ih3vgmP7Znfbb7LeuA.m3u8',
  thumbnailUrl: 'https://image.mux.com/9pi2UtJeVRmop8DoZN81ufk58ih3vgmP7Znfbb7LeuA/thumbnail.webp?time=5',
  style: 'kinetic-text',
  duration: 92,
  aspectRatio: '16:9',
  productType: 'ai',
  purpose: 'launch',
  industry: 'ai-ml',
  companyStage: 'seed',
  websiteUrl: 'https://lovable.dev',
  credits: [],
  featured: true,
  publishedDate: '2024-12-01',
}

const ghostVideo: Video = {
  id: '99',
  slug: 'coming-soon',
  companySlug: 'tbd',
  title: 'Coming Soon',
  company: 'TBD',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
  style: 'kinetic-text',
  duration: 0,
  aspectRatio: '16:9',
  productType: 'saas',
  purpose: 'launch',
  industry: 'productivity',
  companyStage: 'seed',
  credits: [],
  featured: false,
  publishedDate: '',
}

export default function ComponentsPage() {
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [email, setEmail] = useState('')

  const handleVideoSelect = (video: Video) => {
    setExpandedVideoId(video.id)
  }

  const handleModalClose = () => {
    setExpandedVideoId(null)
  }

  return (
    <IntroProvider>
      <div className="min-h-screen bg-background text-foreground">

        {/* Hero */}
        <header className="min-h-[50vh] flex flex-col justify-end px-8 md:px-16 lg:px-24 pb-16">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-6">
            Components
          </h1>
          <p className="text-xl md:text-2xl text-muted max-w-2xl leading-relaxed">
            Interface elements used across Lowkey.
          </p>
        </header>

        {/* Logo */}
        <section className="border-t border-border">
          {/* Hero display */}
          <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
            {/* Center content */}
            <div className="text-center px-8">
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-8">Logomark</p>
              <div className="flex items-center justify-center gap-3 mb-8">
                <AnimatedLogo isHovered={true} />
                <span className="text-5xl md:text-6xl font-kanit font-bold tracking-tight">lowkey</span>
              </div>
              <p className="text-lg text-muted max-w-md mx-auto">
                The eye represents curated perspective. It looks around and blinks to create a sense of awareness.
              </p>
            </div>
          </div>

          {/* Variants row */}
          <div className="border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Header variant */}
              <div className="px-8 md:px-12 py-12 flex flex-col items-center text-center">
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Header</p>
                <div className="flex items-center gap-2 mb-4">
                  <AnimatedLogo isHovered={true} />
                </div>
                <p className="text-xs text-muted">Icon + wordmark lockup</p>
              </div>

              {/* Intro variant */}
              <div className="px-8 md:px-12 py-12 flex flex-col items-center text-center">
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Intro</p>
                <div className="mb-4">
                  <IntroLogo size={44} loop={true} />
                </div>
                <p className="text-xs text-muted">Stroke trace animation</p>
              </div>

              {/* Static variant */}
              <div className="px-8 md:px-12 py-12 flex flex-col items-center text-center">
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Static</p>
                <div className="mb-4">
                  <svg width="44" height="44" viewBox="0 0 16 16" fill="none" className="text-foreground">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M8 4C10.0517 4 11.8618 4.52179 13.127 5.3125C14.4061 6.11201 15 7.08851 15 8C15 8.91149 14.4061 9.88799 13.127 10.6875C11.8618 11.4782 10.0517 12 8 12C5.9483 12 4.13819 11.4782 2.87305 10.6875C1.59387 9.88799 1 8.91149 1 8C1 7.08851 1.59387 6.11201 2.87305 5.3125C4.13819 4.52179 5.9483 4 8 4Z" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <p className="text-xs text-muted">Favicon &amp; small contexts</p>
              </div>
            </div>
          </div>
        </section>

        {/* Fonts */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Fonts</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Three typefaces for distinct purposes. Inter for UI, Kanit for brand, JetBrains Mono for technical.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <div className="space-y-16">
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Inter</p>
                  <p className="text-2xl font-sans">The quick brown fox jumps over the lazy dog</p>
                  <p className="text-sm text-muted mt-2">Body text, headings, UI elements</p>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Kanit</p>
                  <p className="text-2xl font-kanit font-bold">lowkey</p>
                  <p className="text-sm text-muted mt-2">Wordmark only, 700 weight</p>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">JetBrains Mono</p>
                  <p className="text-lg font-mono">FEATURED · 1:32 · DEC 2024</p>
                  <p className="text-sm text-muted mt-2">Captions, labels, technical text</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Typography</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Type hierarchy establishes visual rhythm. Monospace for technical elements, medium weight headings for clarity.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <div className="space-y-16">
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Eyebrow</p>
                  <p className="text-xs font-mono uppercase tracking-widest">Featured Videos</p>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Heading</p>
                  <p className="text-4xl font-medium tracking-tight">Find your next launch video</p>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Body</p>
                  <p className="text-lg text-muted">Curated launch videos from the best product teams.</p>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Caption</p>
                  <p className="text-xs font-mono text-muted">1:32 · Lovable · Dec 2024</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Colors</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Minimal palette keeps focus on video content. Dark background with subtle elevation.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="aspect-video rounded-xl bg-background border border-border mb-4" />
                  <p className="text-sm mb-1">Background</p>
                  <p className="text-xs font-mono text-muted">var(--background)</p>
                </div>
                <div>
                  <div className="aspect-video rounded-xl bg-surface mb-4" />
                  <p className="text-sm mb-1">Surface</p>
                  <p className="text-xs font-mono text-muted">var(--surface)</p>
                </div>
                <div>
                  <div className="aspect-video rounded-xl bg-foreground mb-4" />
                  <p className="text-sm mb-1">Foreground</p>
                  <p className="text-xs font-mono text-muted">var(--foreground)</p>
                </div>
                <div>
                  <div className="aspect-video rounded-xl bg-muted mb-4" />
                  <p className="text-sm mb-1">Muted</p>
                  <p className="text-xs font-mono text-muted">var(--muted)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Buttons</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Pill-shaped with consistent height. Primary inverts colors for emphasis, secondary uses border.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <div className="space-y-16">
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Primary</p>
                  <div className="flex flex-wrap gap-4">
                    <Button size="sm">Back to home</Button>
                    <Button>Try again</Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Loading</p>
                  <Button size="sm" loading>Subscribe</Button>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Secondary</p>
                  <a
                    href="#"
                    className="h-8 px-4 text-sm rounded-full bg-transparent text-foreground border border-border hover:bg-surface inline-flex items-center justify-center font-medium transition-all"
                  >
                    Visit
                  </a>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Icon</p>
                  <button className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscribe Input */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Input</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Morphs between states. Width animates from 288px to 156px on success.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <div className="space-y-16">
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Default</p>
                  <div className="relative h-10 w-72 rounded-full overflow-hidden bg-foreground/5">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-full px-4 bg-transparent rounded-full text-sm text-foreground placeholder:text-muted/50 placeholder:text-center text-center focus:outline-none"
                    />
                    <button
                      className="absolute right-[4px] top-[4px] h-[32px] w-[32px] rounded-full bg-foreground text-background flex items-center justify-center"
                      style={{ opacity: email ? 1 : 0, transition: 'opacity 150ms ease-out' }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-6">Success</p>
                  <div className="h-10 rounded-full bg-foreground/5 flex items-center justify-center" style={{ width: 156 }}>
                    <span className="text-sm">You're subscribed!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Confetti */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Confetti</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Celebrates subscription. Spring physics on X-axis, keyframed Y for natural arc.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32 flex items-center">
              <div className="relative">
                <button
                  onClick={() => {
                    setConfettiTrigger(true)
                    setTimeout(() => setConfettiTrigger(false), 3500)
                  }}
                  className="h-10 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Trigger
                </button>
                <EmojiConfetti trigger={confettiTrigger} />
              </div>
            </div>
          </div>
        </section>

        {/* Morph Text */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Morph Text</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Rotating words with spring physics. Characters animate individually.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32 flex items-center">
              <div className="text-3xl md:text-4xl font-medium tracking-tight">
                <MorphText prefix="Find your next" words={['launch video', 'product demo', 'announcement']} />
              </div>
            </div>
          </div>
        </section>

        {/* Video Cards - Full width */}
        <section className="border-t border-border px-8 md:px-16 lg:px-24 py-20 lg:py-32">
          <div className="max-w-2xl mb-16">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Video Cards</h2>
            <p className="text-lg text-muted leading-relaxed">
              Auto-play muted on hover. Click opens modal with shared layout animation. Ghost cards for upcoming content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
            <div className="relative">
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Active</p>
              <VideoCard
                video={sampleVideo}
                onSelect={handleVideoSelect}
                onClose={handleModalClose}
                isExpanded={expandedVideoId === sampleVideo.id}
              />
            </div>
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Ghost</p>
              <VideoCard video={ghostVideo} onSelect={() => {}} />
            </div>
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Loading</p>
              <VideoCardSkeleton />
            </div>
          </div>
        </section>

        {/* Player Icons - Full width */}
        <section className="border-t border-border px-8 md:px-16 lg:px-24 py-20 lg:py-32">
          <div className="max-w-2xl mb-16">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Player Icons</h2>
            <p className="text-lg text-muted leading-relaxed">
              Custom 20×20 viewbox, stroke-based. Skip icons include "5" in the path.
            </p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-9 gap-8 max-w-4xl">
            {[
              { Icon: PlayIcon, label: 'Play' },
              { Icon: PauseIcon, label: 'Pause' },
              { Icon: SkipBackwardIcon, label: '-5s' },
              { Icon: SkipForwardIcon, label: '+5s' },
              { Icon: SoundFullIcon, label: 'Full' },
              { Icon: SoundMidIcon, label: 'Mid' },
              { Icon: SoundOffIcon, label: 'Muted' },
              { Icon: ExpandIcon, label: 'Expand' },
              { Icon: MinimizeIcon, label: 'Minimize' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 flex items-center justify-center bg-surface rounded-2xl">
                  <Icon className="w-6 h-6 text-foreground" />
                </div>
                <span className="text-xs text-muted">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Company Link */}
        <section className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Links</h2>
              <p className="text-lg text-muted leading-relaxed max-w-md">
                Company names link to dedicated pages. Muted color, foreground on hover.
              </p>
            </div>

            <div className="bg-surface/30 px-8 md:px-16 lg:px-24 py-20 lg:py-32 flex items-center">
              <div className="flex items-center gap-4">
                <CompanyLink
                  company="Lovable"
                  companySlug="lovable"
                  className="text-base text-muted hover:text-foreground transition-colors"
                />
                <span className="text-muted/40">→</span>
                <span className="text-sm font-mono text-muted">/lovable</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="border-t border-border">
          <div className="px-8 md:px-16 lg:px-24 py-20 lg:py-32 pb-8">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">Footer</h2>
            <p className="text-lg text-muted leading-relaxed max-w-md">
              Minimal with legal links. Centered on mobile, spread on desktop.
            </p>
          </div>
          <div className="[&>footer]:mt-0">
            <Footer />
          </div>
        </section>

      </div>
    </IntroProvider>
  )
}
