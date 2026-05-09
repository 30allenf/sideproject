/**
 * MOGSCORE — face scoring engine.
 *
 * Real geometry on MediaPipe FaceLandmarker output (478 landmarks).
 * All math returns 1.0–10.0. Calibrated so most real faces land 5–8.
 * Floor at 3.0 unless detection genuinely fails.
 *
 * The math is intentionally simple and easy to tune. If a category
 * feels off, adjust the `mapTo10` ranges below — those are the knobs.
 */

export type Pt = { x: number; y: number; z?: number };

export type FaceScores = {
  eyes: number;
  skin: number;
  jawline: number;
  hair: number;
  symmetry: number;
  harmony: number;
  overall: number;
};

/* ─────────────────────────────────────────────
   LANDMARK INDICES (MediaPipe FaceMesh canonical model)
   Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
   ───────────────────────────────────────────── */
const LM = {
  // Eyes
  leftLat:  33,    // left eye lateral (outer) canthus
  leftMed:  133,   // left eye medial (inner) canthus
  rightLat: 263,   // right eye lateral
  rightMed: 362,   // right eye medial
  leftTop: 159, leftBot: 145,
  rightTop: 386, rightBot: 374,
  // Nose
  noseTip: 1,
  noseBase: 2,
  // Mouth
  mouthL: 61, mouthR: 291,
  // Face frame
  chin: 152,
  forehead: 10,
  midForehead: 151,
  jawL: 234, jawR: 454,
  jawAngleL: 172,  // approx jaw corner left
  jawAngleR: 397,  // approx jaw corner right
  // Brows
  browL: 107, browR: 336,
  // Cheeks (for skin patches)
  cheekL: 50,
  cheekR: 280,
};

/**
 * Pairs of mirror-symmetric landmarks across the face vertical axis.
 * Used by the symmetry score. Limited but representative coverage.
 */
const SYMMETRY_PAIRS: [number, number][] = [
  [33, 263], [133, 362],          // eye outer/inner canthi
  [159, 386], [145, 374],         // eye top/bottom
  [160, 387], [158, 385],         // eyelid
  [61, 291], [39, 269], [37, 267],// mouth corners + lip
  [234, 454], [172, 397],         // jaw outline
  [50, 280],                      // cheeks
  [107, 336],                     // brow
  [127, 356],                     // upper jaw
];

/* ─────────────────────────────────────────────
   BASIC GEOMETRY HELPERS
   ───────────────────────────────────────────── */
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

/** Angle of vector a→b in degrees, with screen-y flipped so "up is positive." */
function angleDegFlipY(a: Pt, b: Pt) {
  return Math.atan2(-(b.y - a.y), b.x - a.x) * (180 / Math.PI);
}

/**
 * Map a raw value to 1..10 using a piecewise linear ramp.
 * idealLow..idealHigh → 8..10 (peak at midpoint of ideal band)
 * Values outside ramp toward 4..6.
 * Clamps and applies the 3.0 floor.
 *
 * curve = 'closer-to-ideal' — distance from ideal midpoint penalizes
 *         'lower-better'    — value below idealHigh is better
 *         'higher-better'   — value above idealLow is better
 */
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
    if (d <= halfBand) {
      // Inside ideal band — map 0..halfBand → 10..8
      score = 10 - 2 * (d / halfBand);
    } else {
      // Outside — falls off toward 4 over fullRange
      const dOut = Math.min(fullRange, d - halfBand);
      score = 8 - 4 * (dOut / fullRange);
    }
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

/* ─────────────────────────────────────────────
   GEOMETRIC CATEGORIES
   ───────────────────────────────────────────── */

/**
 * Eyes — canthal tilt, eye spacing, eye-to-face ratio.
 * Positive canthal tilt (lateral higher than medial) scores higher.
 * Eye spacing target: inner-canthal-distance / face-width ≈ 0.20.
 */
