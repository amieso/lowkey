import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full bg-background mt-8 md:mt-[52px]">
      <div className="mx-4 md:mx-6 border-t border-foreground/10" />
      <div className="px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 md:gap-0">
          <span className="text-xs text-muted order-2 md:order-1">
            © 2026 Lowkey
          </span>

          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5 order-1 md:order-2">
            <Link
              href="https://x.com/viewlowkey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              X
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
