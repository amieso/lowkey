import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.logo.dev' },
      { protocol: 'https', hostname: 'image.mux.com' },
      { protocol: 'https', hostname: 'stream.mux.com' },
      { protocol: 'https', hostname: 'unavatar.io' },
      { protocol: 'https', hostname: 'static.amo.co' },
    ],
  },
  async redirects() {
    // The Claude company page was folded into Anthropic.
    return [
      { source: '/claude', destination: '/anthropic', permanent: true },
      { source: '/claude/:slug', destination: '/anthropic/:slug', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        // Security headers for all pages except static assets
        source: '/:path((?!.*\\.(?:png|jpg|jpeg|gif|ico|svg|webp)$).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