export function scoreEyes(lm: Pt[]): number {
  const leftLat = lm[LM.leftLat], leftMed = lm[LM.leftMed];
  const rightLat = lm[LM.rightLat], rightMed = lm[LM.rightMed];
  const jawL = lm[LM.jawL], jawR = lm[LM.jawR];

  // Canthal tilt: angle medial→lateral. Left eye lateral is to the LEFT of medial (in image coords),
  // so the angle from medial to lateral is near 180°. We measure deviation from horizontal.
  const tiltL = angleDegFlipY(leftMed, leftLat);   // ~180° at neutral; >180 means lateral is up
  const tiltR = angleDegFlipY(rightMed, rightLat); // ~0° at neutral; >0 means lateral is up
  // Normalize so that "tilt above horizontal" is positive for both eyes.
  const leftTilt = tiltL > 90 ? 180 - tiltL : -(tiltL); // converts ~180 base to ~0; positive lateral-up
  const rightTilt = tiltR;
  const avgTilt = (leftTilt + rightTilt) / 2;
  // Positive canthal tilt 0..8° is ideal.
  const tiltScore = mapTo10(avgTilt, 2, 8, 8, "closer");

  // Eye spacing
  const faceWidth = dist(jawL, jawR) || 1e-6;
  const interOcular = dist(leftMed, rightMed);
  const spacingRatio = interOcular / faceWidth;
  const spacingScore = mapTo10(spacingRatio, 0.18, 0.22, 0.08, "closer");

  // Eye-to-face: average eye width / face width, target ~0.20
  const leftWidth = dist(leftLat, leftMed);
  const rightWidth = dist(rightLat, rightMed);
  const eyeWidth = (leftWidth + rightWidth) / 2;
  const eyeRatio = eyeWidth / faceWidth;
  const sizeScore = mapTo10(eyeRatio, 0.18, 0.23, 0.08, "closer");

  return clampSoft((tiltScore * 0.45 + spacingScore * 0.30 + sizeScore * 0.25));
}

/**
 * Jawline — gonial angle at chin (smaller = sharper) plus jaw definition
 * via curvature of the jawline.
 */
export function scoreJawline(lm: Pt[]): number {
  const chin = lm[LM.chin];
  const jawAL = lm[LM.jawAngleL];
  const jawAR = lm[LM.jawAngleR];

  // Angle at chin between vectors to left/right jaw corners. Sharper jaws have a more acute chin angle.
  const v1 = sub(jawAL, chin);
  const v2 = sub(jawAR, chin);
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
  const cos = dot / ((m1 * m2) || 1e-6);
  const chinAngle = Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
  // Ideal chin angle ~ 80–100°. Higher (>120°) = weak. Lower (<70°) = pointed.
  const chinScore = mapTo10(chinAngle, 80, 100, 30, "closer");

  // Jaw straightness: jawline points from jawL → jawAngleL → chin → jawAngleR → jawR.
  // A "clean" jaw has consistent direction changes (curvature). Deviation from a smooth curve = lower score.
  const pts = [lm[LM.jawL], jawAL, chin, jawAR, lm[LM.jawR]];
  let curveErr = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const before = pts[i - 1], here = pts[i], after = pts[i + 1];
    // Distance from `here` to the midpoint of before-after; lower = smoother
    const mid = { x: (before.x + after.x) / 2, y: (before.y + after.y) / 2 };
    curveErr += dist(here, mid);
  }
  const jawLen = dist(lm[LM.jawL], lm[LM.jawR]) || 1e-6;
  const curveRatio = curveErr / jawLen;
  // Lower curveRatio = cleaner jawline. Around 0.05 is great, 0.20 is heavy.
  const cleanScore = mapTo10(curveRatio, 0.04, 0.08, 0.18, "lower");

  return clampSoft(chinScore * 0.6 + cleanScore * 0.4);
}

/**
 * Symmetry — for each mirror pair, mirror landmark A across the face midline
 * and measure distance to B. Lower mean error = higher score.
 */
export function scoreSymmetry(lm: Pt[]): number {
  // Face midline: forehead → chin
  const top = lm[LM.forehead];
  const bot = lm[LM.chin];
  // Midline direction
  const dx = bot.x - top.x, dy = bot.y - top.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux; // perpendicular (face-normal)

  function reflect(p: Pt): Pt {
    // Reflect p across line through `top` with direction (ux, uy).
    const tx = p.x - top.x, ty = p.y - top.y;
    const along = tx * ux + ty * uy;
    const across = tx * nx + ty * ny;
    const rx = top.x + along * ux - across * nx;
    const ry = top.y + along * uy - across * ny;
    return { x: rx, y: ry };
  }

  const faceWidth = dist(lm[LM.jawL], lm[LM.jawR]) || 1e-6;
  let sum = 0;
  for (const [a, b] of SYMMETRY_PAIRS) {
    const r = reflect(lm[a]);
    sum += dist(r, lm[b]) / faceWidth;
  }
  const meanErr = sum / SYMMETRY_PAIRS.length;
  // 0.005 → great (10), 0.05 → cooked (4)
  return clampSoft(mapTo10(meanErr, 0.003, 0.012, 0.05, "lower"));
}

/**
 * Harmony — facial thirds (forehead, midface, lower face) and fifths (across).
 * Closer to equal subdivision = higher score.
 */
