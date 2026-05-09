'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useGame } from '@/hooks/useGame'
import { useRPPG } from '@/hooks/useRPPG'
import { usePanicSync } from '@/hooks/usePanicSync'
import { getLiveGame, setPlayerReady } from '@/lib/firebase/realtime'
import { BOTS, StockfishEngine, botPanicIndex } from '@/lib/bots'
import { formatClock, generateGameId } from '@/lib/chess/game'
import { buildDests } from '@/lib/chess/game'
import type { LiveGame, RPPGCalibration } from '@/types'
import ChessBoard from '@/components/board/ChessBoard'
import PanicMeter from '@/components/board/PanicMeter'
import PlayerPanel from '@/components/board/PlayerPanel'
import MoveHistory from '@/components/board/MoveHistory'
import BluffButton from '@/components/board/BluffButton'
import CalibrationOverlay from '@/components/calibration/CalibrationOverlay'
import GameResultModal from '@/components/board/GameResultModal'
import WebcamThumbnail from '@/components/webcam/WebcamThumbnail'

// Mobile detection
function isMobile() {
  if (typeof window === 'undefined') return false
  return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768
}

export default function GamePage() {
  const { id: gameId } = useParams<{ id: string }>()
  const { profile, loading } = useAuth()
  const router = useRouter()

  const [initialGame, setInitialGame]     = useState<LiveGame | null>(null)
  const [myColor, setMyColor]             = useState<'white' | 'black'>('white')
  const [isBot, setIsBot]                 = useState(false)
  const [botDef, setBotDef]               = useState(BOTS[0])
  const [calibrated, setCalibrated]       = useState(false)
  const [calibStarted, setCalibStarted]   = useState(false)
  const [mobile, setMobile]               = useState(false)
  const [bluffActive, setBluffActive]     = useState(false)
  const [bluffUsed, setBluffUsed]         = useState(false)
  const [showResult, setShowResult]       = useState(false)

  const stockfishRef = useRef<StockfishEngine | null>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)

  // ── Determine color + bot config from live game ──────────────────────────
  useEffect(() => {
    if (!gameId || !profile?.uid) return
    setMobile(isMobile())

    getLiveGame(gameId).then(game => {
      if (!game) return router.replace('/dashboard')
      setInitialGame(game)
      const color = game.players.white.uid === profile.uid ? 'white' : 'black'
      setMyColor(color)

      if (game.vsBot) {
        setIsBot(true)
        const def = BOTS.find(b => b.level === (game.botLevel ?? 1)) ?? BOTS[0]
        setBotDef(def)
        const engine = new StockfishEngine()
        engine.init().then(() => {
          engine.setSkillLevel(def.skillLevel)
          stockfishRef.current = engine
        })
      }
    })

    return () => stockfishRef.current?.terminate()
  }, [gameId, profile?.uid])

  // ── rPPG pipeline ─────────────────────────────────────────────────────────
  const onCalibrated = useCallback((cal: RPPGCalibration) => {
    setCalibrated(true)
    setCalibStarted(false)
  }, [])

  const { result: rppgResult, cameraGranted, cameraError, isCalibrating,
    startCalibration, endCalibration, bluff, unbluff, reset: rppgReset } =
    useRPPG({ videoRef, enabled: !mobile && !!initialGame, onCalibrated })

  // ── Panic sync ────────────────────────────────────────────────────────────
  const { opponentPanic, opponentHasSignal, pushMyPanic } = usePanicSync({
    gameId,
    myColor,
    enabled: !!initialGame,
  })

  const myPanic = rppgResult?.panicIndex ?? 0

  useEffect(() => {
    if (rppgResult) {
      pushMyPanic(rppgResult.panicIndex, bluffActive)
    }
  }, [rppgResult, bluffActive, pushMyPanic])

  // ── Bot fake panic ────────────────────────────────────────────────────────
  const [botPanic, setBotPanic] = useState(0)
  useEffect(() => {
    if (!isBot || !gameState?.chess) return
    const interval = setInterval(() => {
      const moveNum = gameState.chess.history().length
      const balance = 0  // simplified
      const wasBusted = false
      const pi = botPanicIndex(botDef, moveNum, balance, wasBusted)
      setBotPanic(pi)
    }, 600)
    return () => clearInterval(interval)
  }, [isBot, botDef])

  const effectiveOpponentPanic = isBot ? botPanic : opponentPanic

  // ── Chess game ────────────────────────────────────────────────────────────
  const getBotMove = useCallback((fen: string, cb: (move: string) => void) => {
    stockfishRef.current?.getBestMove(fen, 1200 + botDef.level * 150, cb)
  }, [botDef.level])

  const gameState = useGame({
    gameId, myColor,
    myPanic, opponentPanic: effectiveOpponentPanic,
    isBot, getBotMove,
  })

  useEffect(() => {
    if (gameState.gameOver.over) setShowResult(true)
  }, [gameState.gameOver.over])

  // ── Calibration flow ─────────────────────────────────────────────────────
  function handleStartCalibration() {
    setCalibStarted(true)
    setPlayerReady(gameId, myColor, cameraGranted)
    startCalibration()
    setTimeout(() => endCalibration(), 15000)
  }

  function skipCalibration() {
    setCalibrated(true)
    setCalibStarted(false)
    setPlayerReady(gameId, myColor, false)
  }

  // ── Bluff ─────────────────────────────────────────────────────────────────
  function activateBluff() {
    if (bluffUsed) return
    setBluffActive(true)
    setBluffUsed(true)
    bluff()
    setTimeout(() => {
      setBluffActive(false)
      unbluff()
    }, 20000)
  }

  if (loading || !profile || !initialGame) return (
    <div className="min-h-dvh bg-void flex items-center justify-center">
      <p className="readout" style={{ color: 'var(--color-bone-dim)' }}>ESTABLISHING CONNECTION...</p>
    </div>
  )

  // Mobile fallback
  if (mobile) return (
    <div className="min-h-dvh bg-void flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display font-black text-bone text-5xl tracking-widest">TELL</p>
      <p className="readout mt-4 mb-8" style={{ color: 'var(--color-bone-dim)' }}>
        TELL is a desktop experience.<br />rPPG heart rate extraction requires a stationary webcam.<br />
        The board is available below, panic monitoring is disabled.
      </p>
      <div className="w-full max-w-md">
        <ChessBoard
          chess={gameState.chess}
          orientation={myColor}
          onMove={gameState.makeMove}
          isMyTurn={gameState.isMyTurn}
          lastMove={undefined}
        />
      </div>
    </div>
  )

  const showCalibOverlay = !calibrated && !calibStarted

  return (
    <div
      className="min-h-dvh flex flex-col relative"
      style={{ background: 'radial-gradient(ellipse at center, #0d0d0d, #050505)' }}
    >
      {/* Ambient panic background */}
      <div
        className="ambient-panic"
        style={{ opacity: myPanic > 0.8 ? 0.08 : 0, transition: 'opacity 1.2s ease' }}
      />

      {/* Pre-calibration overlay */}
      <AnimatePresence>
        {showCalibOverlay && (
          <CalibrationOverlay
            cameraGranted={cameraGranted}
            cameraError={cameraError}
            onStart={handleStartCalibration}
            onSkip={skipCalibration}
            videoRef={videoRef}
          />
        )}
        {calibStarted && (
          <CalibrationOverlay
            calibrating
            cameraGranted={cameraGranted}
            cameraError={cameraError}
            onStart={handleStartCalibration}
            onSkip={skipCalibration}
            videoRef={videoRef}
          />
        )}
      </AnimatePresence>

      {/* Game result modal */}
      <AnimatePresence>
        {showResult && (
          <GameResultModal
            gameOver={gameState.gameOver}
            myColor={myColor}
            chess={gameState.chess}
            myPanicHistory={[]}
            opponentPanicHistory={[]}
            gameId={gameId}
            onClose={() => setShowResult(false)}
            onRematch={() => router.push('/dashboard')}
          />
        )}
      </AnimatePresence>

      {/* Game layout */}
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="flex items-stretch gap-4 max-w-6xl w-full">

          {/* Opponent panel + panic */}
          <div className="flex flex-col items-center gap-3 w-36">
            <PlayerPanel
              username={isBot ? botDef.name : (initialGame.players[myColor === 'white' ? 'black' : 'white']?.username ?? '???')}
              clock={myColor === 'white' ? gameState.clockBlack : gameState.clockWhite}
              isActive={toActiveColor(gameState.chess.turn()) !== myColor}
              isBot={isBot}
            />
            <WebcamThumbnail videoRef={null} label="SUBJECT" noSignal />
            <PanicMeter
              value={effectiveOpponentPanic}
              hasSignal={isBot ? true : opponentHasSignal}
              label="SUBJECT"
              side="opponent"
            />
          </div>

          {/* Board */}
          <div className="flex-1 relative">
            <div className="vignette" />
            <ChessBoard
              chess={gameState.chess}
              orientation={myColor}
              onMove={gameState.makeMove}
              isMyTurn={gameState.isMyTurn}
              lastMove={gameState.chess.history({ verbose: true }).at(-1) as { from: string; to: string } | undefined}
            />
          </div>

          {/* My panel + panic */}
          <div className="flex flex-col items-center gap-3 w-36">
            <PlayerPanel
              username={profile.username}
              clock={myColor === 'white' ? gameState.clockWhite : gameState.clockBlack}
              isActive={toActiveColor(gameState.chess.turn()) === myColor}
            />
            <WebcamThumbnail videoRef={videoRef} label="YOU" />
            <PanicMeter
              value={myPanic}
              hasSignal={cameraGranted && calibrated}
              label="YOU"
              side="self"
              bluffActive={bluffActive}
            />
            <BluffButton
              used={bluffUsed}
              active={bluffActive}
              onActivate={activateBluff}
            />
          </div>

          {/* Move history + controls */}
          <div className="w-52 flex flex-col gap-3">
            <MoveHistory chess={gameState.chess} />
            <div className="flex flex-col gap-2">
              <button className="btn-ghost text-xs py-2" onClick={gameState.offerDrawFn}>
                OFFER DRAW
              </button>
              {gameState.chess.history().length <= 2 && (
                <button className="btn-ghost text-xs py-2" onClick={gameState.abort}>
                  ABORT
                </button>
              )}
              <button
                className="btn-ghost text-xs py-2"
                style={{ color: 'var(--color-crimson)', borderColor: 'var(--color-crimson-deep)' }}
                onClick={gameState.resign}
              >
                RESIGN
              </button>
            </div>
            {gameState.liveGame?.drawOffer && gameState.liveGame.drawOffer !== myColor && (
              <div className="card p-3 border-amber" style={{ borderColor: 'var(--color-amber)' }}>
                <p className="readout text-amber text-xs mb-2" style={{ color: 'var(--color-amber)' }}>DRAW OFFERED</p>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs py-1 flex-1" onClick={gameState.acceptDraw}>YES</button>
                  <button className="btn-ghost text-xs py-1 flex-1" onClick={gameState.declineDraw}>NO</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function toActiveColor(turn: 'w' | 'b'): 'white' | 'black' {
  return turn === 'w' ? 'white' : 'black'
}
