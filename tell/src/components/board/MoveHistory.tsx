'use client'

import { useEffect, useRef } from 'react'
import { Chess } from 'chess.js'

interface MoveHistoryProps {
  chess: Chess
}

export default function MoveHistory({ chess }: MoveHistoryProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const moves  = chess.history()
  const pairs: [string, string | undefined][] = []
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length])

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)', minHeight: 200 }}
    >
      <div
        className="font-mono text-xs px-2 py-1 border-b readout"
        style={{ borderColor: 'var(--color-border)', letterSpacing: '0.18em' }}
      >
        MOVE LOG
      </div>
      <div className="p-2 space-y-0.5">
        {pairs.map(([white, black], i) => (
          <div key={i} className="flex gap-2 text-xs font-mono">
            <span style={{ color: 'var(--color-muted)', width: 22, flexShrink: 0 }}>
              {i + 1}.
            </span>
            <span style={{ color: 'var(--color-bone)', width: 44 }}>{white}</span>
            <span style={{ color: 'var(--color-bone-dim)' }}>{black}</span>
          </div>
        ))}
        {moves.length === 0 && (
          <p className="readout text-xs italic" style={{ color: 'var(--color-muted)' }}>
            awaiting first move
          </p>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
