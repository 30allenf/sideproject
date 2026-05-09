'use client'

import type { UserProfile, PresenceRecord } from '@/types'

interface FriendActivityProps {
  friends: UserProfile[]
  presence: Record<string, PresenceRecord>
}

export default function FriendActivity({ friends, presence }: FriendActivityProps) {
  const active = friends.filter(f => presence[f.uid]?.online)

  if (!active.length) return null

  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-bone text-lg tracking-widest uppercase mb-4">
        LIVE ACTIVITY
      </h3>
      <div className="space-y-3">
        {active.map(f => {
          const pr = presence[f.uid]
          const isPlaying = !!pr?.currentGameId
          return (
            <div key={f.uid} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: isPlaying ? 'var(--color-amber)' : 'var(--color-signal)' }}
              />
              <span className="font-mono text-xs text-bone">{f.username}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-bone-dim)' }}>
                {isPlaying ? 'is in a game' : 'is online'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
