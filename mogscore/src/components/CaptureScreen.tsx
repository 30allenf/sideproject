"use client";

/**
 * Capture screen — webcam preview, oval alignment guide, live coaching cues,
 * 3-2-1 countdown when all cues green for ~1.5s, then capture frame.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFaceLandmarker, type Landmarks } from "@/lib/face-landmarker";
import { computeCues, meanLuminance, captureImageData, cropFaceSquare } from "@/lib/photo";

export type CaptureResult = {
  imageData: ImageData;
  jpegDataUrl: string;
  landmarks: Landmarks | null;
};

type Props = {
  onCaptured: (r: CaptureResult) => void;
  onCancel: () => void;
};

type Phase = "loading" | "denied" | "live" | "countdown" | "captured";

export default function CaptureScreen({ onCaptured, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastNoseRef = useRef<{ x: number; y: number } | null>(null);
  const greenSinceRef = useRef<number | null>(null);
  const lastTimeRef = useRef(-1);

  const [phase, setPhase] = useState<Phase>("loading");
  const phaseRef = useRef<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cues, setCues] = useState({ centered: false, straight: false, lit: false, still: false, allGreen: false });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hint, setHint] = useState<string>("starting camera…");
  const [liveFor, setLiveFor] = useState(0);
  const liveStartRef = useRef<number | null>(null);
  const noFaceSinceRef = useRef<number | null>(null);

  // Keep phaseRef in sync so RAF closure always reads current phase
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Camera + landmarker init ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setHint("loading face model…");
        await getFaceLandmarker();
        if (cancelled) return;
        setPhase("live");
        setHint("center your face in the oval");
        startTracking();
      } catch (e) {
        console.error(e);
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setPhase("denied");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tracking loop ──
  function startTracking() {
    let pollLuma = performance.now();
    let cachedLuma = 100;
    liveStartRef.current = performance.now();

    const tick = async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = performance.now();

      // Update "live for N seconds" counter so manual button can appear
      if (liveStartRef.current !== null) {
        setLiveFor(Math.floor((t - liveStartRef.current) / 1000));
      }

      let lm: Landmarks | null = null;
      // Detection (~10–15 fps is enough for cues)
      if (v.currentTime !== lastTimeRef.current) {
        lastTimeRef.current = v.currentTime;
        try {
          const fl = await getFaceLandmarker();
          const r = fl.detectForVideo(v, t);
          lm = r.faceLandmarks?.[0] ?? null;
        } catch {}
      }
      // Luma every 200 ms
      if (t - pollLuma > 200) {
        cachedLuma = meanLuminance(v);
        pollLuma = t;
      }

      // Motion: nose tip displacement frame-to-frame
      let motion = 0;
      if (lm) {
        const nose = lm[1];
        const px = { x: nose.x * v.videoWidth, y: nose.y * v.videoHeight };
        if (lastNoseRef.current) motion = Math.hypot(px.x - lastNoseRef.current.x, px.y - lastNoseRef.current.y);
        lastNoseRef.current = px;
        noFaceSinceRef.current = null;
      } else {
        if (noFaceSinceRef.current === null) noFaceSinceRef.current = t;
      }

      const c = computeCues({
        landmarks: lm,
        meanLuma: cachedLuma,
        motionPx: motion,
        imgW: v.videoWidth,
        imgH: v.videoHeight,
      });
      setCues(c);

      // Hint logic
      const noFaceSec = noFaceSinceRef.current !== null ? (t - noFaceSinceRef.current) / 1000 : 0;
      if (!lm && noFaceSec > 3) setHint("no face detected — move closer or improve lighting");
      else if (!lm) setHint("show your face to the camera");
      else if (!c.centered) setHint("center your face in the oval");
      else if (!c.straight) setHint("look straight at the camera");
      else if (!c.lit) setHint("need more light — face a window or lamp");
      else if (!c.still) setHint("hold still…");
      else setHint("locking in…");

      // Draw landmarks lightly on overlay
      drawOverlay(overlayRef.current, lm, c.allGreen);

      // Auto-fire countdown when all green for 1.5s — use phaseRef to avoid stale closure
      if (c.allGreen) {
        if (greenSinceRef.current === null) greenSinceRef.current = t;
        if (t - greenSinceRef.current > 1500 && phaseRef.current === "live") {
          phaseRef.current = "countdown";
          setPhase("countdown");
          beginCountdown(lm);
        }
      } else {
        greenSinceRef.current = null;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function beginCountdown(initialLm: Landmarks | null) {
    let n = 3;
    setCountdown(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(null);
        // Fire capture from the latest video frame
        captureNow(initialLm);
      } else {
        setCountdown(n);
      }
    }, 800);
  }

  async function captureNow(_initialLm: Landmarks | null) {
    const v = videoRef.current;
    if (!v) return;
    setPhase("captured");

    // Get one final detection on the captured frame so landmarks match exactly
    const fl = await getFaceLandmarker();
    const t = performance.now();
    const detect = fl.detectForVideo(v, t);
    let lm = detect.faceLandmarks?.[0] ?? null;

    if (!lm) {
      // If a manual capture was forced and we still can't detect, use last good landmarks from the RAF loop
      // by re-attempting one more time, then give up gracefully
      setHint("face not detected — retrying…");
      await new Promise((r) => setTimeout(r, 300));
      const r2 = fl.detectForVideo(v, performance.now());
      lm = r2.faceLandmarks?.[0] ?? null;
    }
    if (!lm) {
      setHint("couldn't read your face — move closer and retry");
      phaseRef.current = "live";
      setPhase("live");
      greenSinceRef.current = null;
      return;
    }

    // Capture the frame as ImageData (mirrored to match preview)
    const { imageData, canvas } = captureImageData(v);
    // Mirror the landmarks in x to match the mirrored canvas:
    const mirroredLm: Landmarks = lm.map((p) => ({ ...p, x: 1 - p.x }));
    const jpegDataUrl = cropFaceSquare(canvas, mirroredLm, 512, 0.7);
    onCaptured({ imageData, jpegDataUrl, landmarks: mirroredLm });
  }

  if (phase === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="max-w-[520px] text-center mount">
          <div className="eyebrow mb-3">Camera Blocked</div>
          <h1 className="display-l mb-4">We need the camera<br/>to mog you.</h1>
          <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-bone-2 mb-2 opacity-70">
            Allow webcam access in your browser, then retry.
          </p>
          {errorMsg && (
            <p className="font-mono text-[10px] tracking-[0.12em] text-blood mt-2 normal-case">
              {errorMsg}
            </p>
          )}
          <div className="flex gap-3 justify-center mt-8">
            <button className="ghost-btn" onClick={onCancel}>Back</button>
            <button className="arena-btn" onClick={() => location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="eyebrow mb-3">Step 3 of 3</div>
      <h1 className="display-l mb-6 text-center">{phase === "loading" ? "Awakening the lens…" : "Step into frame."}</h1>

      <div className="relative w-full max-w-[640px] aspect-[4/3] bg-arena-2 fight-card overflow-hidden mb-6">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          playsInline
          autoPlay
          muted
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Oval alignment guide */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 75" preserveAspectRatio="none">
          <ellipse
            cx="50" cy="38" rx="20" ry="28"
            fill="none"
            stroke={cues.allGreen ? "var(--color-gold)" : "rgba(212, 169, 58, 0.4)"}
            strokeWidth={cues.allGreen ? "0.6" : "0.4"}
            strokeDasharray={cues.allGreen ? undefined : "1.5 1.5"}
            style={{ transition: "all 200ms" }}
          />
        </svg>

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="huge text-gold" style={{ textShadow: "0 0 60px var(--color-gold)" }}>
                {countdown}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint pill bottom-center */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-arena-2/85 border border-[rgba(212,169,58,0.3)] font-mono text-[10px] tracking-[0.24em] uppercase text-bone-2">
          {hint}
        </div>
      </div>

      {/* Cues row */}
      <div className="flex gap-2 flex-wrap justify-center max-w-[640px] mb-8">
        <Cue label="Centered" ok={cues.centered} />
        <Cue label="Straight" ok={cues.straight} />
        <Cue label="Lit" ok={cues.lit} />
        <Cue label="Still" ok={cues.still} />
      </div>

      <div className="flex gap-3">
        {/* Manual capture fallback — appears after 5s in case cues stay red */}
        {liveFor >= 5 && phase === "live" && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => {
              if (phaseRef.current !== "live") return;
              phaseRef.current = "countdown";
              setPhase("countdown");
              beginCountdown(null);
            }}
            className="arena-btn"
          >
            Capture Anyway
          </motion.button>
        )}
        <button onClick={onCancel} className="ghost-btn">Cancel</button>
      </div>
    </div>
  );
}

function Cue({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-[0.22em] uppercase font-semibold"
      style={{
        background: ok ? "rgba(212, 169, 58, 0.18)" : "rgba(28, 16, 16, 0.6)",
        border: `1px solid ${ok ? "rgba(212, 169, 58, 0.5)" : "rgba(212, 169, 58, 0.15)"}`,
        color: ok ? "var(--color-gold)" : "var(--color-mute)",
        transition: "all 150ms",
      }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: ok ? "var(--color-gold)" : "var(--color-mute)" }} />
      {label}
    </div>
  );
}

/* Lightweight landmark draw on overlay (subset of points, not full mesh) */
function drawOverlay(c: HTMLCanvasElement | null, lm: Landmarks | null, green: boolean) {
  if (!c) return;
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  ctx.fillStyle = green ? "rgba(240, 203, 94, 0.85)" : "rgba(212, 169, 58, 0.55)";
  // Sample every 8th landmark — subtle, not noisy
  for (let i = 0; i < lm.length; i += 8) {
    const p = lm[i];
    const x = (1 - p.x) * w; // mirror to match preview
    const y = p.y * h;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