export function scoreHarmony(lm: Pt[]): number {
  // Thirds
  const top = lm[LM.forehead];
  const browMid = midpoint(lm[LM.browL], lm[LM.browR]);
  const noseBase = lm[LM.noseBase];
  const chin = lm[LM.chin];
  const t1 = dist(top, browMid);
  const t2 = dist(browMid, noseBase);
  const t3 = dist(noseBase, chin);
  const totalT = t1 + t2 + t3 || 1e-6;
  const r1 = t1 / totalT, r2 = t2 / totalT, r3 = t3 / totalT;
  // Equal would be 0.333 each. Sum of squared deviations.
  const thirdsErr = Math.sqrt(((r1 - 1 / 3) ** 2 + (r2 - 1 / 3) ** 2 + (r3 - 1 / 3) ** 2) / 3);
  const thirdsScore = mapTo10(thirdsErr, 0.01, 0.04, 0.10, "lower");

  // Fifths — across face
  const segs = [
    dist(lm[LM.jawL], lm[LM.leftLat]),
    dist(lm[LM.leftLat], lm[LM.leftMed]),
    dist(lm[LM.leftMed], lm[LM.rightMed]),
    dist(lm[LM.rightMed], lm[LM.rightLat]),
    dist(lm[LM.rightLat], lm[LM.jawR]),
  ];
  const totalF = segs.reduce((a, b) => a + b, 0) || 1e-6;
  const ratios = segs.map((s) => s / totalF);
  const target = 0.2;
  const fifthsErr = Math.sqrt(ratios.reduce((s, r) => s + (r - target) ** 2, 0) / 5);
  const fifthsScore = mapTo10(fifthsErr, 0.015, 0.04, 0.10, "lower");

  return clampSoft(thirdsScore * 0.55 + fifthsScore * 0.45);
}

/* ─────────────────────────────────────────────
   PIXEL-BASED CATEGORIES
   ───────────────────────────────────────────── */

/**
 * Skin — sample patches over cheek + forehead, compute texture (luminance variance)
 * and evenness (color stddev). Lower = clearer.
 */
export function scoreSkin(lm: Pt[], img: ImageData): number {
  const W = img.width, H = img.height;
  const px = (p: Pt) => ({ x: p.x * W, y: p.y * H });

  const patchSize = Math.max(14, Math.floor(W * 0.04));
  const samples: { x: number; y: number }[] = [];

  const fhead = px({
    x: (lm[LM.browL].x + lm[LM.browR].x) / 2,
    y: (lm[LM.browL].y + lm[LM.browR].y) / 2 - 0.045,
  });
  samples.push(fhead);
  samples.push(px(lm[LM.cheekL]));
  samples.push(px(lm[LM.cheekR]));

  let totalLumVar = 0, totalColorStd = 0, n = 0;
  for (const s of samples) {
    const r = sampleStats(img, s.x, s.y, patchSize);
    if (!r) continue;
    totalLumVar += r.lumStd;
    totalColorStd += r.colorStd;
    n++;
  }
  if (n === 0) return 6.0; // detection failure fallback
  const avgLumStd = totalLumVar / n;
  const avgColorStd = totalColorStd / n;

  // Tuned to typical webcam captures. Smaller stddev = smoother skin.
  const textureScore = mapTo10(avgLumStd, 4, 8, 22, "lower");
  const evennessScore = mapTo10(avgColorStd, 3, 6, 18, "lower");
  return clampSoft(textureScore * 0.55 + evennessScore * 0.45);
}

/**
 * Hair — strip above forehead. "Hair" pixels = darker than skin reference.
 * Coverage % drives score.
 */
export function scoreHair(lm: Pt[], img: ImageData): number {
  const W = img.width, H = img.height;
  const fheadX = ((lm[LM.browL].x + lm[LM.browR].x) / 2) * W;
  const fheadY = ((lm[LM.browL].y + lm[LM.browR].y) / 2 - 0.04) * H;
  // A reference skin sample = forehead patch luminance
  const skinRef = sampleStats(img, fheadX, fheadY, 12);
  if (!skinRef) return 6.0;
  const skinLum = skinRef.lumMean;

  // Hair strip: above forehead (above landmark 10)
  const headTopX = lm[LM.forehead].x * W;
  const headTopY = lm[LM.forehead].y * H;
  const stripH = Math.floor(H * 0.10);
  const stripW = Math.floor(W * 0.22);
  const x0 = Math.max(0, Math.floor(headTopX - stripW / 2));
  const x1 = Math.min(W, x0 + stripW);
  const y1 = Math.floor(headTopY);
  const y0 = Math.max(0, y1 - stripH);

  let total = 0, hairCount = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Hair: significantly darker than skin reference, OR low saturation high color variance
      const isHair = lum < skinLum - 35 || (lum < 90 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18);
      if (isHair) hairCount++;
      total++;
    }
  }
  const coverage = hairCount / Math.max(1, total);
  // Coverage 0.5+ = thick hair (10), 0.15- = thin/balding (4)
  return clampSoft(mapTo10(coverage, 0.45, 0.75, 0.45, "higher"));
}

