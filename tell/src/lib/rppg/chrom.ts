/**
 * CHROM rPPG Algorithm
 * de Haan & Jeanne, IEEE TBME 2013
 *
 * Extracts the blood volume pulse signal from a rolling buffer
 * of per-frame mean R, G, B values sampled from skin ROI.
 *
 * Input:  N×3 array of [R, G, B] mean values (0–255), 10-second window at 30 fps
 * Output: BPM as a number
 */

import { bandpass, detrend, ema } from './filters'

interface RGB { r: number; g: number; b: number }

function mean(arr: Float64Array): number {
  let sum = 0
  for (let i = 0; i < arr.length; i++) sum += arr[i]
  return sum / arr.length
}

function stddev(arr: Float64Array, mu?: number): number {
  const m = mu ?? mean(arr)
  let variance = 0
  for (let i = 0; i < arr.length; i++) variance += (arr[i] - m) ** 2
  return Math.sqrt(variance / arr.length)
}

/** Normalize channel: divide by mean then subtract 1 → zero-mean relative signal */
function normalizeChannel(raw: Float64Array): Float64Array {
  const m = mean(raw)
  if (m < 1) return new Float64Array(raw.length) // avoid division by zero
  const out = new Float64Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] / m - 1
  return out
}

/**
 * Radix-2 Cooley-Tukey FFT on a real-valued signal.
 * Input length must be a power of 2 (zero-pad first).
 * Returns magnitude spectrum (first N/2 bins).
 */
function rfftMagnitude(signal: Float64Array): Float64Array {
  const n = signal.length
  // Bit-reversal permutation
  const re = signal.slice()
  const im = new Float64Array(n)

  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
    }
  }

  // Butterfly computation
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k]
        const uIm = im[i + k]
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe
        re[i + k]           = uRe + vRe
        im[i + k]           = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }

  const half = n / 2
  const mag = new Float64Array(half)
  for (let i = 0; i < half; i++) {
    mag[i] = Math.sqrt(re[i] ** 2 + im[i] ** 2)
  }
  return mag
}

/** Next power of 2 ≥ n */
function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

/**
 * Core CHROM extraction.
 * Returns raw BPM from the dominant frequency in the pulse band.
 */
export function chromBPM(buffer: RGB[], fps = 30): number {
  const n = buffer.length
  if (n < 30) return 0 // need at least 1 second

  const R = new Float64Array(n)
  const G = new Float64Array(n)
  const B = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    R[i] = buffer[i].r
    G[i] = buffer[i].g
    B[i] = buffer[i].b
  }

  // 1. Normalize each channel to relative signal
  const Rn = normalizeChannel(R)
  const Gn = normalizeChannel(G)
  const Bn = normalizeChannel(B)

  // 2. CHROM two chrominance signals
  const Xs = new Float64Array(n)
  const Ys = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    Xs[i] = 3 * Rn[i] - 2 * Gn[i]
    Ys[i] = 1.5 * Rn[i] + Gn[i] - 1.5 * Bn[i]
  }

  // 3. Adaptive weighting to cancel specular noise
  const sigXs = stddev(Xs)
  const sigYs = stddev(Ys)
  if (sigYs < 1e-10) return 0
  const alpha = sigXs / sigYs

  const S = new Float64Array(n)
  for (let i = 0; i < n; i++) S[i] = Xs[i] - alpha * Ys[i]

  // 4. Detrend + bandpass filter (0.7 – 4 Hz)
  const filtered = bandpass(detrend(S))

  // 5. Zero-pad to next power of 2 for FFT
  const fftLen = nextPow2(filtered.length)
  const padded = new Float64Array(fftLen)
  padded.set(filtered)

  // Apply Hann window to reduce spectral leakage
  for (let i = 0; i < fftLen; i++) {
    padded[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftLen - 1)))
  }

  // 6. FFT magnitude spectrum
  const mag = rfftMagnitude(padded)

  // 7. Find dominant frequency in 0.7 – 4 Hz band
  const freqRes = fps / fftLen  // Hz per bin
  const minBin = Math.max(1, Math.floor(0.7 / freqRes))
  const maxBin = Math.min(mag.length - 1, Math.ceil(4.0 / freqRes))

  let peakBin = minBin
  let peakMag = 0
  for (let i = minBin; i <= maxBin; i++) {
    if (mag[i] > peakMag) {
      peakMag = mag[i]
      peakBin = i
    }
  }

  return peakBin * freqRes * 60 // convert Hz to BPM
}

/**
 * Compute panic index from current BPM relative to calibration baseline.
 * panic_index = clamp((bpm - baseline) / 20, 0, 1)
 */
export function computePanicIndex(bpm: number, baselineBpm: number): number {
  const delta = bpm - baselineBpm
  return Math.max(0, Math.min(1, delta / 20))
}

/**
 * Assess signal quality from the ROI buffer.
 * Returns 'good' | 'poor' | 'lost'
 */
export function assessQuality(buffer: RGB[]): 'good' | 'poor' | 'lost' {
  if (buffer.length < 30) return 'lost'

  // Check if face is detected (any recent sample with non-zero values)
  const recent = buffer.slice(-15)
  const nonZero = recent.filter(s => s.r > 5 && s.g > 5 && s.b > 5)
  if (nonZero.length < 8) return 'lost'

  // Check for motion artifacts (large variance in luma)
  const lumas = recent.map(s => 0.299 * s.r + 0.587 * s.g + 0.114 * s.b)
  const lumaArr = new Float64Array(lumas)
  const lumaStd = stddev(lumaArr)
  if (lumaStd > 20) return 'poor'

  // Check for low lighting
  const meanLuma = mean(lumaArr)
  if (meanLuma < 40) return 'poor'

  return 'good'
}
