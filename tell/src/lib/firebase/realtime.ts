// Firebase removed — game state stored in localStorage, no real-time sync
import type { LiveGame, LivePanicState, GameMove } from '@/types'

export async function createLiveGame(gameId: string, game: LiveGame): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`tell_game_${gameId}`, JSON.stringify(game))
  }
}

export async function getLiveGame(gameId: string): Promise<LiveGame | null> {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(`tell_game_${gameId}`)
  return raw ? JSON.parse(raw) : null
}

export function subscribeLiveGame(gameId: string, cb: (game: LiveGame) => void): () => void {
  // One-shot: read from localStorage once
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`tell_game_${gameId}`)
    if (raw) setTimeout(() => cb(JSON.parse(raw)), 0)
  }
  return () => {}
}

export async function pushMove(gameId: string, move: GameMove): Promise<void> {
  const raw = localStorage.getItem(`tell_game_${gameId}`)
  if (!raw) return
  const game: LiveGame = JSON.parse(raw)
  const moves = Array.isArray(game.moves) ? game.moves : []
  moves.push(move)
  localStorage.setItem(`tell_game_${gameId}`, JSON.stringify({ ...game, moves }))
}

export async function updateClocks(
  gameId: string, white: number, black: number, activeColor: 'white' | 'black'
): Promise<void> {
  const raw = localStorage.getItem(`tell_game_${gameId}`)
  if (!raw) return
  const game: LiveGame = JSON.parse(raw)
  localStorage.setItem(`tell_game_${gameId}`, JSON.stringify({
    ...game,
    clocks: { ...game.clocks, white, black, activeColor, lastSyncAt: Date.now() },
  }))
}

export async function updateGameStatus(
  gameId: string, status: string, extra?: { result?: string | null }
): Promise<void> {
  const raw = localStorage.getItem(`tell_game_${gameId}`)
  if (!raw) return
  const game: LiveGame = JSON.parse(raw)
  localStorage.setItem(`tell_game_${gameId}`, JSON.stringify({ ...game, status, ...extra }))
}

export async function setPlayerReady(
  _gameId: string, _color: string, _hasCamera: boolean
): Promise<void> {}

export async function offerDraw(_gameId: string, _color: string): Promise<void> {}
export async function clearDrawOffer(_gameId: string): Promise<void> {}

export async function pushPanicIndex(
  _gameId: string, _color: string, _state: LivePanicState
): Promise<void> {}

export function subscribePanic(
  _gameId: string, _color: string, _cb: (state: LivePanicState) => void
): () => void { return () => {} }

export function setPresence(_uid: string, _gameId: string | null): () => void { return () => {} }
export function subscribePresence(_uids: string[], _cb: (p: Record<string, unknown>) => void) { return () => {} }

export async function joinLobby(_uid: string, _entry: unknown): Promise<void> {}
export async function leaveLobby(_uid: string): Promise<void> {}
export function subscribeLobby(_cb: (entries: unknown[]) => void) { return () => {} }
