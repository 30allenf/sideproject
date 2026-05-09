/**
 * Butterworth IIR filter bank for rPPG bandpass (0.7 – 4 Hz at Fs = 30 Hz)
 *
 * Coefficients derived via bilinear transform.
 * HPF: removes below 0.7 Hz (baseline drift)
 * LPF: removes above 4.0 Hz (motion artifacts above 240 BPM)
 *
 * Both are 2nd-order Butterworth sections. Applied in cascade.
 */

// 2nd-order Butterworth HPF @ 0.7 Hz, Fs = 30 Hz
// k = tan(π·Wn/2) where Wn = 0.7/15 = 0.04667
// k ≈ 0.07356, √2·k ≈ 0.10404, k² ≈ 0.005411, denom = 1.10945
const HPF_B = [0.90136, -1.80272, 0.90136]
const HPF_A = [1.0,    -1.79284,  0.81244]

// 2nd-order Butterworth LPF @ 4.0 Hz, Fs = 30 Hz
// k = tan(π·0.2667/2) ≈ 0.44721, k² = 0.2, denom = 1.83246
const LPF_B = [0.10913, 0.21826, 0.10913]
const LPF_A = [1.0,    -0.87300, 0.30972]

/** Direct Form II Transposed 2nd-order IIR filter */
function iir2(b: number[], a: number[], signal: Float64Array): Float64Array {
  const n = signal.length
  const out = new Float64Array(n)
  let w1 = 0, w2 = 0
  for (let i = 0; i < n; i++) {
    const x = signal[i]
    const y = b[0] * x + w1
    w1 = b[1] * x - a[1] * y + w2
    w2 = b[2] * x - a[2] * y
    out[i] = y
  }
  return out
}

/**
 * Bandpass filter: HPF → LPF cascade.
 * Passes 0.7 – 4 Hz (42 – 240 BPM) for rPPG signal extraction.
 */
export function bandpass(signal: Float64Array): Float64Array {
  const hp = iir2(HPF_B, HPF_A, signal)
  return iir2(LPF_B, LPF_A, hp)
}

/**
 * Detrend by subtracting a linear trend (removes slow drift residual).
 * Operates in-place and returns a new array.
 */
export function detrend(signal: Float64Array): Float64Array {
  const n = signal.length
  if (n < 2) return signal.slice()
  const first = signal[0], last = signal[n - 1]
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = signal[i] - (first + (last - first) * (i / (n - 1)))
  }
  return out
}

/** Exponential moving average for BPM output smoothing */
export function ema(prev: number, next: number, alpha = 0.15): number {
  return alpha * next + (1 - alpha) * prev
}
