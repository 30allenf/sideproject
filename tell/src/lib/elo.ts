/**
 * ELO rating system with K-factor scaling.
 * K = 40 for new players (<30 games), 20 standard, 10 for established (>2000 Elo)
 */

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function kFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40
  if (rating >= 2000)   return 10
  return 20
}

export interface EloUpdate {
  newRating: number
  delta: number
}

export function computeEloUpdate(
  rating: number,
  opponentRating: number,
  result: 1 | 0.5 | 0,   // 1 = win, 0.5 = draw, 0 = loss
  gamesPlayed = 30
): EloUpdate {
  const K = kFactor(rating, gamesPlayed)
  const expected = expectedScore(rating, opponentRating)
  const delta = Math.round(K * (result - expected))
  return {
    newRating: Math.max(100, rating + delta),
    delta,
  }
}

/** Map a TimeControl string to the ELO category */
export function timeControlToCategory(tc: string): 'bullet' | 'blitz' | 'rapid' {
  if (tc === 'bullet')                        return 'bullet'
  if (tc.startsWith('blitz'))                 return 'blitz'
  return 'rapid'
}

/** Initial ELO for all new players */
export const INITIAL_ELO = 1200
