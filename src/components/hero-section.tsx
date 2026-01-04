import Link from 'next/link'
import { MorphText } from './ui/morph-text'

const ROTATING_WORDS = ['launch video', 'product demo', 'announcement']

export function HeroSection() {
  return (
    <section className="px-6 py-20 md:py-32">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[12px] font-mono text-muted uppercase tracking-widest mb-7">
          From the makers of Amie
        </p>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-foreground leading-[1.1] tracking-tight">
          <MorphText prefix="Find your next" words={ROTATING_WORDS} />
        </h1>
        <p className="mt-4 text-lg text-muted leading-relaxed max-w-xl mx-auto">
          A curated collection of the best product launch videos.
          Get inspired by how top companies announce their products.
        </p>
        <div className="mt-10 flex items-center justify-center gap-2">
          <a
            href="#videos"
            className="inline-flex items-center justify-center px-4 py-2 text-sm text-muted bg-surface rounded-full transition-colors hover:text-foreground"
          >
            Join Lowkey
          </a>
          <Link
            href="/submit"
            className="inline-flex items-center justify-center px-4 py-[6px] text-sm text-muted border-2 border-surface rounded-full transition-colors hover:text-foreground/60 hover:border-foreground/60"
          >
            Submit Video
          </Link>
        </div>
      </div>
    </section>
  )
}
