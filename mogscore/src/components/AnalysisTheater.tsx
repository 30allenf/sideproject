"use client";

/**
 * Analysis theater — the cinematic 3.5-second moment between capture and result.
 * Animated landmark dots, vertical scan lines, category labels lighting up
 * one-by-one. Scoring runs instantly under the hood; the delay is pure drama.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Landmarks } from "@/lib/face-landmarker";

type Props = {
  jpegDataUrl: string;
  landmarks: Landmarks | null;
  onDone: () => void;
  categories?: string[];
};

const FACE_CATS = ["Eyes", "Skin", "Jawline", "Hair", "Symmetry", "Harmony"];
const PHYSIQUE_CATS = ["Definition", "Symmetry", "Tone", "Lines", "Conditioning"];

export default function AnalysisTheater({ jpegDataUrl, landmarks, onDone, categories }: Props) {
  const CATEGORIES = categories ?? FACE_CATS;
  void PHYSIQUE_CATS; // referenced via prop
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [scanY, setScanY] = useState(0);
  const [activeCats, setActiveCats] = useState<Set<number>>(new Set());

  // Sample ~80 landmark points to dot
  const dots = useMemo(() => {
    if (!landmarks) return [];
    const result: { x: number; y: number; delay: number }[] = [];
    for (let i = 0; i < landmarks.length; i += 6) {
      result.push({
        x: landmarks[i].x,
        y: landmarks[i].y,
        delay: 0.4 + (i / landmarks.length) * 1.6,
      });
    }
    return result;
  }, [landmarks]);

  // Image dimensions for proper scaling
  useEffect(() => {
    const i = new Image();
    i.onload = () => setImgSize({ w: i.naturalWidth, h: i.naturalHeight });
    i.src = jpegDataUrl;
  }, [jpegDataUrl]);

  // Scan line: 0 → 1 over 2.6s
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      const y = Math.min(1, elapsed / 2600);
      setScanY(y);
      if (y < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Categories light up one-by-one starting at 1.0s, every 380ms
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    CATEGORIES.forEach((_, i) => {
      timeouts.push(setTimeout(() => {
        setActiveCats((prev) => new Set(prev).add(i));
      }, 1000 + i * 380));
    });
    timeouts.push(setTimeout(onDone, 1000 + CATEGORIES.length * 380 + 700));
    return () => { timeouts.forEach(clearTimeout); };
  }, [onDone]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="eyebrow mb-6">Analysis · in progress</div>
      <div className="grid grid-cols-1 md:grid-cols-[480px_1fr] gap-8 max-w-[1100px] w-full items-start">
        {/* Capture with overlay */}
        <div ref={containerRef} className="relative aspect-square fight-card gold-edge overflow-hidden">
          <img src={jpegDataUrl} alt="capture" className="absolute inset-0 w-full h-full object-cover" />

          {/* Vertical scan line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: scanY < 1 ? 1 : 0 }}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${scanY * 100}%`,
              height: "3px",
              background: "linear-gradient(90deg, transparent, var(--color-gold-2), transparent)",
              boxShadow: "0 0 18px var(--color-gold-2)",
            }}
          />
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: 0,
              height: `${scanY * 100}%`,
              background: "linear-gradient(180deg, rgba(212, 169, 58, 0.05) 0%, rgba(212, 169, 58, 0.18) 95%, transparent 100%)",
              transition: "height 0.05s linear",
            }}
          />

          {/* Animated landmark dots */}
          {imgSize && dots.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: d.delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute rounded-full"
              style={{
                left: `${d.x * 100}%`,
                top: `${d.y * 100}%`,
                width: 4,
                height: 4,
                marginLeft: -2,
                marginTop: -2,
                background: "var(--color-gold-2)",
                boxShadow: "0 0 6px var(--color-gold-2)",
              }}
            />
          ))}

          {/* Corner brackets */}
          {([
            ["top:8px;left:8px", "top:0;left:0", "0 0"],
            ["top:8px;right:8px", "top:0;right:0", "0 100%"],
            ["bottom:8px;left:8px", "bottom:0;left:0", "100% 0"],
            ["bottom:8px;right:8px", "bottom:0;right:0", "100% 100%"],
          ] as const).map(([pos], i) => {
            const styleParts = pos.split(";").reduce<Record<string, string>>((acc, kv) => {
              const [k, v] = kv.split(":");
              acc[k.trim()] = v.trim();
              return acc;
            }, {});
            return (
              <div
                key={i}
                className="absolute w-5 h-5 border-gold pointer-events-none"
                style={{
                  ...styleParts,
                  borderTop: i < 2 ? "2px solid var(--color-gold)" : "none",
                  borderBottom: i >= 2 ? "2px solid var(--color-gold)" : "none",
                  borderLeft: i % 2 === 0 ? "2px solid var(--color-gold)" : "none",
                  borderRight: i % 2 === 1 ? "2px solid var(--color-gold)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* Category list lighting up */}
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c, i) => {
            const active = activeCats.has(i);
            return (
              <motion.div
                key={c}
                animate={{ opacity: active ? 1 : 0.15, x: active ? 0 : -10 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-4 fight-card px-5 py-4"
                style={{
                  borderColor: active ? "rgba(212, 169, 58, 0.7)" : "rgba(212, 169, 58, 0.1)",
                  boxShadow: active ? "0 0 24px rgba(212, 169, 58, 0.18)" : "none",
                }}
              >
                <span
                  className="font-mono text-[10px] tracking-[0.32em] uppercase"
                  style={{ color: active ? "var(--color-gold)" : "var(--color-mute)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="font-display text-2xl tracking-[0.04em] uppercase"
                  style={{ color: active ? "var(--color-bone)" : "var(--color-mute)" }}
                >
                  {c}
                </span>
                {active && (
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5 }}
                    className="ml-auto h-px max-w-[120px] bg-gold opacity-50"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
