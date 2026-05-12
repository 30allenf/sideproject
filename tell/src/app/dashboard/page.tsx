'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'

const STAGGER = { visible: { transition: { staggerChildren: 0.06 } } }
const ITEM = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !profile) router.replace('/')
  }, [profile, loading, router])

  if (loading || !profile) return (
    <div className="min-h-dvh bg-void flex items-center justify-center">
      <p className="readout" style={{ color: 'var(--color-bone-dim)' }}>INITIALIZING...</p>
    </div>
  )

  return (
    <div className="min-h-dvh bg-void" style={{ background: 'radial-gradient(ellipse at 30% -10%, #180808, #0a0a0a 55%)' }}>
      <header className="border-b" style={{ borderColor: 'var(--color-border)', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display font-black text-4xl text-bone tracking-wider">TELL</span>
          <span className="readout" style={{ color: 'var(--color-bone-dim)' }}>{profile.username}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <motion.div initial="hidden" animate="visible" variants={STAGGER} className="space-y-4">

          {/* Stat bar */}
          <motion.div variants={ITEM} className="card p-5 grid grid-cols-4 gap-4">
            {[
              { label: 'BULLET', value: profile.elo.bullet },
              { label: 'BLITZ',  value: profile.elo.blitz },
              { label: 'RAPID',  value: profile.elo.rapid },
              { label: 'W/L/D',  value: `${profile.stats.wins}/${profile.stats.losses}/${profile.stats.draws}` },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="readout mb-1">{s.label}</div>
                <div className="font-display font-black text-bone text-3xl">{s.value}</div>
              </div>
            ))}
          </motion.div>

          {/* Play options */}
          <motion.div variants={ITEM} className="card p-6">
            <h2 className="font-display font-black text-bone text-2xl tracking-widest uppercase mb-6">
              INITIATE ENGAGEMENT
            </h2>
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              {[
                { label: 'VS. BOT', sub: 'Choose your opponent', href: '/bots', icon: '⬛' },
                { label: 'QUICK PLAY', sub: 'Random bot, random side', href: '/bots?quick=1', icon: '⚡' },
              ].map(opt => (
                <Link key={opt.label} href={opt.href}>
                  <div className="card p-5 hover:border-crimson transition-all cursor-pointer group" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="text-3xl mb-3">{opt.icon}</div>
                    <div className="font-display font-black text-bone text-lg tracking-wider group-hover:text-crimson transition-colors uppercase">
                      {opt.label}
                    </div>
                    <div className="readout mt-1">{opt.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
