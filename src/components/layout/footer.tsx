import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">
              Designed by the beach
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="https://twitter.com/lowkeyso"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Twitter
            </Link>
            <Link
              href="/submit"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Submit a video
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
