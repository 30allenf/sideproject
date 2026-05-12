'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BOTS } from '@/lib/bots'
import { generateGameId, TIME_CONTROLS } from '@/lib/chess/game'
import type { TimeControl, LiveGame, UserProfile } from '@/types'

interface BotSelectorProps {
  profile: UserProfile
}

const TIME_OPTIONS: { label: string; tc: TimeControl }[] = [
  { label: 'BULLET 2+1',  tc: 'bullet' },
  { label: 'BLITZ 5+0',   tc: 'blitz5+0' },
  { label: 'BLITZ 5+3',   tc: 'blitz5+3' },
  { label: 'RAPID 15+10', tc: 'rapid' },
]

export default function BotSelector({ profile }: BotSelectorProps) {
  const router = useRouter()
  const [selectedBot, setSelectedBot] = useState(BOTS[0])
  const [selectedTc, setSelectedTc]   = useState<TimeControl>('blitz5+0')
  const [loading, setLoading]          = useState(false)

  function startGame() {
    setLoading(true)
    const gameId    = generateGameId()
    const myColor: 'white' | 'black'  = Math.random() < 0.5 ? 'white' : 'black'
    const botColor: 'white' | 'black' = myColor === 'white' ? 'black' : 'white'
    const tc = TIME_CONTROLS[selectedTc]

    const game: LiveGame = {
      status: 'active',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      clocks: {
        white: tc.initial,
        black: tc.initial,
        lastSyncAt: Date.now(),
        activeColor: 'white',
      },
      players: {
        [myColor]:  { uid: profile.uid, username: profile.username, hasCamera: false, ready: true },
        [botColor]: { uid: `bot-${selectedBot.level}`, username: selectedBot.name, hasCamera: false, ready: true },
      } as LiveGame['players'],
      panic: {
        white: { index: 0, updatedAt: Date.now(), bluffing: false },
        black: { index: 0, updatedAt: Date.now(), bluffing: false },
      },
      drawOffer: null,
      timeControl: selectedTc,
      increment: tc.increment,
      vsBot: true,
      botLevel: selectedBot.level,
      createdAt: Date.now(),
    }

    localStorage.setItem(`tell_game_${gameId}`, JSON.stringify(game))
    router.push(`/game/${gameId}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="readout mb-2" style={{ color: 'var(--color-bone-dim)' }}>SELECT OPPONENT</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BOTS.map((bot, i) => {
            const isSelected = selectedBot.level === bot.level
            const isMachine  = bot.level === 8
            return (
              <motion.button
                key={bot.level}
                onClick={() => setSelectedBot(bot)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4 text-left transition-all cursor-pointer"
                style={{
                  borderColor: isSelected ? 'var(--color-crimson)' : 'var(--color-border)',
                  background:  isSelected ? 'rgba(192,57,43,0.1)' : 'var(--color-panel)',
                  boxShadow:   isSelected ? '0 0 20px var(--color-crimson-glow)' : 'none',
                }}
              >
                <div
                  className="font-display font-black tracking-widest uppercase mb-1"
                  style={{ fontSize: isMachine ? 18 : 16, color: isMachine ? 'var(--color-crimson)' : 'var(--color-bone)' }}
                >
                  {bot.name}
                </div>
                <div className="readout mb-2" style={{ fontSize: 10, color: 'var(--color-amber)' }}>
                  ~{bot.eloEstimate} ELO
                </div>
                <div
                  className="font-mono text-xs leading-relaxed"
                  style={{ color: isMachine ? 'var(--color-crimson)' : 'var(--color-bone-dim)' }}
                >
                  {bot.blurb}
                </div>
                {!isMachine && (
                  <div className="mt-3 flex gap-0.5 items-end h-4">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div
                        key={j}
                        className="flex-1"
                        style={{
                          height: `${panicBarHeight(bot.panicBehavior, j) * 100}%`,
                          background: 'var(--color-crimson)',
                          opacity: 0.6,
                          minHeight: 1,
                        }}
                      />
                    ))}
                  </div>
                )}
                {isMachine && <div className="mt-3 h-0.5 w-full" style={{ background: 'var(--color-muted)' }} />}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="readout mb-2" style={{ color: 'var(--color-bone-dim)' }}>TIME CONTROL</div>
        <div className="flex gap-3 flex-wrap">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.tc}
              onClick={() => setSelectedTc(opt.tc)}
              className={selectedTc === opt.tc ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-primary text-xl px-10 py-4"
        onClick={startGame}
        disabled={loading}
      >
        {loading ? 'INITIATING...' : `FACE ${selectedBot.name}`}
      </button>
    </div>
  )
}

function panicBarHeight(behavior: string, step: number): number {
  switch (behavior) {
    case 'instant_panic':  return Math.min(1, step * 0.18 + 0.1)
    case 'material_panic': return step < 4 ? 0.1 : (step - 4) * 0.2
    case 'blunder_spike':  return step === 5 ? 0.9 : 0.08
    case 'flat_flicker':   return step === 3 ? 0.3 : 0.06
    case 'iceberg':        return 0.02
    case 'intimidating':   return 0.025
    case 'ghost':          return 0.05
    default:               return 0
  }
}
