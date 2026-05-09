import type { BotDefinition } from '@/types'

export const BOTS: BotDefinition[] = [
  {
    level: 1,
    name: 'ROOKIE',
    skillLevel: 0,
    eloEstimate: 600,
    blurb: 'Learned the rules yesterday. Panics immediately.',
    panicBehavior: 'instant_panic',
  },
  {
    level: 2,
    name: 'AMATEUR',
    skillLevel: 3,
    eloEstimate: 900,
    blurb: 'Plays passably until things fall apart.',
    panicBehavior: 'material_panic',
  },
  {
    level: 3,
    name: 'CLUB PLAYER',
    skillLevel: 6,
    eloEstimate: 1200,
    blurb: 'Steady. Methodical. Blunders occasionally.',
    panicBehavior: 'blunder_spike',
  },
  {
    level: 4,
    name: 'TOURNAMENT',
    skillLevel: 9,
    eloEstimate: 1600,
    blurb: 'Has a rating. Uses it to intimidate you.',
    panicBehavior: 'flat_flicker',
  },
  {
    level: 5,
    name: 'EXPERT',
    skillLevel: 12,
    eloEstimate: 1900,
    blurb: 'An iceberg. You only see the surface.',
    panicBehavior: 'iceberg',
  },
  {
    level: 6,
    name: 'MASTER',
    skillLevel: 15,
    eloEstimate: 2200,
    blurb: 'Imperceptibly calm. Deeply dangerous.',
    panicBehavior: 'intimidating',
  },
  {
    level: 7,
    name: 'GRANDMASTER',
    skillLevel: 18,
    eloEstimate: 2500,
    blurb: 'The meter never moves. That is the tell.',
    panicBehavior: 'ghost',
  },
  {
    level: 8,
    name: 'THE MACHINE',
    skillLevel: 20,
    eloEstimate: 3200,
    blurb: "don't.",
    panicBehavior: 'flatline',
  },
]

/**
 * Compute fake panic index for a bot based on its personality and game state.
 * This is entirely theatrical — the bot has no real HR signal.
 */
export function botPanicIndex(
  bot: BotDefinition,
  moveNumber: number,
  materialBalance: number,   // positive = bot is winning
  lastMoveWasBlunder: boolean
): number {
  const t = Math.min(moveNumber / 40, 1)  // normalized game progress 0→1

  switch (bot.panicBehavior) {
    case 'instant_panic': {
      // Ramps to 0.9 by move 5, stays high with noise
      const base = Math.min(0.9, moveNumber * 0.18)
      return clamp(base + noise(0.1))
    }

    case 'material_panic': {
      // Responds to material loss
      const loss = Math.max(0, -materialBalance)  // 0 when ahead, positive when behind
      const base = clamp(loss * 0.15)
      return clamp(base + noise(0.08))
    }

    case 'blunder_spike': {
      if (lastMoveWasBlunder) return clamp(0.7 + noise(0.1))
      return clamp(0.05 + noise(0.06))
    }

    case 'flat_flicker': {
      // Almost flat, small occasional flickers
      const spike = Math.random() < 0.05 ? 0.25 : 0
      return clamp(0.04 + spike + noise(0.03))
    }

    case 'iceberg': {
      // Completely flat until the last 10 moves, then sudden resignation without a spike
      if (moveNumber > 35) return 0
      return clamp(0.02 + noise(0.02))
    }

    case 'intimidating': {
      // Imperceptibly low — just enough to show it's not dead
      return clamp(0.015 + noise(0.015))
    }

    case 'ghost': {
      // Never above 0.1, just a ghost signal
      return clamp(0.05 * Math.sin(t * Math.PI) + noise(0.02))
    }

    case 'flatline':
    default:
      return 0
  }
}

function noise(amplitude: number): number {
  return (Math.random() * 2 - 1) * amplitude
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

// ─── Stockfish Worker Manager ─────────────────────────────────────────────────

type MoveCallback = (bestMove: string) => void

export class StockfishEngine {
  private worker: Worker | null = null
  private ready = false
  private queue: string[] = []
  private callbacks = new Map<string, MoveCallback>()

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.worker = new Worker('/stockfish/stockfish-worker.js')
      this.worker.onmessage = (e: MessageEvent<string>) => {
        const msg = typeof e.data === 'string' ? e.data : String(e.data)
        if (msg === 'readyok' || msg.startsWith('Stockfish')) {
          this.ready = true
          resolve()
          return
        }
        if (msg.startsWith('bestmove')) {
          const parts = msg.split(' ')
          const move = parts[1]
          if (move && move !== '(none)') {
            this.callbacks.forEach(cb => cb(move))
            this.callbacks.clear()
          }
        }
      }
      this.worker.onerror = reject
      this.send('uci')
      this.send('isready')
    })
  }

  private send(cmd: string): void {
    if (this.worker) this.worker.postMessage(cmd)
  }

  setSkillLevel(level: number): void {
    this.send('setoption name Skill Level value ' + level)
    // For levels below 5, also reduce Threads and Hash for weaker play
    if (level <= 5) {
      this.send('setoption name Threads value 1')
    }
  }

  getBestMove(fen: string, movetime = 1500, onMove: MoveCallback): void {
    this.callbacks.set('pending', onMove)
    this.send('position fen ' + fen)
    this.send('go movetime ' + movetime)
  }

  stop(): void {
    this.send('stop')
  }

  terminate(): void {
    this.worker?.terminate()
    this.worker = null
  }
}
