/**
 * Photo capture + crop utilities.
 * - Capture a still frame from the video element to ImageData (for scoring).
 * - Crop and re-encode to a face-square JPEG dataURL (for display + storage).
 */
import type { Pt } from "./face-scoring";

/** Capture the current frame of `video` as ImageData (full resolution). */
export function captureImageData(video: HTMLVideoElement): {
  imageData: ImageData;
  canvas: HTMLCanvasElement;
} {
  const w = video.videoWidth, h = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(w, 0);
  ctx.scale(-1, 1); // mirror — preview was mirrored, so the canvas matches the user
  ctx.drawImage(video, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  return { imageData, canvas };
}

/**
 * Crop the canvas to a square around the detected face and encode as JPEG.
 * Final size capped at maxPx on each side.
 */
export function cropFaceSquare(
  source: HTMLCanvasElement,
  landmarks: Pt[],
  maxPx = 512,
  quality = 0.6
): string {
  const W = source.width, H = source.height;
  // Bounding box of all landmarks
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = ((minX + maxX) / 2) * W;
  const cy = ((minY + maxY) / 2) * H;
  const faceW = (maxX - minX) * W;
  const faceH = (maxY - minY) * H;
  const side = Math.max(faceW, faceH) * 1.55; // pad ~55%
  const half = side / 2;

  const sx = Math.max(0, cx - half);
  const sy = Math.max(0, cy - half);
  const sSide = Math.min(side, W - sx, H - sy);

  const out = document.createElement("canvas");
  const target = Math.min(maxPx, Math.floor(sSide));
  out.width = target;
  out.height = target;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, sx, sy, sSide, sSide, 0, 0, target, target);
  return out.toDataURL("image/jpeg", quality);
}

/* ─────────────────────────────────────────────
   ALIGNMENT CHECKS for the live coaching cues
   ───────────────────────────────────────────── */

export type AlignmentCues = {
  centered: boolean;
  straight: boolean;
  lit: boolean;
  still: boolean;
  /** All four green = ready for countdown. */
  allGreen: boolean;
};

/**
 * Compute coaching cues from current landmarks + a recent mean luminance value.
 * - centered: face bounding box center within ~12% of frame center
 * - straight: nose–chin angle within ±10° of vertical
 * - lit:      mean frame luminance > 70/255
 * - still:    consecutive nose-tip movement below threshold (caller supplies dxdy)
 */
export function computeCues(opts: {
  landmarks: Pt[] | null;
  meanLuma: number;     // 0..255
  motionPx: number;     // recent nose-tip displacement (pixels)
  imgW: number;
  imgH: number;
}): AlignmentCues {
  const { landmarks, meanLuma, motionPx } = opts;
  if (!landmarks || landmarks.length < 200) {
    return { centered: false, straight: false, lit: meanLuma > 45, still: motionPx < 14, allGreen: false };
  }
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const centered = Math.abs(cx - 0.5) < 0.12 && Math.abs(cy - 0.45) < 0.15;

  // Straight: angle of forehead(10) → chin(152) close to vertical
  const fh = landmarks[10], chin = landmarks[152];
  const angle = Math.atan2(chin.x - fh.x, chin.y - fh.y) * (180 / Math.PI);
  const straight = Math.abs(angle) < 10;

  const lit = meanLuma > 45;
  const still = motionPx < 14;
  return { centered, straight, lit, still, allGreen: centered && straight && lit && still };
}

/** Quick mean luminance over a downsampled grid. ~256 samples, very fast. */
export function meanLuminance(video: HTMLVideoElement): number {
  const w = 32, h = 24;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(video, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  return sum / (w * h);
}
