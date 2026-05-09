'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import BotSelector from '@/components/bots/BotSelector'

export default function BotsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  if (loading || !profile) return null

  return (
    <div className="min-h-dvh bg-void" style={{ background: 'radial-gradient(ellipse at 70% -10%, #100808, #0a0a0a 50%)' }}>
      <header className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--color-border)' }}>
        <Link href="/dashboard" className="readout hover:text-bone transition-colors" style={{ color: 'var(--color-muted)' }}>
          ← BACK
        </Link>
        <span className="font-display font-black text-4xl text-bone tracking-wider">TELL</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="readout mb-2" style={{ color: 'var(--color-crimson)' }}>
            SIMULATED OPPOSITION
          </div>
          <h1 className="font-display font-black text-bone text-6xl tracking-widest uppercase mb-2">
            BOT LIBRARY
          </h1>
          <p className="font-mono text-sm mb-12" style={{ color: 'var(--color-bone-dim)' }}>
            Eight levels. Each with a distinct panic profile. Only one has a real heartbeat.
          </p>
          <BotSelector profile={profile} />
        </motion.div>
      </div>
    </div>
  )
}
