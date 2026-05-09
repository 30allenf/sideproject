import {
  ref,
  set,
  update,
  get,
  push,
  onValue,
  off,
  remove,
  serverTimestamp,
  onDisconnect,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database'
import { rtdb } from './client'
import type { LiveGame, LivePanicState, LobbyEntry, PresenceRecord, GameMove } from '@/types'

// ─── Live Game ────────────────────────────────────────────────────────────────

export async function createLiveGame(gameId: string, game: Omit<LiveGame, never>): Promise<void> {
  await set(ref(rtdb, `games/${gameId}`), game)
}

export async function getLiveGame(gameId: string): Promise<LiveGame | null> {
  const snap = await get(ref(rtdb, `games/${gameId}`))
  return snap.exists() ? (snap.val() as LiveGame) : null
}

export function subscribeLiveGame(gameId: string, cb: (game: LiveGame) => void): () => void {
  const r = ref(rtdb, `games/${gameId}`)
  onValue(r, snap => { if (snap.exists()) cb(snap.val() as LiveGame) })
  return () => off(r)
}

export async function pushMove(gameId: string, move: GameMove): Promise<void> {
  const movesRef = ref(rtdb, `games/${gameId}/moves`)
  await push(movesRef, move)
}

export async function updateGameStatus(
  gameId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  await update(ref(rtdb, `games/${gameId}`), { status, ...extra })
}

export async function updateClocks(
  gameId: string,
  white: number,
  black: number,
  activeColor: 'white' | 'black'
): Promise<void> {
  await update(ref(rtdb, `games/${gameId}/clocks`), {
    white,
    black,
    activeColor,
    lastSyncAt: Date.now(),
  })
}

export async function setPlayerReady(
  gameId: string,
  color: 'white' | 'black',
  hasCamera: boolean
): Promise<void> {
  await update(ref(rtdb, `games/${gameId}/players/${color}`), { ready: true, hasCamera })
}

export async function offerDraw(gameId: string, color: 'white' | 'black'): Promise<void> {
  await update(ref(rtdb, `games/${gameId}`), { drawOffer: color })
}

export async function clearDrawOffer(gameId: string): Promise<void> {
  await update(ref(rtdb, `games/${gameId}`), { drawOffer: null })
}

// ─── Panic Sync ───────────────────────────────────────────────────────────────

export async function pushPanicIndex(
  gameId: string,
  color: 'white' | 'black',
  state: LivePanicState
): Promise<void> {
  await update(ref(rtdb, `games/${gameId}/panic/${color}`), state)
}

export function subscribePanic(
  gameId: string,
  color: 'white' | 'black',
  cb: (state: LivePanicState) => void
): () => void {
  const r = ref(rtdb, `games/${gameId}/panic/${color}`)
  onValue(r, snap => { if (snap.exists()) cb(snap.val() as LivePanicState) })
  return () => off(r)
}

// ─── Presence ────────────────────────────────────────────────────────────────

export function setPresence(uid: string, currentGameId: string | null = null): () => void {
  const presenceRef = ref(rtdb, `presence/${uid}`)
  const record: PresenceRecord = { online: true, currentGameId, lastSeen: Date.now() }
  set(presenceRef, record)

  // Auto-offline on disconnect
  onDisconnect(presenceRef).update({ online: false, lastSeen: Date.now() })

  return () => {
    update(presenceRef, { online: false, lastSeen: Date.now() })
    onDisconnect(presenceRef).cancel()
  }
}

export function subscribePresence(
  uids: string[],
  cb: (presence: Record<string, PresenceRecord>) => void
): () => void {
  const cleanups: (() => void)[] = []
  const state: Record<string, PresenceRecord> = {}

  for (const uid of uids) {
    const r = ref(rtdb, `presence/${uid}`)
    onValue(r, snap => {
      state[uid] = snap.exists()
        ? (snap.val() as PresenceRecord)
        : { online: false, currentGameId: null, lastSeen: 0 }
      cb({ ...state })
    })
    cleanups.push(() => off(r))
  }

  return () => cleanups.forEach(fn => fn())
}

// ─── Matchmaking Lobby ────────────────────────────────────────────────────────

export async function joinLobby(uid: string, entry: LobbyEntry): Promise<void> {
  await set(ref(rtdb, `lobby/${entry.timeControl}/${uid}`), entry)
  onDisconnect(ref(rtdb, `lobby/${entry.timeControl}/${uid}`)).remove()
}

export async function leaveLobby(uid: string, timeControl: string): Promise<void> {
  await remove(ref(rtdb, `lobby/${timeControl}/${uid}`))
}

export function subscribeLobby(
  timeControl: string,
  cb: (entries: LobbyEntry[]) => void
): () => void {
  const r = ref(rtdb, `lobby/${timeControl}`)
  onValue(r, snap => {
    const data = snap.val() as Record<string, LobbyEntry> | null
    cb(data ? Object.values(data) : [])
  })
  return () => off(r)
}

// ─── Game Room Signaling ──────────────────────────────────────────────────────

export async function createGameRoom(
  gameId: string,
  creatorUid: string,
  timeControl: string,
  increment: number
): Promise<void> {
  await set(ref(rtdb, `rooms/${gameId}`), {
    creator: creatorUid,
    timeControl,
    increment,
    createdAt: Date.now(),
    opponentUid: null,
  })
  onDisconnect(ref(rtdb, `rooms/${gameId}`)).remove()
}

export async function joinGameRoom(gameId: string, opponentUid: string): Promise<void> {
  await update(ref(rtdb, `rooms/${gameId}`), { opponentUid })
}

export function subscribeGameRoom(
  gameId: string,
  cb: (room: { creator: string; opponentUid: string | null; timeControl: string; increment: number }) => void
): () => void {
  const r = ref(rtdb, `rooms/${gameId}`)
  onValue(r, snap => { if (snap.exists()) cb(snap.val()) })
  return () => off(r)
}
