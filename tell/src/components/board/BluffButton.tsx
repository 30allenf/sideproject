'use client'

import { motion } from 'framer-motion'

interface BluffButtonProps {
  used: boolean
  active: boolean
  onActivate: () => void
}

export default function BluffButton({ used, active, onActivate }: BluffButtonProps) {
  return (
    <motion.button
      onClick={!used ? onActivate : undefined}
      disabled={used}
      className={`relative w-full ${active ? 'bluff-active' : ''}`}
      style={{ cursor: used ? 'not-allowed' : 'pointer', opacity: used ? 0.4 : 1 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Toggle switch body */}
      <div
        className="flex items-center gap-3 px-3 py-2 border"
        style={{
          background: 'var(--color-panel)',
          borderColor: used ? 'var(--color-border)' : active ? 'var(--color-crimson)' : 'var(--color-muted)',
          borderRadius: 2,
          boxShadow: active ? '0 0 12px var(--color-crimson-glow)' : 'none',
        }}
      >
        {/* Indicator light */}
        <div
          className="bluff-indicator w-3 h-3 rounded-full border"
          style={{
            background: used ? 'var(--color-muted)' : active ? 'var(--color-crimson)' : 'var(--color-abyss)',
            borderColor: used ? 'var(--color-border)' : 'var(--color-crimson)',
            flexShrink: 0,
          }}
        />
        {/* Toggle slider track */}
        <div
          className="relative flex-1 h-4 rounded-sm"
          style={{ background: 'var(--color-abyss)', border: '1px solid var(--color-border)' }}
        >
          <motion.div
            className="absolute top-0.5 bottom-0.5 w-3 rounded-sm"
            animate={{ left: active ? 'calc(100% - 14px)' : 2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ background: active ? 'var(--color-crimson)' : 'var(--color-muted)' }}
          />
        </div>
      </div>

      {/* Label */}
      <div
        className="readout text-center mt-1"
        style={{ fontSize: 8, color: active ? 'var(--color-crimson)' : 'var(--color-bone-dim)', letterSpacing: '0.22em' }}
      >
        {active ? 'SUPPRESSING' : used ? 'EXPENDED' : 'SUPPRESS TELL'}
      </div>
    </motion.button>
  )
}
