'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatedLogo } from '@/components/ui/animated-logo'

export function Header() {
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full pb-2">
      {/* Progressive blur layers */}
      <div className="absolute inset-0 backdrop-blur-[16px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_25%)]" />
      <div className="absolute inset-0 backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,black_10%,transparent_40%)]" />
      <div className="absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,black_20%,transparent_55%)]" />
      <div className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,black_35%,transparent_70%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black_50%,transparent_85%)]" />
      <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-transparent" />
      <div className="relative px-4 md:px-6">
        <div className="flex h-12 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <AnimatedLogo isHovered={isLogoHovered} />
            <span className="text-lg font-kanit font-bold text-foreground">lowkey</span>
          </Link>

          {/* Right side nav */}
          <nav className="flex items-center gap-3">
            <a
              href="#subscribe"
              className="text-sm text-foreground hover:text-foreground/80 transition-colors"
            >
              Subscribe
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
