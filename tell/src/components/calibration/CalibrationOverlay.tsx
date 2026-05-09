'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CalibrationOverlayProps {
  calibrating?: boolean
  cameraGranted: boolean
  cameraError: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  onStart: () => void
  onSkip: () => void
}

const CALIBRATION_SECS = 15

export default function CalibrationOverlay({
  calibrating, cameraGranted, cameraError, videoRef, onStart, onSkip
}: CalibrationOverlayProps) {
  const [countdown, setCountdown] = useState(CALIBRATION_SECS)

  useEffect(() => {
    if (!calibrating) return
    setCountdown(CALIBRATION_SECS)
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [calibrating])

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(2px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-md w-full px-4 text-center space-y-6">

        {/* Title */}
        <div>
          <div className="readout mb-2" style={{ color: 'var(--color-crimson)' }}>
            BIOMETRIC CALIBRATION
          </div>
          <h2 className="font-display font-black text-bone tracking-widest text-4xl uppercase">
            {calibrating ? 'HOLD STILL' : 'CALIBRATE'}
          </h2>
        </div>

        {/* Webcam preview */}
        <div
          className="relative mx-auto overflow-hidden"
          style={{ width: 240, height: 180, border: '1px solid var(--color-border)', background: '#000' }}
        >
          {/* Scanlines */}
          <div className="scanlines" />

          {cameraGranted ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted playsInline
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="readout text-xs" style={{ color: 'var(--color-muted)' }}>
                {cameraError ? 'CAMERA DENIED' : 'REQUESTING ACCESS...'}
              </p>
            </div>
          )}

          {/* Scan sweep animation during calibration */}
          {calibrating && cameraGranted && (
            <div className="scan-sweep" />
          )}

          {/* Countdown overlay */}
          {calibrating && (
            <div
              className="absolute bottom-0 inset-x-0 py-2 text-center font-display font-black"
              style={{ background: 'rgba(0,0,0,0.6)', fontSize: 28, color: 'var(--color-crimson)', letterSpacing: '0.1em' }}
            >
              {countdown}
            </div>
          )}

          {/* Corner brackets */}
          {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
            <div
              key={i}
              className={`absolute w-4 h-4 ${pos}`}
              style={{
                borderTop:    [0,1].includes(i) ? '1px solid var(--color-crimson)' : undefined,
                borderBottom: [2,3].includes(i) ? '1px solid var(--color-crimson)' : undefined,
                borderLeft:   [0,2].includes(i) ? '1px solid var(--color-crimson)' : undefined,
                borderRight:  [1,3].includes(i) ? '1px solid var(--color-crimson)' : undefined,
              }}
            />
          ))}
        </div>

        {/* Instructions */}
        {!calibrating && (
          <p className="font-mono text-sm leading-relaxed" style={{ color: 'var(--color-bone-dim)' }}>
            {cameraError
              ? 'Camera access was denied. You can still play — your panic meter will show NO SIGNAL to your opponent.'
              : 'Look directly at the camera and remain still for 15 seconds. The system will measure your resting heart rate as a baseline.'
            }
          </p>
        )}

        {calibrating && (
          <p className="font-mono text-sm" style={{ color: 'var(--color-bone-dim)' }}>
            Analyzing facial blood flow patterns...<br />
            Do not move. Do not speak.
          </p>
        )}

        {/* Progress bar */}
        {calibrating && (
          <div
            className="h-1 w-full"
            style={{ background: 'var(--color-abyss)', border: '1px solid var(--color-border)' }}
          >
            <motion.div
              className="h-full"
              style={{ background: 'var(--color-crimson)' }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: CALIBRATION_SECS, ease: 'linear' }}
            />
          </div>
        )}

        {/* Actions */}
        {!calibrating && (
          <div className="flex gap-4 justify-center">
            {cameraGranted && (
              <button className="btn-primary" onClick={onStart}>
                BEGIN CALIBRATION
              </button>
            )}
            <button className="btn-ghost" onClick={onSkip}>
              {cameraError ? 'PLAY WITHOUT CAMERA' : 'SKIP'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
