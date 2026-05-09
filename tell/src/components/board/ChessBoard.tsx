'use client'

import { useEffect, useRef } from 'react'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import { Chess } from 'chess.js'
import { buildDests } from '@/lib/chess/game'
import type { Key } from 'chessground/types'

interface ChessBoardProps {
  chess: Chess
  orientation: 'white' | 'black'
  onMove: (from: string, to: string, promotion?: string) => boolean
  isMyTurn: boolean
  lastMove?: { from: string; to: string } | undefined
  size?: number
}

let ChessgroundLib: typeof import('chessground') | null = null

export default function ChessBoard({
  chess, orientation, onMove, isMyTurn, lastMove, size = 480
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const apiRef   = useRef<Api | null>(null)

  // Load chessground dynamically (browser-only)
  useEffect(() => {
    let mounted = true
    const container = boardRef.current
    if (!container) return

    async function init() {
      if (!ChessgroundLib) {
        ChessgroundLib = await import('chessground')
      }
      if (!mounted || !container) return

      const config: Config = {
        fen: chess.fen(),
        orientation,
        turnColor: chess.turn() === 'w' ? 'white' : 'black',
        movable: {
          color: isMyTurn ? orientation : undefined,
          free: false,
          dests: isMyTurn ? buildDests(chess) : new Map(),
          showDests: true,
          events: {
            after: (orig: Key, dest: Key) => {
              // Check for pawn promotion
              const needsPromotion = isPromotion(chess, orig, dest)
              if (needsPromotion) {
                // Default promote to queen
                onMove(orig, dest, 'q')
              } else {
                onMove(orig, dest)
              }
            },
          },
        },
        highlight: {
          lastMove: true,
          check: true,
        },
        animation: { enabled: true, duration: 140 },
        premovable: { enabled: true },
        lastMove: lastMove ? [lastMove.from as Key, lastMove.to as Key] : undefined,
      }

      apiRef.current = ChessgroundLib.Chessground(container, config)
    }

    init()
    return () => {
      mounted = false
      apiRef.current?.destroy()
      apiRef.current = null
    }
  }, [orientation])  // Only reinitialize on orientation change

  // Update board state on chess/turn changes
  useEffect(() => {
    const api = apiRef.current
    if (!api) return

    api.set({
      fen: chess.fen(),
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      movable: {
        color: isMyTurn ? orientation : undefined,
        dests: isMyTurn ? buildDests(chess) : new Map(),
      },
      lastMove: lastMove ? [lastMove.from as Key, lastMove.to as Key] : undefined,
      check: chess.inCheck() ? (chess.turn() === 'w' ? 'white' : 'black') : undefined,
    })
  }, [chess.fen(), isMyTurn, lastMove, orientation])

  return (
    <div
      ref={boardRef}
      className="cg-board-wrap"
      style={{ width: size, height: size, userSelect: 'none' }}
    />
  )
}

function isPromotion(chess: Chess, from: Key, to: Key): boolean {
  const piece = chess.get(from as import('chess.js').Square)
  if (!piece || piece.type !== 'p') return false
  const toRank = to[1]
  return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
}
