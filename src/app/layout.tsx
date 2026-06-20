import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Baby Journal',
  description: 'A journal for our little one',
}

// viewport-fit=cover is required for env(safe-area-inset-*) to resolve to
// non-zero values on iOS Safari, so the fixed bottom nav can clear the
// home indicator / collapsing bottom toolbar.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-cream-50">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
