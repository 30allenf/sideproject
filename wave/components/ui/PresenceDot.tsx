'use client'

import type { PresenceStatus } from '@/lib/types'

interface PresenceDotProps {
  status: PresenceStatus
  size?: 'sm' | 'md'
  borderColor?: string
}

export default function PresenceDot({ status, size = 'md', borderColor }: PresenceDotProps) {
  const px = size === 'sm' ? 8 : 10
  return (
    <span
      className={`presence-dot ${status}`}
      style={{
        width: px,
        height: px,
        borderWidth: size === 'sm' ? 1.5 : 2,
        borderColor: borderColor ?? 'white',
      }}
    />
  )
}
