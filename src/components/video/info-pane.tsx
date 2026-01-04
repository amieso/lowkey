import Link from 'next/link'
import { Video, STYLE_LABELS, PRODUCT_TYPE_LABELS } from '@/types/video'
import { formatDuration } from '@/lib/utils'

interface InfoPaneProps {
  video: Video
}

export function InfoPane({ video }: InfoPaneProps) {
  const formattedDate = new Date(video.publishedDate).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <aside className="space-y-6">
      {/* Title and Company */}
      <div>
        <h1 className="text-xl font-medium text-foreground">{video.company}</h1>
        <p className="mt-0.5 text-base text-muted">{video.title}</p>
      </div>

      {/* Quick Links */}
      {(video.websiteUrl || video.twitterUrl || video.youtubeUrl) && (
        <div className="flex flex-wrap gap-2">
          {video.websiteUrl && (
            <QuickLink href={video.websiteUrl} label="Website" />
          )}
          {video.twitterUrl && (
            <QuickLink href={video.twitterUrl} label="Twitter" />
          )}
          {video.youtubeUrl && (
            <QuickLink href={video.youtubeUrl} label="YouTube" />
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <p className="text-sm text-muted leading-relaxed">{video.description}</p>
      </div>

      {/* Attributes */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <AttributeItem label="Style" value={STYLE_LABELS[video.style]} />
          <AttributeItem label="Duration" value={formatDuration(video.duration)} mono />
          <AttributeItem label="Type" value={PRODUCT_TYPE_LABELS[video.productType]} />
          <AttributeItem label="Published" value={formattedDate} />
        </div>
      </div>

      {/* Credits */}
      {video.credits.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h2 className="text-xs uppercase tracking-wider text-muted mb-3">
            Credits
          </h2>
          <ul className="space-y-2">
            {video.credits.map((credit, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted">{credit.role}</span>
                {credit.url ? (
                  <Link
                    href={credit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                  >
                    {credit.name}
                  </Link>
                ) : (
                  <span className="text-foreground">{credit.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
    >
      <span>{label}</span>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </Link>
  )
}

function AttributeItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
