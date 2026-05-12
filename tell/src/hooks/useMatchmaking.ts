'use client'

// Matchmaking removed — bot games only
export function useMatchmaking() {
  return { status: 'idle' as const, startSearch: () => {}, cancelSearch: () => {} }
}
