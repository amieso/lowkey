import type { Metadata } from 'next'
import { Inter, Kanit, JetBrains_Mono } from 'next/font/google'
import { Footer } from '@/components/layout/footer'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthModal } from '@/components/auth/auth-modal'
import { AuthToast } from '@/components/ui/auth-toast'
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
  description: 'Discover the best product launch videos for inspiration. Mobbin for launch videos.',
  openGraph: {
    title: 'Lowkey - Curated Product Launch Videos',
    description: 'Discover the best product launch videos for inspiration',
    url: 'https://lowkey.so',
    siteName: 'Lowkey',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lowkey - Curated Product Launch Videos',
    description: 'Discover the best product launch videos for inspiration',
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
        <AuthProvider>
          <main className="flex-1">{children}</main>
          <Footer />
          <AuthModal />
          <AuthToast />
        </AuthProvider>
      </body>
    </html>
  )
}
