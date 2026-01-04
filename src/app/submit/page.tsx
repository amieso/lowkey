import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { SubmissionForm } from '@/components/forms/submission-form'

export const metadata: Metadata = {
  title: 'Submit a Video | Lowkey',
  description: 'Submit your product launch video to be featured on Lowkey',
}

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <div className="mx-auto max-w-[560px] px-4 sm:px-6">
          {/* Back Link */}
          <div className="py-4 border-b border-border">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
          </div>

          <div className="py-8">
            <header className="mb-8">
              <h1 className="text-xl font-medium text-foreground">
                Submit a video
              </h1>
              <p className="mt-1 text-sm text-muted">
                Share a product launch video with our community
              </p>
            </header>

            <SubmissionForm />
          </div>
        </div>
      </main>
    </div>
  )
}
