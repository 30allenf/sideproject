import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import type { GameMove, TimeControl } from '@/types'

/** Build chessground-compatible legal moves map from a Chess.js instance */
export function buildDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  for (const move of chess.moves({ verbose: true })) {
    const frm = move.from as Key
    const to  = move.to  as Key
    const arr = dests.get(frm) ?? []
    arr.push(to)
    dests.set(frm, arr)
  }
  return dests
}

/** Convert chess.js color ('w'/'b') to game color */
export function toGameColor(c: 'w' | 'b'): 'white' | 'black' {
  return c === 'w' ? 'white' : 'black'
}

/** Convert game color to chess.js color */
export function toChessColor(c: 'white' | 'black'): 'w' | 'b' {
  return c === 'white' ? 'w' : 'b'
}

/** Flip game color */
export function opposite(c: 'white' | 'black'): 'white' | 'black' {
  return c === 'white' ? 'black' : 'white'
}

/** Returns material balance in centipawns from white's perspective */
export function materialBalance(fen: string): number {
  const pieceValues: Record<string, number> = {
    p: -100, n: -320, b: -330, r: -500, q: -900,
    P:  100, N:  320, B:  330, R:  500, Q:  900,
  }
  const board = fen.split(' ')[0]
  let balance = 0
  for (const ch of board) {
    balance += pieceValues[ch] ?? 0
  }
  return balance
}

/** Time controls and their initial clocks (ms) + increment (ms) */
export const TIME_CONTROLS: Record<TimeControl, { initial: number; increment: number }> = {
  'bullet':   { initial: 2 * 60 * 1000, increment: 1000 },
  'blitz5+0': { initial: 5 * 60 * 1000, increment: 0 },
  'blitz5+3': { initial: 5 * 60 * 1000, increment: 3000 },
  'rapid':    { initial: 15 * 60 * 1000, increment: 10000 },
  'custom':   { initial: 5 * 60 * 1000, increment: 0 },
}

export function formatClock(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000))
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}`
  const centis = Math.max(0, Math.floor(ms / 100) % 10)
  return `0:${String(secs).padStart(2, '0')}.${centis}`
}

export function timeControlLabel(tc: TimeControl): string {
  const labels: Record<TimeControl, string> = {
    'bullet':   'Bullet  2+1',
    'blitz5+0': 'Blitz   5+0',
    'blitz5+3': 'Blitz   5+3',
    'rapid':    'Rapid  15+10',
    'custom':   'Custom',
  }
  return labels[tc]
}

/** Build a GameMove record */
export function buildMove(
  san: string,
  fen: string,
  from: string,
  to: string,
  promotion: string | undefined,
  panicWhite: number,
  panicBlack: number
): GameMove {
  return {
    san,
    fen,
    from,
    to,
    promotion,
    timestamp: Date.now(),
    panicSnapshot: { white: panicWhite, black: panicBlack },
  }
}

/** Rebuild a Chess.js game from a PGN string */
export function chessFromPgn(pgn: string): Chess {
  const chess = new Chess()
  chess.loadPgn(pgn)
  return chess
}

/** Check if the game is over and return the result */
export function getGameOver(chess: Chess): {
  over: boolean
  status: string
  winner: 'white' | 'black' | 'draw' | null
} {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'black' : 'white'
    return { over: true, status: 'checkmate', winner }
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return { over: true, status: chess.isStalemate() ? 'stalemate' : 'draw', winner: 'draw' }
  }
  return { over: false, status: 'active', winner: null }
}

/** Generate a random game ID */
export function generateGameId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}
