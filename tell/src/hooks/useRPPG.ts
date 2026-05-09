'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { RPPGResult, RPPGCalibration } from '@/types'

interface UseRPPGOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  enabled: boolean
  onCalibrated?: (cal: RPPGCalibration) => void
}

interface UseRPPGReturn {
  result: RPPGResult | null
  calibration: RPPGCalibration | null
  cameraGranted: boolean
  cameraError: string | null
  isCalibrating: boolean
  startCalibration: () => void
  endCalibration: () => void
  bluff: () => void
  unbluff: () => void
  reset: () => void
}

// We extract the forehead ROI from face landmarks after MediaPipe detects the face.
// Key forehead landmark indices (MediaPipe 468-point mesh):
// Center-forehead cluster: 10, 338, 297, 332, 284, 251, 389
// We average pixels in a 30×30 box around landmark 10 (top-center forehead)
const FOREHEAD_LANDMARK = 10

export function useRPPG({ videoRef, enabled, onCalibrated }: UseRPPGOptions): UseRPPGReturn {
  const [result, setResult]               = useState<RPPGResult | null>(null)
  const [calibration, setCalibration]     = useState<RPPGCalibration | null>(null)
  const [cameraGranted, setCameraGranted] = useState(false)
  const [cameraError, setCameraError]     = useState<string | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)

  const workerRef        = useRef<Worker | null>(null)
  const faceLandmarkerRef = useRef<import('@mediapipe/tasks-vision').FaceLandmarker | null>(null)
  const canvasRef        = useRef<HTMLCanvasElement | null>(null)
  const rafRef           = useRef<number>(0)
  const lastFrameTime    = useRef(0)

  // ── Init camera ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return
    let stream: MediaStream

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(s => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play()
        }
        setCameraGranted(true)
      })
      .catch(err => {
        setCameraError(err.message ?? 'Camera denied')
      })

    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [enabled, videoRef])

  // ── Init Worker ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return
    const worker = new Worker('/workers/rppg-worker.js')
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'result') {
        setResult({
          bpm: msg.bpm,
          smoothedBpm: msg.smoothedBpm,
          panicIndex: msg.panicIndex,
          timestamp: msg.timestamp,
          quality: msg.quality,
        })
      } else if (msg.type === 'calibrated') {
        const cal: RPPGCalibration = { baselineBpm: msg.baselineBpm, calibratedAt: Date.now() }
        setCalibration(cal)
        setIsCalibrating(false)
        onCalibrated?.(cal)
      }
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [enabled, onCalibrated])

  // ── Init MediaPipe FaceLandmarker ─────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !cameraGranted) return

    let cancelled = false

    async function loadFaceLandmarker() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        )
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (!cancelled) faceLandmarkerRef.current = landmarker
      } catch {
        if (!cancelled) setCameraError('MediaPipe failed to load')
      }
    }

    loadFaceLandmarker()
    return () => { cancelled = true }
  }, [enabled, cameraGranted])

  // ── Frame loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !cameraGranted) return

    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 80
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    function processFrame(ts: number) {
      rafRef.current = requestAnimationFrame(processFrame)

      const video = videoRef.current
      const landmarker = faceLandmarkerRef.current
      const worker = workerRef.current
      if (!video || !landmarker || !worker || video.readyState < 2) return

      // Throttle to ~30fps
      if (ts - lastFrameTime.current < 33) return
      lastFrameTime.current = ts

      try {
        const results = landmarker.detectForVideo(video, ts)

        if (!results.faceLandmarks?.length) {
          worker.postMessage({ type: 'sample', r: 0, g: 0, b: 0, timestamp: Date.now() })
          return
        }

        const lm = results.faceLandmarks[0]
        const vw = video.videoWidth || 640
        const vh = video.videoHeight || 480

        // Extract forehead ROI (30×30 around landmark 10)
        const fh = lm[FOREHEAD_LANDMARK]
        const cx = fh.x * vw
        const cy = fh.y * vh
        const size = 40

        ctx.clearRect(0, 0, 80, 80)
        ctx.drawImage(video, cx - size, cy - size, size * 2, size * 2, 0, 0, 80, 80)

        const pixels = ctx.getImageData(0, 0, 80, 80).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < pixels.length; i += 4) {
          r += pixels[i]
          g += pixels[i + 1]
          b += pixels[i + 2]
          count++
        }
        if (count > 0) {
          worker.postMessage({
            type: 'sample',
            r: r / count,
            g: g / count,
            b: b / count,
            timestamp: Date.now(),
          })
        }
      } catch {
        // Silently ignore frame errors
      }
    }

    rafRef.current = requestAnimationFrame(processFrame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, cameraGranted, videoRef])

  const startCalibration = useCallback(() => {
    workerRef.current?.postMessage({ type: 'calibrate_start' })
    setIsCalibrating(true)
  }, [])

  const endCalibration = useCallback(() => {
    workerRef.current?.postMessage({ type: 'calibrate_end' })
  }, [])

  const bluff = useCallback(() => {
    workerRef.current?.postMessage({ type: 'bluff_start' })
  }, [])

  const unbluff = useCallback(() => {
    workerRef.current?.postMessage({ type: 'bluff_end' })
  }, [])

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'reset' })
    setResult(null)
    setCalibration(null)
    setIsCalibrating(false)
  }, [])

  return {
    result, calibration, cameraGranted, cameraError,
    isCalibrating, startCalibration, endCalibration,
    bluff, unbluff, reset,
  }
}
