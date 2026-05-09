'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Chess } from 'chess.js'
import PanicGraph from '@/components/ui/PanicGraph'

interface GameResultModalProps {
  gameOver: { over: boolean; status: string; winner: 'white' | 'black' | 'draw' | null }
  myColor: 'white' | 'black'
  chess: Chess
  myPanicHistory: number[]
  opponentPanicHistory: number[]
  gameId: string
  onClose: () => void
  onRematch: () => void
}

const STATUS_LABELS: Record<string, string> = {
  checkmate:       'CHECKMATE',
  resignation:     'RESIGNATION',
  draw_agreement:  'DRAW BY AGREEMENT',
  stalemate:       'STALEMATE',
  timeout:         'TIME FORFEIT',
  abandoned:       'ABANDONED',
  aborted:         'ABORTED',
}

export default function GameResultModal({
  gameOver, myColor, chess, myPanicHistory, opponentPanicHistory, gameId, onClose, onRematch
}: GameResultModalProps) {
  const graphRef = useRef<HTMLDivElement>(null)

  const isWin  = gameOver.winner === myColor
  const isDraw = gameOver.winner === 'draw' || gameOver.winner === null
  const headline = isDraw ? 'DRAW' : isWin ? 'VICTORY' : 'DEFEAT'
  const headlineColor = isDraw
    ? 'var(--color-amber)'
    : isWin
    ? 'var(--color-signal)'
    : 'var(--color-crimson)'

  const moveCount = chess.history().length
  const pgn       = chess.pgn()

  function downloadPGN() {
    const blob = new Blob([pgn], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `tell-${gameId}.pgn`
    a.click()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl"
        style={{
          background: 'var(--color-surface)',
          border: `2px solid ${headlineColor}`,
          boxShadow: `0 0 60px ${headlineColor}30`,
        }}
        initial={{ scale: 0.88, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {/* Header */}
        <div
          className="px-8 py-6 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="readout mb-1" style={{ color: 'var(--color-bone-dim)' }}>
            {STATUS_LABELS[gameOver.status] ?? gameOver.status.toUpperCase()}
          </div>
          <h2
            className="font-display font-black tracking-widest"
            style={{ fontSize: 72, lineHeight: 1, color: headlineColor }}
          >
            {headline}
          </h2>
          <div className="readout mt-2" style={{ color: 'var(--color-muted)' }}>
            {moveCount} moves
            <span className="sep">·</span>
            Game #{gameId.slice(0, 6).toUpperCase()}
          </div>
        </div>

        {/* Panic graph reveal */}
        <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="readout mb-3" style={{ color: 'var(--color-bone-dim)' }}>
            POST-GAME INTELLIGENCE — FULL PANIC TIMELINE
          </div>
          <div ref={graphRef}>
            <PanicGraph
              myHistory={myPanicHistory}
              opponentHistory={opponentPanicHistory}
              moves={chess.history()}
              exportRef={graphRef}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-5 flex gap-4 flex-wrap">
          <button className="btn-primary" onClick={onRematch}>
            FIND ANOTHER GAME
          </button>
          <button className="btn-ghost" onClick={downloadPGN}>
            EXPORT PGN
          </button>
          <button className="btn-ghost" onClick={onClose}>
            REVIEW BOARD
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
