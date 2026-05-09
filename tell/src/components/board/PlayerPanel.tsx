'use client'

import { motion } from 'framer-motion'
import { formatClock } from '@/lib/chess/game'

interface PlayerPanelProps {
  username: string
  clock: number
  isActive: boolean
  isBot?: boolean
}

export default function PlayerPanel({ username, clock, isActive, isBot }: PlayerPanelProps) {
  const isLow = clock < 10000 && clock > 0

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <div
        className="font-display font-bold tracking-widest uppercase text-center truncate w-full"
        style={{ fontSize: 13, color: isActive ? 'var(--color-bone)' : 'var(--color-bone-dim)' }}
      >
        {isBot ? '⬛ ' : ''}{username}
      </div>
      <motion.div
        className="font-mono font-bold tabular-nums"
        style={{
          fontSize: 24,
          color: isLow ? 'var(--color-crimson)' : isActive ? 'var(--color-bone)' : 'var(--color-muted)',
          letterSpacing: '0.05em',
          textShadow: isActive ? '0 0 8px rgba(232,224,208,0.2)' : 'none',
        }}
        animate={isLow && isActive ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        {formatClock(clock)}
      </motion.div>
      {isActive && (
        <div className="w-full h-0.5" style={{ background: 'var(--color-crimson)', opacity: 0.6 }} />
      )}
    </div>
  )
}
