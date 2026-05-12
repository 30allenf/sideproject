import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Wave — messaging that feels human',
  description: 'Real-time chat with presence, reactions, and quoted replies.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Wave' },
}

export const viewport: Viewport = {
  themeColor: '#f5f0e8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', overflow: 'hidden' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
