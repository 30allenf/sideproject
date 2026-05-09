/**
 * rPPG Web Worker
 * ───────────────────────────────────────────────────────────────────────────
 * Receives ROI pixel samples from the main thread, runs the CHROM algorithm,
 * and posts back BPM / panic index every 500 ms.
 *
 * Message protocol (main → worker):
 *   { type: 'sample',  r, g, b, timestamp }    — single ROI frame sample
 *   { type: 'calibrate_start' }                 — begin calibration window
 *   { type: 'calibrate_end' }                   — end calibration, compute baseline
 *   { type: 'bluff_start' }                     — freeze displayed panic value
 *   { type: 'bluff_end' }                       — resume real signal
 *   { type: 'reset' }                           — clear all state
 *
 * Message protocol (worker → main):
 *   { type: 'result',     bpm, smoothedBpm, panicIndex, quality, timestamp }
 *   { type: 'calibrated', baselineBpm }
 *   { type: 'quality',    quality }             — 'good' | 'poor' | 'lost'
 */

'use strict'

// ─── Constants ────────────────────────────────────────────────────────────────
const FPS            = 30
const WINDOW_SECS    = 10
const WINDOW_SIZE    = FPS * WINDOW_SECS     // 300 samples
const EMA_ALPHA      = 0.15
const POST_INTERVAL  = 500                    // ms between result posts

// Butterworth IIR coefficients (precomputed, see lib/rppg/filters.ts)
const HPF_B = [0.90136, -1.80272, 0.90136]
const HPF_A = [1.0,    -1.79284,  0.81244]
const LPF_B = [0.10913,  0.21826, 0.10913]
const LPF_A = [1.0,     -0.87300, 0.30972]

// ─── State ────────────────────────────────────────────────────────────────────
const buffer     = []           // rolling RGB samples { r, g, b, timestamp }
let calibBuf     = []           // buffer during calibration
let isCalibrating = false
let baselineBpm  = 0
let smoothedBpm  = 70           // initial guess
let lastPostTime = 0
let bluffing     = false
let frozenPanic  = 0

// ─── Math helpers ─────────────────────────────────────────────────────────────

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stddev(arr, mu) {
  if (arr.length < 2) return 0
  const m = mu ?? mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
}

function iir2(b, a, signal) {
  const out = new Float64Array(signal.length)
  let w1 = 0, w2 = 0
  for (let i = 0; i < signal.length; i++) {
    const x = signal[i]
    const y = b[0] * x + w1
    w1 = b[1] * x - a[1] * y + w2
    w2 = b[2] * x - a[2] * y
    out[i] = y
  }
  return out
}

function bandpass(signal) {
  const hp = iir2(HPF_B, HPF_A, signal)
  return iir2(LPF_B, LPF_A, hp)
}

function detrend(signal) {
  const n = signal.length
  const first = signal[0], last = signal[n - 1]
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) out[i] = signal[i] - (first + (last - first) * (i / (n - 1)))
  return out
}

function nextPow2(n) {
  let p = 1; while (p < n) p <<= 1; return p
}

function rfftMag(signal) {
  const n = signal.length
  const re = Float64Array.from(signal)
  const im = new Float64Array(n)

  // Bit-reversal
  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t }
  }

  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len
    const wRe = Math.cos(ang), wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k],           uIm = im[i + k]
        const vRe = re[i+k+len/2]*cRe - im[i+k+len/2]*cIm
        const vIm = re[i+k+len/2]*cIm + im[i+k+len/2]*cRe
        re[i+k]       = uRe+vRe; im[i+k]       = uIm+vIm
        re[i+k+len/2] = uRe-vRe; im[i+k+len/2] = uIm-vIm
        const nr = cRe*wRe - cIm*wIm; cIm = cRe*wIm + cIm*wRe; cRe = nr
      }
    }
  }

  const half = n / 2
  const mag = new Float64Array(half)
  for (let i = 0; i < half; i++) mag[i] = Math.sqrt(re[i]**2 + im[i]**2)
  return mag
}

// ─── CHROM pipeline ───────────────────────────────────────────────────────────

function normalizeChannel(raw) {
  const m = mean(raw)
  if (m < 1) return raw.map(() => 0)
  return raw.map(v => v / m - 1)
}

