'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface PanicGraphProps {
  myHistory: number[]
  opponentHistory: number[]
  moves: string[]
  exportRef?: React.RefObject<HTMLDivElement | null>
}

export default function PanicGraph({ myHistory, opponentHistory, moves, exportRef }: PanicGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const maxLen = Math.max(myHistory.length, opponentHistory.length, 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const PAD = { top: 20, right: 20, bottom: 30, left: 36 }
    const graphW = W - PAD.left - PAD.right
    const graphH = H - PAD.top - PAD.bottom

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = 'rgba(42,42,42,0.8)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (graphH / 4) * i
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + graphW, y); ctx.stroke()
      ctx.fillStyle = 'rgba(138,128,112,0.6)'
      ctx.font = '9px IBM Plex Mono'
      ctx.fillText(`${100 - i * 25}%`, 2, y + 4)
    }

    function drawLine(history: number[], color: string, glowColor: string) {
      if (history.length < 2) return
      const pts = history.map((v, i) => ({
        x: PAD.left + (i / (maxLen - 1)) * graphW,
        y: PAD.top + (1 - v) * graphH,
      }))

      // Glow
      ctx.shadowColor = glowColor
      ctx.shadowBlur = 8
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        const cp = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 }
        ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, cp.x, cp.y)
      }
      ctx.lineTo(pts.at(-1)!.x, pts.at(-1)!.y)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    drawLine(myHistory,       '#c0392b', 'rgba(192,57,43,0.8)')
    drawLine(opponentHistory, '#d4920a', 'rgba(212,146,10,0.8)')

    // Move annotations (major spikes)
    const annotations: { idx: number; move: string }[] = []
    for (let i = 1; i < myHistory.length; i++) {
      if (myHistory[i] - myHistory[i-1] > 0.2) {
        annotations.push({ idx: i, move: moves[Math.floor(i * moves.length / myHistory.length)] ?? '' })
      }
    }
    ctx.fillStyle = 'rgba(192,57,43,0.7)'
    ctx.font = '8px IBM Plex Mono'
    for (const ann of annotations.slice(0, 5)) {
      const x = PAD.left + (ann.idx / (maxLen - 1)) * graphW
      ctx.beginPath(); ctx.arc(x, PAD.top + (1 - myHistory[ann.idx]) * graphH, 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(232,224,208,0.6)'
      ctx.fillText(ann.move, x + 4, PAD.top + (1 - myHistory[ann.idx]) * graphH - 4)
      ctx.fillStyle = 'rgba(192,57,43,0.7)'
    }

    // Legend
    ctx.font = '10px IBM Plex Mono'
    ctx.fillStyle = '#c0392b'; ctx.fillText('— YOU', PAD.left, H - 8)
    ctx.fillStyle = '#d4920a'; ctx.fillText('— SUBJECT', PAD.left + 60, H - 8)
  }, [myHistory, opponentHistory, moves, maxLen])

  async function exportPNG() {
    if (!exportRef?.current) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(exportRef.current, { backgroundColor: '#0a0a0a' })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'tell-panic-graph.png'
      a.click()
      toast.success('Graph exported')
    } catch {
      toast.error('Export failed')
    }
  }

  if (myHistory.length < 2 && opponentHistory.length < 2) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 160, background: 'var(--color-abyss)', border: '1px solid var(--color-border)' }}
      >
        <p className="readout text-xs" style={{ color: 'var(--color-muted)' }}>
          NO PANIC DATA RECORDED
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={560}
        height={160}
        className="w-full"
        style={{ display: 'block', border: '1px solid var(--color-border)' }}
      />
      <button className="btn-ghost text-xs py-1 px-3" onClick={exportPNG}>
        EXPORT PNG
      </button>
    </div>
  )
}
