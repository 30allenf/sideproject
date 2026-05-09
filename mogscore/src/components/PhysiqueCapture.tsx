"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { meanLuminance } from "@/lib/photo";
import type { CaptureResult } from "./CaptureScreen";

type Props = {
  onCaptured: (r: CaptureResult) => void;
  onCancel: () => void;
};

type Phase = "loading" | "denied" | "live" | "countdown" | "captured";

export default function PhysiqueCapture({ onCaptured, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastNoseRef = useRef<{ x: number; y: number } | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lit, setLit] = useState(false);
  const [still, setStill] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hint, setHint] = useState("starting camera…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (cancelled) return;
        setPhase("live");
        setHint("lift your shirt · frame your abs in the box");
        startTracking();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setPhase("denied");
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTracking() {
    let lastLuma = performance.now();
    let cachedLuma = 100;
    let lastPx: { x: number; y: number } | null = null;

    const tick = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      const t = performance.now();

      if (t - lastLuma > 300) { cachedLuma = meanLuminance(v); lastLuma = t; }

      // Motion: sample a pixel near center of frame between frames
      let motion = 0;
      const W = v.videoWidth, H = v.videoHeight;
      if (W > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(v, W * 0.48, H * 0.48, 4, 4, 0, 0, 4, 4);
        const px = { x: ctx.getImageData(0,0,4,4).data[0], y: ctx.getImageData(0,0,4,4).data[1] };
        if (lastPx) motion = Math.hypot(px.x - lastPx.x, px.y - lastPx.y);
        lastPx = px;
        lastNoseRef.current = { x: px.x, y: px.y };
      }

      const isLit = cachedLuma > 45;
      const isStill = motion < 14;
      setLit(isLit);
      setStill(isStill);

      if (!isLit) setHint("need more light — face a window or bright lamp");
      else if (!isStill) setHint("hold steady…");
      else setHint("looks good — hit Capture when ready");

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function triggerCapture() {
    if (phase !== "live") return;
    setPhase("countdown");
    let n = 3;
    setCountdown(n);
    const id = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(id); setCountdown(null); captureNow(); }
      else setCountdown(n);
    }, 800);
  }

  function captureNow() {
    const v = videoRef.current;
    if (!v) return;
    setPhase("captured");

    const W = v.videoWidth, H = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const imageData = ctx.getImageData(0, 0, W, H);

    // Crop the central midsection region for the portrait photo
    const cx = Math.floor(W * 0.225), cy = Math.floor(H * 0.175);
    const cw = Math.floor(W * 0.55), ch = Math.floor(H * 0.65);
    const side = Math.min(cw, ch);
    const out = document.createElement("canvas");
    const target = Math.min(512, side);
    out.width = target; out.height = target;
    out.getContext("2d")!.drawImage(canvas, cx, cy, side, side, 0, 0, target, target);
    const jpegDataUrl = out.toDataURL("image/jpeg", 0.82);

    onCaptured({ imageData, jpegDataUrl, landmarks: null });
  }

  if (phase === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="max-w-[520px] text-center mount">
          <div className="eyebrow mb-3">Camera Blocked</div>
          <h1 className="display-l mb-4">Camera needed.</h1>
          <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-bone-2 mb-2 opacity-70">
            Allow webcam access in your browser, then retry.
          </p>
          {errorMsg && <p className="font-mono text-[10px] text-blood mt-2">{errorMsg}</p>}
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
      <div className="eyebrow mb-3">Physique · Step 3 of 3</div>
      <h1 className="display-l mb-2 text-center">
        {phase === "loading" ? "Awakening the lens…" : "Frame your abs."}
      </h1>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-bone-2 opacity-60 mb-6 text-center">
        Lift your shirt · center your midsection · good lighting
      </p>

      <div className="relative w-full max-w-[640px] aspect-[4/3] bg-arena-2 fight-card overflow-hidden mb-6">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          playsInline autoPlay muted
        />

        {/* Abs framing box */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 75" preserveAspectRatio="none">
          {/* Dim outside the box */}
          <path
            fillRule="evenodd"
            fill="rgba(10,6,6,0.45)"
            d="M0 0 H100 V75 H0 Z M22 13 H78 V62 H22 Z"
          />
          {/* Box border */}
          <rect
            x="22" y="13" width="56" height="49"
            fill="none"
            stroke={lit && still ? "var(--color-gold)" : "rgba(212,169,58,0.45)"}
            strokeWidth={lit && still ? "0.6" : "0.4"}
            strokeDasharray={lit && still ? undefined : "2 2"}
            style={{ transition: "all 200ms" }}
          />
          {/* Corner marks */}
          {([[22,13,1,1],[78,13,-1,1],[22,62,1,-1],[78,62,-1,-1]] as [number,number,number,number][]).map(([x,y,sx,sy],i)=>(
            <g key={i}>
              <line x1={x} y1={y} x2={x+sx*5} y2={y} stroke="var(--color-gold)" strokeWidth="0.8"/>
              <line x1={x} y1={y} x2={x} y2={y+sy*5} stroke="var(--color-gold)" strokeWidth="0.8"/>
            </g>
          ))}
          {/* Center crosshair */}
          <line x1="50" y1="35" x2="50" y2="41" stroke="rgba(212,169,58,0.4)" strokeWidth="0.4"/>
          <line x1="47" y1="38" x2="53" y2="38" stroke="rgba(212,169,58,0.4)" strokeWidth="0.4"/>
        </svg>

        {/* Countdown */}
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

        {/* Hint pill */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-arena-2/85 border border-[rgba(212,169,58,0.3)] font-mono text-[10px] tracking-[0.24em] uppercase text-bone-2 whitespace-nowrap">
          {hint}
        </div>
      </div>

      {/* Cues */}
      <div className="flex gap-3 mb-8">
        <Cue label="Lit" ok={lit} />
        <Cue label="Still" ok={still} />
      </div>

      {/* Capture button */}
      <div className="flex gap-3">
        {phase === "live" && (
          <button onClick={triggerCapture} className="arena-btn px-10">
            ◉ Capture
          </button>
        )}
        <button onClick={onCancel} className="ghost-btn">Cancel</button>
      </div>
    </div>
  );
}

function Cue({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-[0.22em] uppercase font-semibold"
      style={{
        background: ok ? "rgba(212,169,58,0.18)" : "rgba(28,16,16,0.6)",
        border: `1px solid ${ok ? "rgba(212,169,58,0.5)" : "rgba(212,169,58,0.15)"}`,
        color: ok ? "var(--color-gold)" : "var(--color-mute)",
        transition: "all 150ms",
      }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "var(--color-gold)" : "var(--color-mute)" }} />
      {label}
    </div>
  );
}
