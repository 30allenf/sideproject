'use client'

import { useCallback } from 'react'

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

// No-op: panic sync is local-only; bot panic is driven by botPanicIndex() in the game page
export function usePanicSync(_opts: UsePanicSyncOptions): UsePanicSyncReturn {
  const pushMyPanic = useCallback((_index: number, _bluffing: boolean) => {}, [])
  return { myPanic: 0, opponentPanic: 0, opponentHasSignal: true, pushMyPanic }
}
