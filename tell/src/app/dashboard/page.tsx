'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { signOut } from '@/lib/firebase/auth'
import FriendsList from '@/components/friends/FriendsList'
import FriendActivity from '@/components/friends/FriendActivity'
import { timeControlLabel } from '@/lib/chess/game'

const STAGGER = { visible: { transition: { staggerChildren: 0.06 } } }
const ITEM = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const { friends, presence, pendingRequests, respond } = useFriends(profile)
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  if (loading || !profile) return (
    <div className="min-h-dvh bg-void flex items-center justify-center">
      <p className="readout" style={{ color: 'var(--color-bone-dim)' }}>INITIALIZING...</p>
    </div>
  )

  return (
    <div className="min-h-dvh bg-void" style={{ background: 'radial-gradient(ellipse at 30% -10%, #180808, #0a0a0a 55%)' }}>
      {/* Top nav */}
      <header className="border-b" style={{ borderColor: 'var(--color-border)', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display font-black text-4xl text-bone tracking-wider">TELL</span>
          <div className="flex items-center gap-6">
            <Link href="/profile" className="readout hover:text-bone transition-colors" style={{ color: 'var(--color-bone-dim)' }}>
              {profile.username}
            </Link>
            <button onClick={() => signOut()} className="readout hover:text-crimson transition-colors" style={{ color: 'var(--color-muted)' }}>
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-3 gap-6">
        {/* Left: Play options */}
        <motion.div className="col-span-2 space-y-4" initial="hidden" animate="visible" variants={STAGGER}>

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
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'QUICK MATCH', sub: 'ELO-matched queue', href: '/lobby', icon: '⚡' },
                { label: 'VS. BOT',     sub: 'Choose an opponent', href: '/bots', icon: '⬛' },
                { label: 'PRIVATE ROOM', sub: 'Share a link', href: '/lobby?mode=private', icon: '🔒' },
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

          {/* Friend activity feed */}
          <motion.div variants={ITEM}>
            <FriendActivity friends={friends} presence={presence} />
          </motion.div>

          {/* Pending friend requests */}
          {pendingRequests.length > 0 && (
            <motion.div variants={ITEM} className="card p-5">
              <h3 className="font-display font-bold text-bone text-lg tracking-widest uppercase mb-4">
                INCOMING REQUESTS ({pendingRequests.length})
              </h3>
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-mono text-bone text-sm">{req.fromUsername}</span>
                    <div className="flex gap-3">
                      <button className="btn-primary text-xs py-1 px-3" onClick={() => respond(req, true)}>ACCEPT</button>
                      <button className="btn-ghost text-xs py-1 px-3" onClick={() => respond(req, false)}>DECLINE</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right: Friends */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <FriendsList friends={friends} presence={presence} myProfile={profile} />
        </motion.div>
      </div>
    </div>
  )
}
