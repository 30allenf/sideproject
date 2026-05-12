'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !profile) router.replace('/')
    if (!loading && profile && !profile.username) router.replace('/')
  }, [profile, loading, router])

  return (
    <AppShell>
      <div
        className="flex flex-col items-center justify-center h-full text-center px-6"
        style={{ background: 'var(--color-surface)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2
            className="font-display font-light mb-3"
            style={{ fontSize: 56, color: 'var(--color-terracotta)', letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            Wave
          </h2>
          <p className="text-base mb-1" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            Welcome back, {profile?.displayName?.split(' ')[0] ?? 'friend'}.
          </p>
          <p className="text-sm" style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-body)' }}>
            Pick up where you left off — or start something new.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              className="btn btn-primary"
              onClick={() => router.push('/browse')}
            >
              🔍 Browse rooms
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => router.push('/settings')}
            >
              ⚙️ Settings
            </button>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}
