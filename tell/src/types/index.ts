// ─── User & Auth ─────────────────────────────────────────────────────────────

export type TimeControl = 'bullet' | 'blitz5+0' | 'blitz5+3' | 'rapid' | 'custom'

export interface EloRatings {
  bullet: number
  blitz: number
  rapid: number
}

export interface UserStats {
  wins: number
  losses: number
  draws: number
  totalPanicDealt: number   // sum of opponent panic_index at moment of resignation
  avgGameLength: number     // seconds
}

export interface UserProfile {
  uid: string
  username: string
  displayName: string
  photoURL: string | null
  email: string
  elo: EloRatings
  stats: UserStats
  friends: string[]         // array of uids
  createdAt: number
  onlineAt?: number
}

export interface FriendRequest {
  id: string
  from: string              // uid
  fromUsername: string
  to: string                // uid
  status: 'pending' | 'accepted' | 'declined'
  createdAt: number
}

// ─── Game ────────────────────────────────────────────────────────────────────

export type GameStatus =
  | 'waiting'
  | 'calibrating'
  | 'active'
  | 'checkmate'
  | 'resignation'
  | 'draw_agreement'
  | 'stalemate'
  | 'timeout'
  | 'abandoned'
  | 'aborted'

export type GameColor = 'white' | 'black'

export interface GamePlayer {
  uid: string
  username: string
  color: GameColor
  eloAtStart: number
  eloDelta?: number
  timeRemaining: number   // ms
  lastMoveAt?: number
  hasCamera: boolean
}

export interface LivePanicState {
  index: number           // 0–1
  updatedAt: number       // server timestamp
  bluffing: boolean
  frozenIndex?: number    // when bluffing, show this value
}

export interface GameMove {
  san: string
  fen: string
  from: string
  to: string
  promotion?: string
  timestamp: number
  panicSnapshot: { white: number; black: number }
}

export interface GameRecord {
  id: string
  players: { white: GamePlayer; black: GamePlayer }
  moves: GameMove[]
  pgn: string
  result: 'white' | 'black' | 'draw' | null
  status: GameStatus
  timeControl: TimeControl
  increment: number
  vsBot: boolean
  botLevel?: number
  panicHistory: {
    timestamps: number[]
    white: number[]
    black: number[]
  }
  createdAt: number
  endedAt?: number
}

// ─── Live Game (Realtime DB) ─────────────────────────────────────────────────

export interface LiveGame {
  status: GameStatus
  fen: string
  moves: GameMove[]
  clocks: {
    white: number   // ms remaining
    black: number
    lastSyncAt: number
    activeColor: GameColor
  }
  players: {
    white: { uid: string; username: string; hasCamera: boolean; ready: boolean }
    black: { uid: string; username: string; hasCamera: boolean; ready: boolean }
  }
  panic: {
    white: LivePanicState
    black: LivePanicState
  }
  drawOffer: null | GameColor   // which color offered draw
  timeControl: TimeControl
  increment: number
  vsBot: boolean
  botLevel?: number
  createdAt: number
}

// ─── Matchmaking ─────────────────────────────────────────────────────────────

export interface LobbyEntry {
  uid: string
  username: string
  elo: number
  timeControl: TimeControl
  increment: number
  joinedAt: number
}

export interface Challenge {
  id: string
  from: string
  fromUsername: string
  to: string
  timeControl: TimeControl
  increment: number
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  gameId?: string
  createdAt: number
}

// ─── rPPG ────────────────────────────────────────────────────────────────────

export interface RPPGResult {
  bpm: number
  smoothedBpm: number
  panicIndex: number
  timestamp: number
  quality: 'good' | 'poor' | 'lost'
}

export interface RPPGCalibration {
  baselineBpm: number
  calibratedAt: number
}

export interface RoiSample {
  r: number
  g: number
  b: number
  timestamp: number
}

// ─── Bots ────────────────────────────────────────────────────────────────────

export interface BotDefinition {
  level: number
  name: string
  skillLevel: number      // Stockfish skill (0–20)
  eloEstimate: number
  blurb: string
  panicBehavior: 'instant_panic' | 'material_panic' | 'blunder_spike' | 'flat_flicker' | 'iceberg' | 'intimidating' | 'ghost' | 'flatline'
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceRecord {
  online: boolean
  currentGameId: string | null
  lastSeen: number
}
