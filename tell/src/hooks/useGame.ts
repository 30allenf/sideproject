'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'
import {
  subscribeLiveGame,
  updateGameStatus,
  pushMove,
  updateClocks,
  offerDraw,
  clearDrawOffer,
  setPlayerReady,
} from '@/lib/firebase/realtime'
import { buildDests, toGameColor, getGameOver, buildMove, opposite } from '@/lib/chess/game'
import { TIME_CONTROLS } from '@/lib/chess/game'
import type { LiveGame, GameMove, TimeControl } from '@/types'

interface UseGameOptions {
  gameId: string
  myColor: 'white' | 'black'
  myPanic: number
  opponentPanic: number
  isBot: boolean
  getBotMove?: (fen: string, cb: (move: string) => void) => void
}

interface UseGameReturn {
  chess: Chess
  liveGame: LiveGame | null
  isMyTurn: boolean
  makeMove: (from: string, to: string, promotion?: string) => boolean
  resign: () => void
  offerDrawFn: () => void
  acceptDraw: () => void
  declineDraw: () => void
  abort: () => void
  clockWhite: number
  clockBlack: number
  gameOver: { over: boolean; status: string; winner: 'white' | 'black' | 'draw' | null }
}

export function useGame({
  gameId, myColor, myPanic, opponentPanic, isBot, getBotMove
}: UseGameOptions): UseGameReturn {
  const [chess]     = useState(() => new Chess())
  const [liveGame, setLiveGame] = useState<LiveGame | null>(null)
  const [clockWhite, setClockWhite] = useState(0)
  const [clockBlack, setClockBlack] = useState(0)
  const [gameOver, setGameOver] = useState({ over: false, status: 'active', winner: null as 'white' | 'black' | 'draw' | null })

  const clockInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const movesProcessed = useRef<Set<string>>(new Set())

  // Subscribe to live game state
  useEffect(() => {
    if (!gameId) return
    const unsub = subscribeLiveGame(gameId, (game) => {
      setLiveGame(game)
      setClockWhite(game.clocks.white)
      setClockBlack(game.clocks.black)

      // Sync moves from Firebase into local chess instance
      if (game.moves) {
        const moves = Array.isArray(game.moves) ? game.moves : Object.values(game.moves) as GameMove[]
        for (const m of moves) {
          const key = m.from + m.to + (m.promotion ?? '')
          if (!movesProcessed.current.has(key)) {
            try {
              chess.move({ from: m.from, to: m.to, promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined })
              movesProcessed.current.add(key)
            } catch { /* already applied or invalid */ }
          }
        }
      }

      const over = getGameOver(chess)
      if (over.over) setGameOver(over)
    })
    return unsub
  }, [gameId, chess])

  // Client-side clock tick
  useEffect(() => {
    if (!liveGame || liveGame.status !== 'active') {
      if (clockInterval.current) clearInterval(clockInterval.current)
      return
    }

    clockInterval.current = setInterval(() => {
      const activeColor = liveGame.clocks.activeColor
      const elapsed = Date.now() - liveGame.clocks.lastSyncAt
      if (activeColor === 'white') {
        setClockWhite(v => Math.max(0, v - 50))
      } else {
        setClockBlack(v => Math.max(0, v - 50))
      }
    }, 50)

    return () => { if (clockInterval.current) clearInterval(clockInterval.current) }
  }, [liveGame])

  const isMyTurn = toGameColor(chess.turn()) === myColor && !gameOver.over

  const makeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (!isMyTurn) return false

    try {
      const result = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined })
      if (!result) return false

      const gm = buildMove(result.san, chess.fen(), from, to, promotion, myPanic, opponentPanic)
      movesProcessed.current.add(from + to + (promotion ?? ''))

      const newTurn = toGameColor(chess.turn())
      const increment = liveGame?.increment ?? 0
      const updatedWhite = myColor === 'white' ? clockWhite + increment : clockWhite
      const updatedBlack = myColor === 'black' ? clockBlack + increment : clockBlack

      pushMove(gameId, gm)
      updateClocks(gameId, updatedWhite, updatedBlack, newTurn)

      const over = getGameOver(chess)
      if (over.over) {
        updateGameStatus(gameId, over.status, { result: over.winner })
        setGameOver(over)
      }

      return true
    } catch {
      return false
    }
  }, [isMyTurn, chess, myPanic, opponentPanic, gameId, myColor, clockWhite, clockBlack, liveGame])

  // Bot move
  useEffect(() => {
    if (!isBot || !getBotMove || !liveGame || liveGame.status !== 'active') return
    const botColor = opposite(myColor)
    if (toGameColor(chess.turn()) !== botColor) return
    if (gameOver.over) return

    const timeout = setTimeout(() => {
      getBotMove(chess.fen(), (bestMove) => {
        if (bestMove.length < 4 || gameOver.over) return
        const from = bestMove.slice(0, 2)
        const to   = bestMove.slice(2, 4)
        const promo = bestMove.length === 5 ? bestMove[4] : undefined
        try {
          const result = chess.move({ from, to, promotion: promo as 'q' | 'r' | 'b' | 'n' | undefined })
          if (!result) return
          const gm = buildMove(result.san, chess.fen(), from, to, promo, opponentPanic, myPanic)
          movesProcessed.current.add(from + to + (promo ?? ''))
          pushMove(gameId, gm)
          updateClocks(gameId, clockWhite, clockBlack, toGameColor(chess.turn()))
          const over = getGameOver(chess)
          if (over.over) {
            updateGameStatus(gameId, over.status, { result: over.winner })
            setGameOver(over)
          }
        } catch { /* invalid bot move */ }
      })
    }, 300 + Math.random() * 700)  // slight human-feeling delay

    return () => clearTimeout(timeout)
  }, [liveGame, chess, isBot, getBotMove, myColor, gameOver, gameId, myPanic, opponentPanic, clockWhite, clockBlack])

  const resign = useCallback(() => {
    updateGameStatus(gameId, 'resignation', { result: opposite(myColor) })
    setGameOver({ over: true, status: 'resignation', winner: opposite(myColor) })
  }, [gameId, myColor])

  const offerDrawFn = useCallback(() => offerDraw(gameId, myColor), [gameId, myColor])
  const acceptDraw  = useCallback(() => {
    updateGameStatus(gameId, 'draw_agreement', { result: 'draw' })
    setGameOver({ over: true, status: 'draw_agreement', winner: 'draw' })
  }, [gameId])
  const declineDraw = useCallback(() => clearDrawOffer(gameId), [gameId])

  const abort = useCallback(() => {
    if (chess.history().length <= 2) {
      updateGameStatus(gameId, 'aborted')
      setGameOver({ over: true, status: 'aborted', winner: null })
    }
  }, [gameId, chess])

  return {
    chess, liveGame, isMyTurn, makeMove, resign, offerDrawFn,
    acceptDraw, declineDraw, abort, clockWhite, clockBlack, gameOver,
  }
}