/* ─────────────────────────────────────────────
   PIXEL HELPERS
   ───────────────────────────────────────────── */

/** Sample stats for a patch centered on (cx, cy) of size px. Returns mean/std of luminance + color std. */
function sampleStats(
  img: ImageData,
  cx: number,
  cy: number,
  size: number
): { lumMean: number; lumStd: number; colorStd: number } | null {
  const W = img.width, H = img.height;
  const half = Math.floor(size / 2);
  const x0 = Math.max(0, Math.floor(cx - half));
  const y0 = Math.max(0, Math.floor(cy - half));
  const x1 = Math.min(W, x0 + size);
  const y1 = Math.min(H, y0 + size);
  if (x1 <= x0 || y1 <= y0) return null;

  let n = 0, sumL = 0, sumL2 = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let sumR2 = 0, sumG2 = 0, sumB2 = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      n++;
      sumL += l; sumL2 += l * l;
      sumR += r; sumG += g; sumB += b;
      sumR2 += r * r; sumG2 += g * g; sumB2 += b * b;
    }
  }
  if (n === 0) return null;
  const lumMean = sumL / n;
  const lumVar = Math.max(0, sumL2 / n - lumMean * lumMean);
  const lumStd = Math.sqrt(lumVar);
  const rStd = Math.sqrt(Math.max(0, sumR2 / n - (sumR / n) ** 2));
  const gStd = Math.sqrt(Math.max(0, sumG2 / n - (sumG / n) ** 2));
  const bStd = Math.sqrt(Math.max(0, sumB2 / n - (sumB / n) ** 2));
  const colorStd = (rStd + gStd + bStd) / 3;
  return { lumMean, lumStd, colorStd };
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Slight upward bias — comedy app, not destroyer.
 * Pushes mid scores (5–7) gently upward toward 6–7.5.
 */
function clampSoft(v: number) {
  const x = Math.max(3.0, Math.min(10.0, v));
  // Bias: lift values <8 by up to +0.5
  if (x < 8) return Math.min(10, x + (8 - x) * 0.06);
  return x;
}

/* ─────────────────────────────────────────────
   ENTRY POINT
   ───────────────────────────────────────────── */

export function scoreFace(landmarks: Pt[], image: ImageData): FaceScores {
  const eyes = scoreEyes(landmarks);
  const skin = scoreSkin(landmarks, image);
  const jawline = scoreJawline(landmarks);
  const hair = scoreHair(landmarks, image);
  const symmetry = scoreSymmetry(landmarks);
  const harmony = scoreHarmony(landmarks);

  const overall = clampSoft(
    eyes * 0.18 +
      skin * 0.18 +
      jawline * 0.20 +
      hair * 0.10 +
      symmetry * 0.16 +
      harmony * 0.18
  );
  const bump = (v: number) => round(Math.min(10, v + 1));
  return {
    eyes: bump(eyes),
    skin: bump(skin),
    jawline: bump(jawline),
    hair: bump(hair),
    symmetry: bump(symmetry),
    harmony: bump(harmony),
    overall: bump(overall),
  };
}

function round(v: number) { return Math.round(v * 10) / 10; }

/* ─────────────────────────────────────────────
   TIER LABELS
   ───────────────────────────────────────────── */
export type Tier = {
  label: string;
  className: string;
  rank: number;
};

export function tierFor(overall: number): Tier {
  if (overall >= 9.0) return { label: "Untouchable", className: "tier-untouchable", rank: 6 };
  if (overall >= 8.0) return { label: "Elite",       className: "tier-elite",       rank: 5 };
  if (overall >= 7.0) return { label: "Solid",       className: "tier-solid",       rank: 4 };
  if (overall >= 6.0) return { label: "Above Mid",   className: "tier-above-mid",   rank: 3 };
  if (overall >= 5.0) return { label: "Mid",         className: "tier-mid",         rank: 2 };
  if (overall >= 4.0) return { label: "Cooked",      className: "tier-cooked",      rank: 1 };
  return                     { label: "Joever",      className: "tier-joever",      rank: 0 };
}
