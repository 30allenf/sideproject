'use client'

import { useState } from 'react'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { buildDests } from '@/lib/chess/game'

interface ChessBoardProps {
  chess: Chess
  orientation: 'white' | 'black'
  onMove: (from: string, to: string, promotion?: string) => boolean
  isMyTurn: boolean
  lastMove?: { from: string; to: string } | undefined
  size?: number
}

// SVG piece data — embedded so no CSS/file loading needed
const PIECES: Record<string, string> = {
  wK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-width="2"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-.5-5.5-6-3.5c-5.5 2-4.5 9.5 1 11V37z"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" fill="none" stroke="#000"/></g></svg>`,
  wQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 13A2 2 0 0 1 9 9a2 2 0 0 1 0 4z"/><path d="M22 11.5A2.5 2.5 0 0 1 22 7a2.5 2.5 0 0 1 0 4.5z"/><path d="M35.5 13A2 2 0 0 1 35.5 9a2 2 0 0 1 0 4z"/><path d="M17.5 11.5A2.5 2.5 0 0 1 17.5 7a2.5 2.5 0 0 1 0 4.5zM26.5 11.5A2.5 2.5 0 0 1 26.5 7a2.5 2.5 0 0 1 0 4.5z"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7l-3-7.5-3 7-5.5-8-5.5 7.5-2.5-7L11.5 30v7z"/><path d="M11.5 30c5.5-3 15.5-3 21 0" fill="none"/></g></svg>`,
  wR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9zM14 29.5v-13h17v13zM14.5 16.5h16M11 14V9h4v2h5V9h5v2h5V9h4v5"/></g></svg>`,
  wB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/></g></svg>`,
  wN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.38 5.12-2.18 2-4 4M9.5 11.5A4.5 4.5 0 0 1 9.5 7a4.5 4.5 0 0 1 0 4.5z"/><path d="M14.5 30c-.17-4.9 5.33-7.37 5.5-12.17M24.5 18c4 6.5 8 2 8 12.5"/></g></svg>`,
  wP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  bK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke="#fff" stroke-width="2" fill="none"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-.5-5.5-6-3.5c-5.5 2-4.5 9.5 1 11V37z"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" fill="none" stroke="#fff"/></g></svg>`,
  bQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="11" r="2" stroke="#fff"/><circle cx="22" cy="9" r="2.5" stroke="#fff"/><circle cx="35.5" cy="11" r="2" stroke="#fff"/><circle cx="17.5" cy="9" r="2.5" stroke="#fff"/><circle cx="26.5" cy="9" r="2.5" stroke="#fff"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7l-3-7.5-3 7-5.5-8-5.5 7.5-2.5-7L11.5 30v7z" stroke="#fff" stroke-linejoin="miter"/><path d="M11.5 30c5.5-3 15.5-3 21 0" fill="none" stroke="#fff"/></g></svg>`,
  bR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9zM14 29.5v-13h17v13zM14.5 16.5h16M11 14V9h4v2h5V9h5v2h5V9h4v5" stroke="#fff"/></g></svg>`,
  bB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" stroke="#fff"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" stroke="#fff"/><circle cx="22.5" cy="8" r="2.5" stroke="#fff"/></g></svg>`,
  bN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.38 5.12-2.18 2-4 4M9.5 11.5A4.5 4.5 0 0 1 9.5 7a4.5 4.5 0 0 1 0 4.5z" stroke="#fff"/><path d="M14.5 30c-.17-4.9 5.33-7.37 5.5-12.17M24.5 18c4 6.5 8 2 8 12.5" stroke="#fff"/></g></svg>`,
  bP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
}

const FILES = ['a','b','c','d','e','f','g','h']
const RANKS = ['8','7','6','5','4','3','2','1']

export default function ChessBoard({ chess, orientation, onMove, isMyTurn, lastMove, size = 480 }: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null)

  const dests = buildDests(chess)
  const sqSize = size / 8

  const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse()
  const displayRanks = orientation === 'white' ? RANKS : [...RANKS].reverse()

  function handleClick(sq: Square) {
    if (!isMyTurn) return

    if (selected) {
      const moves = dests.get(selected)
      if (moves?.includes(sq)) {
        const promo = needsPromotion(chess, selected, sq)
        onMove(selected, sq, promo ? 'q' : undefined)
        setSelected(null)
        return
      }
    }
    setSelected(dests.has(sq) ? sq : null)
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, userSelect: 'none' }}>
      {displayRanks.map((rank, ri) =>
        displayFiles.map((file, fi) => {
          const sq = (file + rank) as Square
          const fileIdx = FILES.indexOf(file)
          const rankIdx = parseInt(rank)
          const isLight = (fileIdx + rankIdx) % 2 === 1
          const piece = chess.get(sq)
          const pieceKey = piece ? piece.color + piece.type.toUpperCase() : null
          const isSel = selected === sq
          const isDest = !!selected && !!dests.get(selected)?.includes(sq)
          const isLast = !!lastMove && (lastMove.from === sq || lastMove.to === sq)

          let bg = isLight ? '#f0f0f0' : '#1a1a1a'
          if (isLast) bg = isLight ? '#c8c050' : '#7a7020'
          if (isSel)  bg = '#c0392b'

          return (
            <div
              key={sq}
              onClick={() => handleClick(sq)}
              style={{
                position: 'absolute',
                left: fi * sqSize,
                top: ri * sqSize,
                width: sqSize,
                height: sqSize,
                background: bg,
                cursor: isMyTurn ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              {/* Move destination dot */}
              {isDest && !piece && (
                <div style={{
                  width: '33%', height: '33%',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                }} />
              )}
              {isDest && piece && (
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '4px solid rgba(0,0,0,0.35)',
                  borderRadius: 0,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }} />
              )}
              {/* Piece */}
              {pieceKey && PIECES[pieceKey] && (
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(PIECES[pieceKey])}`}
                  width={sqSize * 0.85}
                  height={sqSize * 0.85}
                  alt=""
                  draggable={false}
                  style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function needsPromotion(chess: Chess, from: Square, to: Square): boolean {
  const piece = chess.get(from)
  if (!piece || piece.type !== 'p') return false
  return (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')
}
