'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'
import { getLiveGame } from '@/lib/firebase/realtime'
import { toGameColor, getGameOver, opposite } from '@/lib/chess/game'
import type { LiveGame } from '@/types'

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
  gameId, myColor, myPanic: _myPanic, opponentPanic: _opponentPanic, isBot, getBotMove
}: UseGameOptions): UseGameReturn {
  const [chess]    = useState(() => new Chess())
  const [liveGame, setLiveGame] = useState<LiveGame | null>(null)
  const [clockWhite, setClockWhite] = useState(0)
  const [clockBlack, setClockBlack] = useState(0)
  const [moveCount, setMoveCount] = useState(0)   // incremented to force re-renders after moves
  const [gameOver, setGameOver] = useState<{
    over: boolean; status: string; winner: 'white' | 'black' | 'draw' | null
  }>({ over: false, status: 'active', winner: null })

  const clockActiveRef = useRef<'white' | 'black'>('white')

  useEffect(() => {
    if (!gameId) return
    getLiveGame(gameId).then(game => {
      if (!game) return
      setLiveGame(game)
      setClockWhite(game.clocks.white)
      setClockBlack(game.clocks.black)
      clockActiveRef.current = game.clocks.activeColor
    })
  }, [gameId])

  // Clock tick
  useEffect(() => {
    if (!liveGame || gameOver.over) return
    const interval = setInterval(() => {
      if (clockActiveRef.current === 'white') {
        setClockWhite(v => Math.max(0, v - 50))
      } else {
        setClockBlack(v => Math.max(0, v - 50))
      }
    }, 50)
    return () => clearInterval(interval)
  }, [liveGame, gameOver.over])

  const isMyTurn = toGameColor(chess.turn()) === myColor && !gameOver.over

  const makeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (!isMyTurn) return false
    try {
      const result = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined })
      if (!result) return false
      clockActiveRef.current = toGameColor(chess.turn())
      setMoveCount(c => c + 1)   // force re-render so board updates
      const over = getGameOver(chess)
      if (over.over) setGameOver(over)
      return true
    } catch {
      return false
    }
  }, [isMyTurn, chess])

  // Bot move — fires when it's bot's turn after a re-render
  useEffect(() => {
    if (!isBot || !getBotMove || !liveGame || gameOver.over) return
    const botColor = opposite(myColor)
    if (toGameColor(chess.turn()) !== botColor) return

    const timeout = setTimeout(() => {
      getBotMove(chess.fen(), (bestMove) => {
        if (bestMove.length < 4 || gameOver.over) return
        const from  = bestMove.slice(0, 2)
        const to    = bestMove.slice(2, 4)
        const promo = bestMove.length === 5 ? bestMove[4] : undefined
        try {
          chess.move({ from, to, promotion: promo as 'q' | 'r' | 'b' | 'n' | undefined })
          clockActiveRef.current = toGameColor(chess.turn())
          setMoveCount(c => c + 1)   // force re-render
          const over = getGameOver(chess)
          if (over.over) setGameOver(over)
        } catch { /* invalid bot move */ }
      })
    }, 300 + Math.random() * 700)

    return () => clearTimeout(timeout)
  }, [liveGame, moveCount, isBot, getBotMove, myColor, gameOver])

  const resign = useCallback(() => {
    setGameOver({ over: true, status: 'resignation', winner: opposite(myColor) })
  }, [myColor])

  const offerDrawFn  = useCallback(() => {}, [])
  const acceptDraw   = useCallback(() => {
    setGameOver({ over: true, status: 'draw_agreement', winner: 'draw' })
  }, [])
  const declineDraw  = useCallback(() => {}, [])
  const abort        = useCallback(() => {
    if (chess.history().length <= 2) {
      setGameOver({ over: true, status: 'aborted', winner: null })
    }
  }, [chess])

  return {
    chess, liveGame, isMyTurn, makeMove, resign, offerDrawFn,
    acceptDraw, declineDraw, abort, clockWhite, clockBlack, gameOver,
  }
}
