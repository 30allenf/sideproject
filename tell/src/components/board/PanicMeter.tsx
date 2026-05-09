'use client'

import { useEffect, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface PanicMeterProps {
  value: number           // 0–1
  hasSignal: boolean
  label: string
  side: 'self' | 'opponent'
  bluffActive?: boolean
}

export default function PanicMeter({ value, hasSignal, label, side, bluffActive }: PanicMeterProps) {
  const spring = useSpring(value, { stiffness: 40, damping: 20 })

  useEffect(() => {
    spring.set(hasSignal ? value : 0)
  }, [value, spring, hasSignal])

  const height = useTransform(spring, [0, 1], ['0%', '100%'])
  const redIntensity = useTransform(spring, [0, 0.5, 0.8, 1], [
    'rgba(139,0,0,0.6)',
    'rgba(192,57,43,0.8)',
    'rgba(220,30,20,0.95)',
    'rgba(255,40,20,1)',
  ])

  const isHigh    = value > 0.7
  const isMaxed   = value > 0.9

  return (
    <div className="flex flex-col items-center w-full gap-2">
      <span className="readout text-xs" style={{ color: 'var(--color-bone-dim)' }}>{label}</span>

      <div
        className="relative w-8 overflow-hidden"
        style={{
          height: 200,
          background: 'var(--color-abyss)',
          border: `1px solid ${isMaxed ? 'var(--color-crimson)' : 'var(--color-border)'}`,
          borderRadius: 2,
        }}
      >
        {/* Bar fill — animated from bottom */}
        <motion.div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height,
            background: redIntensity,
          }}
        />

        {/* Horizontal tick marks */}
        {[0.25, 0.5, 0.75].map(tick => (
          <div
            key={tick}
            className="absolute left-0 right-0"
            style={{
              bottom: `${tick * 100}%`,
              height: 1,
              background: 'rgba(255,255,255,0.08)',
            }}
          />
        ))}

        {/* Glow at top of fill */}
        {hasSignal && value > 0.05 && (
          <motion.div
            className="absolute left-0 right-0"
            style={{
              bottom: height,
              height: 2,
              background: 'var(--color-crimson)',
              boxShadow: isHigh ? '0 0 8px var(--color-crimson)' : 'none',
            }}
          />
        )}

        {/* No signal overlay */}
        {!hasSignal && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <div className="readout text-center" style={{ fontSize: 7, color: 'var(--color-muted)', lineHeight: 1.4 }}>
              NO<br />SIG<br />NAL
            </div>
          </div>
        )}

        {/* Bluff indicator */}
        {bluffActive && (
          <div
            className="absolute inset-x-0 top-0 readout text-center py-1"
            style={{ fontSize: 6, background: 'rgba(192,57,43,0.3)', color: 'var(--color-crimson)', letterSpacing: '0.2em' }}
          >
            BLUFF
          </div>
        )}
      </div>

      {/* Numeric readout */}
      <div
        className="readout"
        style={{
          fontSize: 9,
          color: isHigh ? 'var(--color-crimson)' : 'var(--color-bone-dim)',
        }}
      >
        {hasSignal ? `${Math.round(value * 100)}%` : '—'}
      </div>

      {/* Pulse ring on high panic */}
      {isHigh && hasSignal && (
        <motion.div
          className="absolute rounded-full border"
          style={{ width: 48, height: 48, borderColor: 'var(--color-crimson)', opacity: 0 }}
          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </div>
  )
}
