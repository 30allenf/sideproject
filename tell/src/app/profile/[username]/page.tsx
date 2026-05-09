'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getUserByUsername, getRecentGames } from '@/lib/firebase/db'
import type { UserProfile, GameRecord } from '@/types'
import { formatClock } from '@/lib/chess/game'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [games, setGames]     = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserByUsername(username).then(async (p) => {
      setProfile(p)
      if (p) {
        const g = await getRecentGames(p.uid, 10)
        setGames(g)
      }
      setLoading(false)
    })
  }, [username])

  if (loading) return (
    <div className="min-h-dvh bg-void flex items-center justify-center">
      <p className="readout" style={{ color: 'var(--color-bone-dim)' }}>RETRIEVING FILE...</p>
    </div>
  )

  if (!profile) return (
    <div className="min-h-dvh bg-void flex flex-col items-center justify-center gap-4">
      <p className="font-display font-black text-crimson text-4xl tracking-widest">NOT FOUND</p>
      <Link href="/dashboard" className="btn-ghost">RETURN</Link>
    </div>
  )

  const winRate = profile.stats.wins + profile.stats.losses + profile.stats.draws > 0
    ? Math.round(profile.stats.wins / (profile.stats.wins + profile.stats.losses + profile.stats.draws) * 100)
    : 0

  return (
    <div className="min-h-dvh bg-void">
      <header className="border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <Link href="/dashboard" className="readout hover:text-bone" style={{ color: 'var(--color-muted)' }}>← BACK</Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-6">
          {profile.photoURL && (
            <img src={profile.photoURL} alt="" className="w-16 h-16 rounded-none" style={{ border: '1px solid var(--color-border)' }} />
          )}
          <div>
            <div className="readout mb-1" style={{ color: 'var(--color-muted)' }}>PERSONNEL FILE</div>
            <h1 className="font-display font-black text-bone text-5xl tracking-widest uppercase">{profile.username}</h1>
          </div>
        </motion.div>

        {/* ELO ratings */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'BULLET ELO', value: profile.elo.bullet },
            { label: 'BLITZ ELO',  value: profile.elo.blitz },
            { label: 'RAPID ELO',  value: profile.elo.rapid },
            { label: 'WIN RATE',   value: `${winRate}%` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="readout mb-1">{s.label}</div>
              <div className="font-display font-black text-bone text-4xl">{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'WINS',      value: profile.stats.wins,           color: 'var(--color-signal)' },
            { label: 'LOSSES',    value: profile.stats.losses,         color: 'var(--color-crimson)' },
            { label: 'DRAWS',     value: profile.stats.draws,          color: 'var(--color-amber)' },
            { label: 'PANIC DEALT', value: profile.stats.totalPanicDealt.toFixed(1), color: 'var(--color-crimson)' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="readout mb-1">{s.label}</div>
              <div className="font-display font-black text-3xl" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Recent games */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-6">
          <h2 className="font-display font-bold text-bone text-xl tracking-widest uppercase mb-4">RECENT OPERATIONS</h2>
          {games.length === 0 ? (
            <p className="font-mono text-xs italic" style={{ color: 'var(--color-muted)' }}>No games on record.</p>
          ) : (
            <div className="space-y-3">
              {games.map(game => {
                const myColor = game.players.white.uid === profile.uid ? 'white' : 'black'
                const result  = game.result === myColor ? 'W' : game.result === 'draw' ? 'D' : 'L'
                const oppPlayer = myColor === 'white' ? game.players.black : game.players.white
                return (
                  <div key={game.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-4">
                      <span
                        className="font-display font-black text-xl w-6 text-center"
                        style={{
                          color: result === 'W' ? 'var(--color-signal)' : result === 'L' ? 'var(--color-crimson)' : 'var(--color-amber)'
                        }}
                      >
                        {result}
                      </span>
                      <div>
                        <div className="font-mono text-xs text-bone">vs {oppPlayer.username}</div>
                        <div className="readout" style={{ fontSize: 9 }}>
                          {game.timeControl.toUpperCase()}
                          <span className="sep">·</span>
                          {game.moves.length} moves
                        </div>
                      </div>
                    </div>
                    <div className="readout text-xs" style={{ color: 'var(--color-muted)' }}>
                      {new Date(game.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
