"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import LandingScreen from "@/components/LandingScreen";
import NameScreen from "@/components/NameScreen";
import ModeScreen, { type Mode } from "@/components/ModeScreen";
import CaptureScreen, { type CaptureResult } from "@/components/CaptureScreen";
import PhysiqueCapture from "@/components/PhysiqueCapture";
import AnalysisTheater from "@/components/AnalysisTheater";
import ResultsScreen from "@/components/ResultsScreen";
import { scoreFace, type FaceScores } from "@/lib/face-scoring";
import { scoreAbsWithName, type PhysiqueScores } from "@/lib/abs-scoring";
import { getBackend } from "@/lib/backend";

type Screen = "landing" | "name" | "mode" | "capture" | "analysis" | "transition" | "capture2" | "analysis2" | "results";

const NAME_KEY = "mogscore.name.v1";
const PHYSIQUE_CATS = ["Definition", "Symmetry", "Tone", "Lines", "Conditioning"];

export default function Page() {
  const [screen, setScreen]   = useState<Screen>("landing");
  const [name, setName]       = useState("");
  const [mode, setMode]       = useState<Mode>("face");

  const [capture,  setCapture]  = useState<CaptureResult | null>(null); // face (or physique in body mode)
  const [capture2, setCapture2] = useState<CaptureResult | null>(null); // physique (combine only)
  const [faceScores,     setFaceScores]     = useState<FaceScores | null>(null);
  const [physiqueScores, setPhysiqueScores] = useState<PhysiqueScores | null>(null);

  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [submitted,    setSubmitted]    = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) setName(stored);
  }, []);

  function start() { setScreen("name"); }
  function continueFromName(n: string) { setName(n); localStorage.setItem(NAME_KEY, n); setScreen("mode"); }
  function pickMode(m: Mode) { setMode(m); setScreen("capture"); }

  // First capture (face for face/combine modes; physique for body mode)
  function onCaptured(r: CaptureResult) {
    setCapture(r);
    if (mode === "body") {
      setPhysiqueScores(scoreAbsWithName(r.imageData));
      setScreen("analysis");
    } else {
      setFaceScores(scoreFace(r.landmarks as { x: number; y: number }[], r.imageData));
      setScreen("analysis");
    }
  }

  function onAnalysisDone() {
    if (mode === "combine") {
      setScreen("transition"); // show "Face scored — now show abs" bridge
    } else {
      setScreen("results");
    }
  }

  // Second capture (physique, combine mode only)
  function onCaptured2(r: CaptureResult) {
    setCapture2(r);
    setPhysiqueScores(scoreAbsWithName(r.imageData));
    setScreen("analysis2");
  }

  function onAnalysis2Done() { setScreen("results"); }

  function onRescan() {
    setCapture(null); setCapture2(null);
    setFaceScores(null); setPhysiqueScores(null);
    setSubmitError(null); setSubmitted(false);
    setScreen("mode");
  }

  async function handleShare() {
    if (submitting || submitted) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const backend = await getBackend();
      if (mode === "face" && faceScores && capture) {
        await backend.submit({
          name, mode: "face",
          photo_url: capture.jpegDataUrl, body_photo_url: null,
          overall: faceScores.overall,
          eyes: faceScores.eyes, skin: faceScores.skin, jawline: faceScores.jawline,
          hair: faceScores.hair, symmetry: faceScores.symmetry, harmony: faceScores.harmony,
        });
      } else if (mode === "body" && physiqueScores && capture) {
        await backend.submit({
          name, mode: "body",
          photo_url: null, body_photo_url: capture.jpegDataUrl,
          overall: physiqueScores.overall,
          abs: physiqueScores.definition, muscle_def: physiqueScores.lines,
          body_symmetry: physiqueScores.symmetry, stance: physiqueScores.conditioning, posture: physiqueScores.tone,
        });
      } else if (mode === "combine" && faceScores && physiqueScores && capture && capture2) {
        const combined = Math.round(Math.min(10, faceScores.overall * 0.6 + physiqueScores.overall * 0.4) * 10) / 10;
        await backend.submit({
          name, mode: "combine",
          photo_url: capture.jpegDataUrl, body_photo_url: capture2.jpegDataUrl,
          overall: combined,
          eyes: faceScores.eyes, skin: faceScores.skin, jawline: faceScores.jawline,
          hair: faceScores.hair, symmetry: faceScores.symmetry, harmony: faceScores.harmony,
          abs: physiqueScores.definition, muscle_def: physiqueScores.lines,
          body_symmetry: physiqueScores.symmetry, stance: physiqueScores.conditioning, posture: physiqueScores.tone,
        });
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Screens ──
  if (screen === "landing") return <LandingScreen onEnter={start} />;
  if (screen === "name")    return <NameScreen initial={name} onContinue={continueFromName} onBack={() => setScreen("landing")} />;
  if (screen === "mode")    return <ModeScreen onSelect={pickMode} onBack={() => setScreen("name")} />;

  if (screen === "capture") {
    if (mode === "body")    return <PhysiqueCapture onCaptured={onCaptured} onCancel={() => setScreen("mode")} />;
    return <CaptureScreen onCaptured={onCaptured} onCancel={() => setScreen("mode")} />;
  }

  if (screen === "analysis" && capture) {
    const cats = mode === "body" ? PHYSIQUE_CATS : undefined;
    return <AnalysisTheater jpegDataUrl={capture.jpegDataUrl} landmarks={capture.landmarks} onDone={onAnalysisDone} categories={cats} />;
  }

  // Bridge screen between face scan and abs scan (Overall mode)
  if (screen === "transition") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="eyebrow mb-4">Round 1 Complete</div>
          <div className="display-l mb-2">Face scored.</div>
          <div className="font-heavy text-6xl mb-2" style={{ color: "var(--color-gold-2)" }}>
            {faceScores?.overall.toFixed(1)}
          </div>
          <div className="font-mono text-[12px] tracking-[0.2em] uppercase text-bone-2 opacity-70 mb-10">
            Now show your abs for Round 2.
          </div>
          <button onClick={() => setScreen("capture2")} className="arena-btn">
            ▶ Start Physique Scan
          </button>
        </motion.div>
      </div>
    );
  }

  if (screen === "capture2") {
    return <PhysiqueCapture onCaptured={onCaptured2} onCancel={() => setScreen("mode")} />;
  }

  if (screen === "analysis2" && capture2) {
    return <AnalysisTheater jpegDataUrl={capture2.jpegDataUrl} landmarks={null} onDone={onAnalysis2Done} categories={PHYSIQUE_CATS} />;
  }

  if (screen === "results") {
    const primaryCapture = capture!;
    const primaryScores = mode === "body" ? physiqueScores! : faceScores!;
    return (
      <ResultsScreen
        mode={mode === "combine" ? "combine" : mode === "body" ? "body" : "face"}
        name={name}
        jpegDataUrl={mode === "body" ? primaryCapture.jpegDataUrl : primaryCapture.jpegDataUrl}
        physiquejpegDataUrl={capture2?.jpegDataUrl}
        scores={primaryScores}
        faceScores={faceScores ?? undefined}
        physiqueScores={physiqueScores ?? undefined}
        submitting={submitting}
        submitError={submitError}
        submitted={submitted}
        onShare={handleShare}
        onRescan={onRescan}
      />
    );
  }

  return <LandingScreen onEnter={start} />;
}
