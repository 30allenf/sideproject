export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'TELL — Psychological Warfare Chess',
  description: 'Your heartbeat is visible. Your body betrays you. Bluffing is a skill.',
  keywords: ['chess', 'heartbeat', 'rppg', 'psychological', 'multiplayer'],
  openGraph: {
    title: 'TELL',
    description: 'Chess. Webcam. Heartbeat. The tell that gives you away.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#181818',
              color: '#e8e0d0',
              border: '1px solid #2a2a2a',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.06em',
            },
            error: {
              iconTheme: { primary: '#c0392b', secondary: '#e8e0d0' },
            },
          }}
        />
      </body>
    </html>
  )
}