function chromBPM(buf) {
  const n = buf.length
  if (n < 30) return 0

  const Rn = normalizeChannel(buf.map(s => s.r))
  const Gn = normalizeChannel(buf.map(s => s.g))
  const Bn = normalizeChannel(buf.map(s => s.b))

  const Xs = Rn.map((r, i) => 3 * r - 2 * Gn[i])
  const Ys = Rn.map((r, i) => 1.5 * r + Gn[i] - 1.5 * Bn[i])

  const sigXs = stddev(Xs)
  const sigYs = stddev(Ys)
  if (sigYs < 1e-10) return 0
  const alpha = sigXs / sigYs

  const S = new Float64Array(Xs.map((x, i) => x - alpha * Ys[i]))
  const filtered = bandpass(detrend(S))

  const fftLen = nextPow2(filtered.length)
  const padded = new Float64Array(fftLen)
  padded.set(filtered)

  // Hann window
  for (let i = 0; i < fftLen; i++)
    padded[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftLen - 1)))

  const mag = rfftMag(padded)
  const freqRes = FPS / fftLen
  const minBin = Math.max(1, Math.floor(0.7 / freqRes))
  const maxBin = Math.min(mag.length - 1, Math.ceil(4.0 / freqRes))

  let peak = minBin, peakMag = 0
  for (let i = minBin; i <= maxBin; i++) {
    if (mag[i] > peakMag) { peakMag = mag[i]; peak = i }
  }
  return peak * freqRes * 60
}

function assessQuality(buf) {
  if (buf.length < 30) return 'lost'
  const recent = buf.slice(-15)
  const live = recent.filter(s => s.r > 5 && s.g > 5 && s.b > 5)
  if (live.length < 8) return 'lost'
  const lumas = recent.map(s => 0.299 * s.r + 0.587 * s.g + 0.114 * s.b)
  if (stddev(lumas) > 20) return 'poor'
  if (mean(lumas) < 40)   return 'poor'
  return 'good'
}

function computePanicIndex(bpm, baseline) {
  if (!baseline) return 0
  return Math.max(0, Math.min(1, (bpm - baseline) / 20))
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.onmessage = function (e) {
  const msg = e.data

  switch (msg.type) {
    case 'sample': {
      const sample = { r: msg.r, g: msg.g, b: msg.b, timestamp: msg.timestamp }

      if (isCalibrating) {
        calibBuf.push(sample)
      }

      buffer.push(sample)
      if (buffer.length > WINDOW_SIZE) buffer.shift()

      const now = Date.now()
      if (now - lastPostTime < POST_INTERVAL) break
      lastPostTime = now

      const quality = assessQuality(buffer)
      if (quality === 'lost') {
        self.postMessage({ type: 'result', bpm: 0, smoothedBpm, panicIndex: 0, quality, timestamp: now })
        break
      }

      const rawBpm = chromBPM(buffer)
      if (rawBpm < 30 || rawBpm > 220) break  // physiologically impossible, skip

      smoothedBpm = EMA_ALPHA * rawBpm + (1 - EMA_ALPHA) * smoothedBpm

      let panicIndex = computePanicIndex(smoothedBpm, baselineBpm)
      if (bluffing) panicIndex = frozenPanic  // bluff token active

      self.postMessage({
        type: 'result',
        bpm: rawBpm,
        smoothedBpm,
        panicIndex,
        quality,
        timestamp: now,
      })
      break
    }

    case 'calibrate_start': {
      calibBuf = []
      isCalibrating = true
      break
    }

    case 'calibrate_end': {
      isCalibrating = false
      if (calibBuf.length >= 30) {
        const bpms = []
        for (let start = 0; start + 30 <= calibBuf.length; start += 5) {
          const b = chromBPM(calibBuf.slice(start, start + 30))
          if (b > 40 && b < 180) bpms.push(b)
        }
        if (bpms.length) {
          baselineBpm = mean(bpms)
          smoothedBpm = baselineBpm
          self.postMessage({ type: 'calibrated', baselineBpm })
        }
      }
      calibBuf = []
      break
    }

    case 'bluff_start': {
      bluffing = true
      frozenPanic = computePanicIndex(smoothedBpm, baselineBpm)
      break
    }

    case 'bluff_end': {
      bluffing = false
      break
    }

    case 'reset': {
      buffer.length = 0
      calibBuf = []
      isCalibrating = false
      baselineBpm = 0
      smoothedBpm = 70
      bluffing = false
      frozenPanic = 0
      break
    }
  }
}
