"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { tierFor, type FaceScores } from "@/lib/face-scoring";
import type { PhysiqueScores } from "@/lib/abs-scoring";
import StatCard from "./StatCard";
import { toPng } from "html-to-image";

type Props = {
  mode: "face" | "body" | "combine";
  name: string;
  jpegDataUrl: string;
  physiquejpegDataUrl?: string;
  scores: FaceScores | PhysiqueScores;         // primary display score
  faceScores?: FaceScores;                     // combine mode
  physiqueScores?: PhysiqueScores;             // combine mode
  submitting: boolean;
  submitError?: string | null;
  submitted: boolean;
  onShare: () => void;
  onRescan: () => void;
};

const FACE_CATS:     (keyof FaceScores)[]     = ["eyes","skin","jawline","hair","symmetry","harmony"];
const PHYSIQUE_CATS: (keyof PhysiqueScores)[] = ["definition","symmetry","tone","lines","conditioning"];

export default function ResultsScreen({
  mode, name, jpegDataUrl, physiquejpegDataUrl,
  scores, faceScores, physiqueScores,
  submitting, submitError, submitted, onShare, onRescan,
}: Props) {
  const [declined, setDeclined] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // For combine, compute weighted overall
  const displayScore = mode === "combine" && faceScores && physiqueScores
    ? Math.round(Math.min(10, faceScores.overall * 0.6 + physiqueScores.overall * 0.4) * 10) / 10
    : scores.overall;

  const tier = tierFor(displayScore);
  const modeLabel = mode === "combine" ? "Overall" : mode === "body" ? "Physique" : "Face";

  const faceCats    = FACE_CATS.map(k    => ({ k: k as string, v: (faceScores     as Record<string,number> | undefined)?.[k] ?? (scores as Record<string,number>)[k] ?? 0 }));
  const physiqueCats = PHYSIQUE_CATS.map(k => ({ k: k as string, v: (physiqueScores as Record<string,number> | undefined)?.[k] ?? (scores as Record<string,number>)[k] ?? 0 }));

  const primaryCats = mode === "body" ? physiqueCats : faceCats;
  const top3 = [...primaryCats].sort((a, b) => b.v - a.v).slice(0, 3);

  async function downloadShareCard() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const png = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#0a0606" });
      const a = document.createElement("a");
      a.href = png; a.download = `mogscore-${name}-${Date.now()}.png`; a.click();
    } catch (e) { console.error(e); }
    setDownloading(false);
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-[1100px] mx-auto">

        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="eyebrow mb-1">{modeLabel} Verdict for {name}</div>
          <div className="huge flex items-baseline justify-center gap-4 leading-none">
            <span style={{ color: "var(--color-gold-2)", textShadow: "0 0 30px var(--color-gold)" }}>
              {displayScore.toFixed(1)}
            </span>
            <span className="font-mono text-2xl tracking-[0.32em] text-mute">/10</span>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className={`mt-4 display-l ${tier.className}`}
            style={{ textShadow: "0 0 40px currentColor" }}
          >
            {tier.label}
          </motion.div>

          {/* Combine breakdown */}
          {mode === "combine" && faceScores && physiqueScores && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex justify-center gap-6 mt-4"
            >
              <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-mute">
                Face <span className="text-bone ml-1">{faceScores.overall.toFixed(1)}</span>
                <span className="text-mute ml-1">× 60%</span>
              </div>
              <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-mute">+</div>
              <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-mute">
                Physique <span className="text-bone ml-1">{physiqueScores.overall.toFixed(1)}</span>
                <span className="text-mute ml-1">× 40%</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Portrait(s) + actions */}
        <div className="grid grid-cols-1 md:grid-cols-[480px_1fr] gap-8 items-start mb-10">
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="fight-card gold-edge p-5"
          >
            {/* For combine mode: two side-by-side photos */}
            {mode === "combine" && physiquejpegDataUrl ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="aspect-square overflow-hidden bg-arena-2">
                  <img src={jpegDataUrl} alt="face" className="w-full h-full object-cover" />
                </div>
                <div className="aspect-square overflow-hidden bg-arena-2">
                  <img src={physiquejpegDataUrl} alt="physique" className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="aspect-square overflow-hidden bg-arena-2 mb-4">
                <img src={jpegDataUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-baseline justify-between border-t border-[rgba(212,169,58,0.3)] pt-4">
              <div>
                <div className="font-mono text-[9px] tracking-[0.32em] uppercase text-gold mb-1">
                  Mogscore · {modeLabel}
                </div>
                <div className="font-display text-3xl tracking-[0.04em] uppercase">{name}</div>
              </div>
              <div className="text-right">
                <div className="font-heavy text-5xl leading-none" style={{ color: "var(--color-gold-2)" }}>
                  {displayScore.toFixed(1)}
                </div>
                <div className={`font-mono text-[10px] tracking-[0.28em] uppercase mt-1 ${tier.className}`}>
                  {tier.label}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {top3.map(({ k, v }) => (
                <div key={k} className="text-center">
                  <div className="font-heavy text-2xl">{v.toFixed(1)}</div>
                  <div className="font-mono text-[8px] tracking-[0.28em] uppercase text-gold mt-1">{k}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="fight-card p-5">
              <div className="eyebrow mb-3">Post to Leaderboard</div>
              {submitted ? (
                <p className="font-mono text-[12px] text-bone-2">
                  Posted. <Link className="underline hover:text-gold" href="/leaderboard">View ranking →</Link>
                </p>
              ) : declined ? (
                <p className="font-mono text-[12px] text-mute">Score kept private.</p>
              ) : submitting ? (
                <p className="font-mono text-[12px] text-bone-2">Posting…</p>
              ) : (
                <>
                  {submitError && <p className="font-mono text-[11px] text-blood mb-3">Error: {submitError}</p>}
                  <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-bone-2 mb-4">
                    Share your score and photo with the world?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={onShare} className="arena-btn text-xs py-2 px-4">Post It</button>
                    <button onClick={() => setDeclined(true)} className="ghost-btn text-xs py-2 px-4">Keep Private</button>
                  </div>
                </>
              )}
            </div>
            <button onClick={downloadShareCard} disabled={downloading} className="gold-btn justify-center">
              {downloading ? "rendering…" : "↓ Download Share Card"}
            </button>
            <button onClick={onRescan} className="arena-btn justify-center">↻ Rescan</button>
            <Link href="/leaderboard" className="ghost-btn justify-center">View Leaderboard</Link>
          </div>
        </div>

        {/* Stat grid(s) */}
        {mode === "combine" ? (
          <>
            <div className="eyebrow mb-4">Face</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {faceCats.map(({ k, v }, i) => <StatCard key={k} category={k} score={v} delay={0.05 + i * 0.08} />)}
            </div>
            <div className="eyebrow mb-4">Physique</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {physiqueCats.map(({ k, v }, i) => <StatCard key={k} category={k} score={v} delay={0.05 + i * 0.08} />)}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {primaryCats.map(({ k, v }, i) => <StatCard key={k} category={k} score={v} delay={0.05 + i * 0.1} />)}
          </div>
        )}
      </div>
    </div>
  );
}
