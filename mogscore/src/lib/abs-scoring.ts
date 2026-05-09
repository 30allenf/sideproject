/**
 * MOGSCORE — Physique (abs) scoring engine.
 * Purely pixel-based: no landmarks required.
 * User frames their midsection; we score the central crop.
 */

export type PhysiqueScores = {
  definition: number;
  symmetry: number;
  tone: number;
  lines: number;
  conditioning: number;
  overall: number;
};

/* ── Helpers ── */
function lum(d: Uint8ClampedArray, i: number): number {
  return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
}

function mapTo10(
  v: number,
  idealLow: number,
  idealHigh: number,
  fullRange: number,
  curve: "closer" | "lower" | "higher" = "closer"
): number {
  const mid = (idealLow + idealHigh) / 2;
  let score: number;
  if (curve === "closer") {
    const d = Math.abs(v - mid);
    const halfBand = (idealHigh - idealLow) / 2 || 1e-6;
    score = d <= halfBand ? 10 - 2 * (d / halfBand) : 8 - 4 * (Math.min(fullRange, d - halfBand) / fullRange);
  } else if (curve === "lower") {
    if (v <= idealLow) score = 10;
    else if (v >= idealHigh + fullRange) score = 4;
    else if (v <= idealHigh) score = 10 - 2 * ((v - idealLow) / (idealHigh - idealLow));
    else score = 8 - 4 * ((v - idealHigh) / fullRange);
  } else {
    if (v >= idealHigh) score = 10;
    else if (v <= idealLow - fullRange) score = 4;
    else if (v >= idealLow) score = 8 + 2 * ((v - idealLow) / (idealHigh - idealLow));
    else score = 8 - 4 * ((idealLow - v) / fullRange);
  }
  return Math.max(3.0, Math.min(10.0, score));
}

function clampSoft(v: number): number {
  const x = Math.max(3.0, Math.min(10.0, v));
  if (x < 8) return Math.min(10, x + (8 - x) * 0.06);
  return x;
}

/** Mean gradient magnitude over a region — measures edge/muscle-line density. */
function edgeDensity(d: Uint8ClampedArray, W: number, x0: number, y0: number, w: number, h: number): number {
  let sum = 0, n = 0;
  for (let y = y0 + 1; y < y0 + h - 1; y++) {
    for (let x = x0 + 1; x < x0 + w - 1; x++) {
      const c  = lum(d, (y * W + x) * 4);
      const dx = Math.abs(c - lum(d, (y * W + x - 1) * 4)) + Math.abs(c - lum(d, (y * W + x + 1) * 4));
      const dy = Math.abs(c - lum(d, ((y - 1) * W + x) * 4)) + Math.abs(c - lum(d, ((y + 1) * W + x) * 4));
      sum += (dx + dy) / 4;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** Vertical-only edge density — highlights horizontal ab lines (creases between muscle groups). */
function verticalEdgeDensity(d: Uint8ClampedArray, W: number, x0: number, y0: number, w: number, h: number): number {
  let sum = 0, n = 0;
  for (let y = y0 + 1; y < y0 + h - 1; y++) {
    for (let x = x0 + 1; x < x0 + w - 1; x++) {
      const dy = Math.abs(lum(d, ((y - 1) * W + x) * 4) - lum(d, ((y + 1) * W + x) * 4));
      sum += dy;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** Left-vs-right luminance difference — measures bilateral symmetry. */
function leftRightDiff(d: Uint8ClampedArray, W: number, x0: number, y0: number, w: number, h: number): number {
  const half = Math.floor(w / 2);
  let sumL = 0, sumR = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) {
    for (let i = 0; i < half; i++) {
      sumL += lum(d, (y * W + x0 + i) * 4);
      sumR += lum(d, (y * W + x0 + w - 1 - i) * 4);
      n++;
    }
  }
  return n > 0 ? Math.abs(sumL - sumR) / n : 0;
}

/** Luminance standard deviation in a region — measures tone/color evenness. */
function lumStd(d: Uint8ClampedArray, W: number, x0: number, y0: number, w: number, h: number): number {
  let sum = 0, sum2 = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const l = lum(d, (y * W + x) * 4);
      sum += l; sum2 += l * l; n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean));
}

/* ── Entry point ── */

export function scoreAbs(image: ImageData): PhysiqueScores {
  const { data: d, width: W, height: H } = image;

  // Central midsection crop: middle 55% width, middle 65% height
  const x0 = Math.floor(W * 0.225);
  const y0 = Math.floor(H * 0.175);
  const w  = Math.floor(W * 0.55);
  const h  = Math.floor(H * 0.65);

  if (w < 10 || h < 10) {
    const fallback = 6.5;
    return { definition: fallback, symmetry: fallback, tone: fallback, lines: fallback, conditioning: fallback, overall: fallback };
  }

  // Definition: overall edge density across abs region
  const def = edgeDensity(d, W, x0, y0, w, h);

  // Symmetry: left-right luminance balance
  const sym = leftRightDiff(d, W, x0, y0, w, h);

  // Tone: luminance variation (lower = more even skin tone)
  const toneVal = lumStd(d, W, x0, y0, w, h);

  // Lines: horizontal ab-line edges — vertical gradient in central strip
  const cx = x0 + Math.floor(w * 0.25);
  const cw = Math.floor(w * 0.50);
  const linesVal = verticalEdgeDensity(d, W, cx, y0, cw, h);

  // Conditioning: bottom-third edge density (V-lines / lower abs area)
  const vy = y0 + Math.floor(h * 0.65);
  const vh = h - Math.floor(h * 0.65);
  const condVal = edgeDensity(d, W, x0, vy, w, vh);

  // Map to 1-10
  // Edge density calibration: ~5 = flat/smooth, ~20 = moderate def, ~35+ = shredded
  const definition   = clampSoft(mapTo10(def,    10, 28, 22, "higher"));
  const symmetry     = clampSoft(mapTo10(sym,     0,  4, 18, "lower"));
  const tone         = clampSoft(mapTo10(toneVal, 8, 18, 28, "lower"));
  const lines        = clampSoft(mapTo10(linesVal,6, 20, 18, "higher"));
  const conditioning = clampSoft(mapTo10(condVal, 8, 22, 18, "higher"));

  const raw = definition * 0.35 + symmetry * 0.20 + tone * 0.15 + lines * 0.20 + conditioning * 0.10;
  const overall = clampSoft(raw);

  const bump = (v: number) => Math.round(Math.min(10, v + 1) * 10) / 10;

  return {
    definition:   bump(definition),
    symmetry:     bump(symmetry),
    tone:         bump(tone),
    lines:        bump(lines),
    conditioning: bump(conditioning),
    overall:      bump(overall),
  };
}

export function scoreAbsWithName(image: ImageData): PhysiqueScores {
  return scoreAbs(image);
}
