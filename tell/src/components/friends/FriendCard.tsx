'use client'

import type { UserProfile, PresenceRecord } from '@/types'

interface FriendCardProps {
  friend: UserProfile
  presence?: PresenceRecord
  onChallenge?: () => void
}

export default function FriendCard({ friend, presence, onChallenge }: FriendCardProps) {
  const isOnline = presence?.online ?? false
  const inGame   = !!presence?.currentGameId

  return (
    <div
      className="flex items-center justify-between py-2 px-3 border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-abyss)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: isOnline
              ? (inGame ? 'var(--color-amber)' : 'var(--color-signal)')
              : 'var(--color-border)',
          }}
        />
        <div className="min-w-0">
          <div
            className="font-mono text-xs font-medium truncate"
            style={{ color: isOnline ? 'var(--color-bone)' : 'var(--color-bone-dim)' }}
          >
            {friend.username}
          </div>
          <div className="readout" style={{ fontSize: 8 }}>
            {inGame
              ? <span style={{ color: 'var(--color-amber)' }}>IN GAME</span>
              : isOnline
              ? <span style={{ color: 'var(--color-signal)' }}>AVAILABLE</span>
              : <span style={{ color: 'var(--color-muted)' }}>OFFLINE</span>
            }
          </div>
        </div>
      </div>
      {isOnline && !inGame && onChallenge && (
        <button
          className="readout text-crimson ml-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ fontSize: 9, color: 'var(--color-crimson)', letterSpacing: '0.2em' }}
          onClick={onChallenge}
        >
          CHALLENGE
        </button>
      )}
    </div>
  )
}
