import type { Metadata } from 'next'
import { Inter, Kanit, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import '@/styles/globals.css'
import { SITE_URL } from '@/lib/site'

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Dark canvas from the very first paint — without these the browser shows
  // its default white canvas until the stylesheet applies (visible as a
  // white flash before the intro).
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
}

const TAGLINE = 'The rumors are true. These are the best product launch videos.'
const DESCRIPTION = `${TAGLINE} Subscribe to get the latest launches delivered to your inbox.`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lowkey - The best product launch videos',
    template: '%s - Lowkey',
  },
  description: DESCRIPTION,
  openGraph: {
    title: 'Lowkey - The best product launch videos',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Lowkey',
    type: 'website',
    images: [
      {
        url: '/animated-og.gif',
        width: 1200,
        height: 630,
        alt: `Lowkey - ${TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lowkey - The best product launch videos',
    description: DESCRIPTION,
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
        {process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID && (
          <Script
            defer
            data-website-id={process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID}
            data-domain={process.env.NEXT_PUBLIC_DATAFAST_DOMAIN}
            src="https://datafa.st/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
