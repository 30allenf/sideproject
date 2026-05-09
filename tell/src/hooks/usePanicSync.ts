'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { pushPanicIndex, subscribePanic } from '@/lib/firebase/realtime'
import type { LivePanicState } from '@/types'

interface UsePanicSyncOptions {
  gameId: string
  myColor: 'white' | 'black'
  enabled: boolean
}

interface UsePanicSyncReturn {
  myPanic: number
  opponentPanic: number
  opponentHasSignal: boolean
  pushMyPanic: (index: number, bluffing: boolean) => void
}

export function usePanicSync({ gameId, myColor, enabled }: UsePanicSyncOptions): UsePanicSyncReturn {
  const [opponentPanic, setOpponentPanic]     = useState(0)
  const [opponentHasSignal, setOpponentSig]   = useState(true)
  const myPanicRef = useRef(0)

  const opponentColor = myColor === 'white' ? 'black' : 'white'

  // Subscribe to opponent's panic stream
  useEffect(() => {
    if (!enabled || !gameId) return
    const unsub = subscribePanic(gameId, opponentColor, (state) => {
      const staleness = Date.now() - state.updatedAt
      if (staleness > 5000) {
        setOpponentSig(false)
        return
      }
      setOpponentSig(true)
      const displayed = state.bluffing && state.frozenIndex != null
        ? state.frozenIndex
        : state.index
      setOpponentPanic(displayed)
    })
    return unsub
  }, [enabled, gameId, opponentColor])

  // Push my own panic every 500ms (debounced by the caller updating myPanicRef)
  useEffect(() => {
    if (!enabled || !gameId) return
    const interval = setInterval(() => {
      pushPanicIndex(gameId, myColor, {
        index: myPanicRef.current,
        updatedAt: Date.now(),
        bluffing: false,
      })
    }, 500)
    return () => clearInterval(interval)
  }, [enabled, gameId, myColor])

  const pushMyPanic = useCallback((index: number, bluffing: boolean) => {
    myPanicRef.current = index
    pushPanicIndex(gameId, myColor, {
      index,
      updatedAt: Date.now(),
      bluffing,
      frozenIndex: bluffing ? index : undefined,
    })
  }, [gameId, myColor])

  return {
    myPanic: myPanicRef.current,
    opponentPanic,
    opponentHasSignal,
    pushMyPanic,
  }
}
