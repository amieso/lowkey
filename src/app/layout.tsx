import type { Metadata } from 'next'
import { Inter, Kanit, JetBrains_Mono } from 'next/font/google'
import { Footer } from '@/components/layout/footer'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const kanit = Kanit({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-kanit',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Lowkey - Curated Product Launch Videos',
  description: 'The best product launch videos, curated.',
  openGraph: {
    title: 'Lowkey',
    description: 'The best product launch videos, curated.',
    url: 'https://lowkey.so',
    siteName: 'Lowkey',
    type: 'website',
    images: [
      {
        url: '/animated-og.gif',
        width: 1200,
        height: 630,
        alt: 'Lowkey - The best product launch videos, curated.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lowkey',
    description: 'The best product launch videos, curated.',
    images: ['/animated-og.gif'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${kanit.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
