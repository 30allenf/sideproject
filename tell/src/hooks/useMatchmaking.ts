'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { joinLobby, leaveLobby, subscribeLobby, createGameRoom } from '@/lib/firebase/realtime'
import { createLiveGame } from '@/lib/firebase/realtime'
import { generateGameId } from '@/lib/chess/game'
import { TIME_CONTROLS } from '@/lib/chess/game'
import type { LobbyEntry, TimeControl, LiveGame } from '@/types'
import type { UserProfile } from '@/types'

interface UseMatchmakingOptions {
  profile: UserProfile
  onMatchFound: (gameId: string, color: 'white' | 'black') => void
}

export function useMatchmaking({ profile, onMatchFound }: UseMatchmakingOptions) {
  const [inQueue, setInQueue]           = useState(false)
  const [timeControl, setTimeControl]   = useState<TimeControl>('blitz5+0')
  const [queueTime, setQueueTime]       = useState(0)

  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unsubRef      = useRef<(() => void) | null>(null)

  const joinQueue = useCallback(async (tc: TimeControl) => {
    setTimeControl(tc)
    setInQueue(true)
    setQueueTime(0)

    const entry: LobbyEntry = {
      uid: profile.uid,
      username: profile.username,
      elo: profile.elo.blitz,
      timeControl: tc,
      increment: TIME_CONTROLS[tc].increment,
      joinedAt: Date.now(),
    }
    await joinLobby(profile.uid, entry)

    queueTimerRef.current = setInterval(() => setQueueTime(t => t + 1), 1000)

    // Watch lobby for a matching opponent
    let eloWindow = 150
    const checkMatch = () => {
      unsubRef.current?.()
      unsubRef.current = subscribeLobby(tc, async (entries) => {
        const myElo = profile.elo.blitz
        const candidates = entries.filter(e =>
          e.uid !== profile.uid &&
          Math.abs(e.elo - myElo) <= eloWindow
        )
        if (!candidates.length) return

        // First in queue wins — the higher UID lexicographically initiates
        const opponent = candidates[0]
        if (profile.uid < opponent.uid) return  // let the other person initiate

        // We're the initiator — create the game
        const gameId = generateGameId()
        const myColor: 'white' | 'black' = Math.random() < 0.5 ? 'white' : 'black'
        const oppColor = myColor === 'white' ? 'black' : 'white'
        const tc_settings = TIME_CONTROLS[tc]

        const liveGame: LiveGame = {
          status: 'waiting',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: [],
          clocks: {
            white: tc_settings.initial,
            black: tc_settings.initial,
            lastSyncAt: Date.now(),
            activeColor: 'white',
          },
          players: {
            [myColor]: { uid: profile.uid, username: profile.username, hasCamera: false, ready: false },
            [oppColor]: { uid: opponent.uid, username: opponent.username, hasCamera: false, ready: false },
          } as LiveGame['players'],
          panic: {
            white: { index: 0, updatedAt: Date.now(), bluffing: false },
            black: { index: 0, updatedAt: Date.now(), bluffing: false },
          },
          drawOffer: null,
          timeControl: tc,
          increment: tc_settings.increment,
          vsBot: false,
          createdAt: Date.now(),
        }

        await createLiveGame(gameId, liveGame)
        await leaveLobby(profile.uid, tc)
        await leaveLobby(opponent.uid, tc)

        leaveQueue()
        onMatchFound(gameId, myColor)
      })
    }

    checkMatch()

    // Widen ELO window at 30s
    setTimeout(() => { eloWindow = 300; checkMatch() }, 30000)
  }, [profile, onMatchFound])

  const leaveQueue = useCallback(() => {
    setInQueue(false)
    setQueueTime(0)
    if (queueTimerRef.current) { clearInterval(queueTimerRef.current); queueTimerRef.current = null }
    unsubRef.current?.()
    leaveLobby(profile.uid, timeControl)
  }, [profile.uid, timeControl])

  useEffect(() => () => leaveQueue(), [])

  return { inQueue, queueTime, timeControl, joinQueue, leaveQueue, setTimeControl }
}
