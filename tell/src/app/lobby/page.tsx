'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useMatchmaking } from '@/hooks/useMatchmaking'
import { createGameRoom } from '@/lib/firebase/realtime'
import { generateGameId } from '@/lib/chess/game'
import type { TimeControl } from '@/types'

const TIME_OPTS: { tc: TimeControl; label: string; sub: string }[] = [
  { tc: 'bullet',   label: '2+1',   sub: 'BULLET' },
  { tc: 'blitz5+0', label: '5+0',   sub: 'BLITZ' },
  { tc: 'blitz5+3', label: '5+3',   sub: 'BLITZ' },
  { tc: 'rapid',    label: '15+10', sub: 'RAPID' },
]

export default function LobbyPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const isPrivate = params.get('mode') === 'private'
  const [privateLink, setPrivateLink] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  const { inQueue, queueTime, timeControl, joinQueue, leaveQueue } = useMatchmaking({
    profile: profile!,
    onMatchFound: (gameId, color) => router.push(`/game/${gameId}`),
  })

  async function createPrivateRoom() {
    const gameId = generateGameId()
    await createGameRoom(gameId, profile!.uid, 'blitz5+0', 0)
    const link = `${window.location.origin}/game/${gameId}?join=1`
    setPrivateLink(link)
  }

  if (loading || !profile) return null

  if (isPrivate && !privateLink) {
    return (
      <div className="min-h-dvh bg-void flex flex-col items-center justify-center gap-6 px-4">
        <h2 className="font-display font-black text-bone text-5xl tracking-widest">PRIVATE ROOM</h2>
        <p className="font-mono text-sm" style={{ color: 'var(--color-bone-dim)' }}>
          Generate a link and share it with your opponent.
        </p>
        <button className="btn-primary text-lg px-10 py-4" onClick={createPrivateRoom}>
          GENERATE LINK
        </button>
        <Link href="/dashboard" className="btn-ghost">BACK</Link>
      </div>
    )
  }

  if (isPrivate && privateLink) {
    return (
      <div className="min-h-dvh bg-void flex flex-col items-center justify-center gap-6 px-4 text-center">
        <h2 className="font-display font-black text-bone text-5xl tracking-widest">AWAITING SUBJECT</h2>
        <p className="font-mono text-sm" style={{ color: 'var(--color-bone-dim)' }}>
          Share this link with your opponent:
        </p>
        <div
          className="card px-6 py-4 font-mono text-sm text-bone cursor-pointer select-all max-w-lg break-all"
          style={{ borderColor: 'var(--color-crimson)' }}
          onClick={() => { navigator.clipboard.writeText(privateLink); }}
        >
          {privateLink}
        </div>
        <p className="readout text-xs" style={{ color: 'var(--color-muted)' }}>
          click to copy · waiting for opponent to join
        </p>
        <div className="flex gap-3">
          <div className="readout text-xs" style={{ color: 'var(--color-amber)' }}>
            {'█'.repeat(3 + (Math.floor(Date.now() / 500) % 4))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-void" style={{ background: 'radial-gradient(ellipse at center, #0d0505, #0a0a0a 55%)' }}>
      <header className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--color-border)' }}>
        <Link href="/dashboard" className="readout hover:text-bone transition-colors" style={{ color: 'var(--color-muted)' }}>
          ← BACK
        </Link>
        <span className="font-display font-black text-4xl text-bone tracking-wider">TELL</span>
      </header>

      <div className="max-w-lg mx-auto px-6 py-20 text-center space-y-8">
        <div>
          <div className="readout mb-2" style={{ color: 'var(--color-crimson)' }}>MATCHMAKING</div>
          <h1 className="font-display font-black text-bone text-6xl tracking-widest">
            {inQueue ? 'SEARCHING' : 'QUICK MATCH'}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {!inQueue ? (
            <motion.div key="options" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 gap-3">
                {TIME_OPTS.map(opt => (
                  <button
                    key={opt.tc}
                    className="card p-4 text-center hover:border-crimson transition-all cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => joinQueue(opt.tc)}
                  >
                    <div className="font-display font-black text-bone text-3xl">{opt.label}</div>
                    <div className="readout" style={{ color: 'var(--color-bone-dim)' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
              <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                Matched within ±150 ELO. Widens to ±300 after 30 seconds.
              </p>
            </motion.div>
          ) : (
            <motion.div key="queue" className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="font-mono text-6xl tabular-nums" style={{ color: 'var(--color-crimson)' }}>
                {String(Math.floor(queueTime / 60)).padStart(2, '0')}:{String(queueTime % 60).padStart(2, '0')}
              </div>
              <div className="readout" style={{ color: 'var(--color-bone-dim)' }}>
                {timeControl.toUpperCase()} · {profile.elo.blitz} ELO
              </div>
              <div className="flex gap-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ background: 'var(--color-crimson)' }}
                    animate={{ height: ['4px', '20px', '4px'] }}
                    transition={{ duration: 0.8, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
              <button className="btn-ghost" onClick={leaveQueue}>CANCEL</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
