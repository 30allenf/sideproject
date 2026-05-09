"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, type Transition } from "framer-motion";

type Props = { onEnter: () => void };

/* ── Face landmark geometry (100×120 viewBox) ── */
const JAW  = [[30,105],[25,95],[20,82],[18,68],[18,55],[20,42],[26,30],[34,20],[44,14],[56,14],[66,20],[74,30],[80,42],[82,55],[82,68],[80,82],[75,95],[70,105],[56,112],[50,114],[44,112]];
const L_EYE= [[32,47],[35,44],[39,43],[43,44],[46,47],[43,50],[39,51],[35,50]];
const R_EYE= [[54,47],[57,44],[61,43],[65,44],[68,47],[65,50],[61,51],[57,50]];
const L_BROW=[[30,39],[34,36],[39,35],[44,36],[47,38]];
const R_BROW=[[53,38],[56,36],[61,35],[66,36],[70,39]];
const NOSE = [[50,52],[48,57],[46,62],[44,65],[50,66],[56,65],[54,62],[52,57]];
const MOUTH= [[40,76],[44,73],[50,72],[56,73],[60,76],[56,79],[50,80],[44,79]];
const EXTRAS= [[28,62],[72,62],[50,18],[50,109],[38,60],[62,60],[50,60],[35,47],[65,47]];
const ALL_DOTS = [...JAW,...L_EYE,...R_EYE,...L_BROW,...R_BROW,...NOSE,...MOUTH,...EXTRAS];
const CONTOURS = [JAW,L_EYE,R_EYE,L_BROW,R_BROW,NOSE,MOUTH];
function toPath(pts: number[][]): string {
  const close = pts === L_EYE || pts === R_EYE || pts === MOUTH;
  return pts.map((p,i) => `${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ") + (close?" Z":"");
}

const CATEGORIES = [
  { n:"01", key:"Eyes",     sub:"Canthal tilt · spacing · ratio" },
  { n:"02", key:"Skin",     sub:"Clarity · evenness · texture" },
  { n:"03", key:"Jawline",  sub:"Chin angle · definition" },
  { n:"04", key:"Hair",     sub:"Coverage · hairline" },
  { n:"05", key:"Symmetry", sub:"Mirror-pair landmarks" },
  { n:"06", key:"Harmony",  sub:"Thirds · fifths · proportion" },
];

const MOCK = [
  { name:"PRIYA K.",   score:7.6, tier:"Solid",     cls:"tier-solid",     cats:[7.8,8.2,7.1,7.4,7.9,7.2], col:"#c0c0c0" },
  { name:"DAISUKE T.", score:6.9, tier:"Above Mid", cls:"tier-above-mid", cats:[6.4,7.1,7.3,6.8,6.9,6.7], col:"#cd7f32" },
];

const MARQUEE_TEXT = ["EYES","SKIN","JAWLINE","HAIR","SYMMETRY","HARMONY"];

const STATS = [
  { v:"478", label:"Face Points" },
  { v:"6",   label:"Categories" },
  { v:"1",   label:"Score / 10" },
  { v:"∞",   label:"Ranked Global" },
];

/* ── Animation stagger helpers ── */
const EASE = [0.16,1,0.3,1] as const;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.75, delay, ease: EASE } as Transition,
});

export default function LandingScreen({ onEnter }: Props) {
  const [scanY, setScanY] = useState(0);
  const [dotsOn, setDotsOn] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const rafRef = useRef<number|null>(null);
  const t0Ref  = useRef<number|null>(null);
  const SCAN_MS = 2400;

  useEffect(() => {
    const d1 = setTimeout(() => setDotsOn(true), 600);
    const d2 = setTimeout(() => {
      function loop(ts: number) {
        if (!t0Ref.current) t0Ref.current = ts;
        const el = (ts - t0Ref.current) % (SCAN_MS + 900);
        setScanY(el < SCAN_MS ? (el / SCAN_MS) * 100 : 100);
        if (el >= SCAN_MS + 700) t0Ref.current = ts;
        rafRef.current = requestAnimationFrame(loop);
      }
      rafRef.current = requestAnimationFrame(loop);
    }, 500);
    const d3 = setInterval(() => setActiveCat(c => (c + 1) % CATEGORIES.length), 1900);
    return () => { clearTimeout(d1); clearTimeout(d2); clearInterval(d3); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">

      {/* ── Header ── */}
      <header className="relative z-20 px-8 py-5 flex items-center justify-between border-b border-[rgba(212,169,58,0.15)]">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-[0.45em] text-gradient-gold">MOGSCORE</span>
          <span className="hidden sm:block font-mono text-[9px] tracking-[0.28em] uppercase text-mute border border-[rgba(212,169,58,0.25)] px-2 py-0.5">
            MMXXVI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="ghost-btn py-2 px-4 text-xs">Leaderboard</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex-1 px-6 pt-14 pb-10 max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-10 items-center">

        {/* Background accent */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(circle, var(--color-blood) 0%, transparent 70%)" }} />
        </div>

        {/* Left: copy */}
        <div>
          <motion.div {...fadeUp(0.05)} className="eyebrow mb-5 flex items-center gap-3">
            <span className="w-6 h-px bg-gold opacity-60" />
            Heavyweight Division · Live Face Scan
          </motion.div>

          <div className="overflow-hidden mb-1">
            <motion.div
              initial={{ y: "110%" }} animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16,1,0.3,1] }}
              className="huge text-bone"
            >ENTER</motion.div>
          </div>
          <div className="overflow-hidden mb-1">
            <motion.div
              initial={{ y: "110%" }} animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.22, ease: [0.16,1,0.3,1] }}
              className="huge"
              style={{ color: "var(--color-blood)", textShadow: "0 0 60px rgba(200,22,29,0.4)" }}
            >THE</motion.div>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.div
              initial={{ y: "110%" }} animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.34, ease: [0.16,1,0.3,1] }}
              className="huge text-gradient-gold"
            >ARENA</motion.div>
          </div>

          <motion.p {...fadeUp(0.52)}
            className="font-mono text-[12px] tracking-[0.22em] uppercase text-bone-2 leading-[2] mb-8 max-w-[460px]"
          >
            Your camera scans your face across six categories.
            478 landmarks. One score out of ten.
            Posted to a global leaderboard.
          </motion.p>

          <motion.div {...fadeUp(0.62)} className="flex flex-wrap gap-3 mb-10">
            <button onClick={onEnter} className="arena-btn text-base px-8 py-4">
              ▶ Enter The Arena
            </button>
            <Link href="/leaderboard" className="ghost-btn text-sm px-6 py-4">
              View Rankings
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...fadeUp(0.72)} className="grid grid-cols-4 gap-px border border-[rgba(212,169,58,0.2)] max-w-[480px]">
            {STATS.map((s, i) => (
              <div key={i} className="bg-[rgba(18,10,10,0.8)] px-4 py-3 text-center">
                <div className="font-heavy text-2xl leading-none text-gradient-gold mb-1">{s.v}</div>
                <div className="font-mono text-[8px] tracking-[0.2em] uppercase text-mute">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: face scan card */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: [0.16,1,0.3,1] }}
          className="relative"
        >
          {/* Glow behind card */}
          <div className="absolute inset-0 rounded-sm opacity-30 blur-3xl -z-10"
            style={{ background: "radial-gradient(ellipse at center, var(--color-gold-3), transparent 70%)" }} />

          <div className="fight-card gold-edge p-5 relative overflow-hidden scanlines">
            {/* Terminal bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(212,169,58,0.15)]">
              <div className="flex gap-1.5 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blood" style={{ boxShadow: "0 0 6px var(--color-blood)" }} />
                <span className="w-2.5 h-2.5 rounded-full bg-[rgba(212,169,58,0.4)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[rgba(212,169,58,0.15)]" />
              </div>
              <span className="font-mono text-[9px] tracking-[0.32em] uppercase text-gold" style={{ animation: "spot-pulse 2s infinite" }}>
                ◉ SCANNING
              </span>
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-mute">478 pts</span>
            </div>

            {/* Face SVG */}
            <div className="relative bg-[rgba(6,3,3,0.8)] border border-[rgba(212,169,58,0.12)]" style={{ aspectRatio: "5/6" }}>
              <svg viewBox="0 10 100 110" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Subtle grid */}
                {[25,50,75,100].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(212,169,58,0.05)" strokeWidth="0.4"/>)}
                {[25,50,75].map(x => <line key={x} x1={x} y1="10" x2={x} y2="120" stroke="rgba(212,169,58,0.05)" strokeWidth="0.4"/>)}
                {/* Thirds */}
                <line x1="15" y1="37" x2="85" y2="37" stroke="rgba(200,22,29,0.18)" strokeWidth="0.35" strokeDasharray="1.5 2.5"/>
                <line x1="15" y1="65" x2="85" y2="65" stroke="rgba(200,22,29,0.18)" strokeWidth="0.35" strokeDasharray="1.5 2.5"/>
                {/* Midline */}
                <line x1="50" y1="14" x2="50" y2="114" stroke="rgba(212,169,58,0.12)" strokeWidth="0.4" strokeDasharray="2 2.5"/>
                {/* Contours */}
                {CONTOURS.map((pts,i) => (
                  <path key={i} d={toPath(pts)} fill="none" stroke="rgba(212,169,58,0.28)" strokeWidth="0.55" strokeLinejoin="round"/>
                ))}
                {/* Measurement brackets on sides */}
                <line x1="12" y1="37" x2="12" y2="65" stroke="rgba(212,169,58,0.35)" strokeWidth="0.45"/>
                <line x1="10" y1="37" x2="14" y2="37" stroke="rgba(212,169,58,0.35)" strokeWidth="0.45"/>
                <line x1="10" y1="65" x2="14" y2="65" stroke="rgba(212,169,58,0.35)" strokeWidth="0.45"/>
                {/* Landmark dots */}
                {dotsOn && ALL_DOTS.map(([x,y],i) => (
                  <motion.circle key={i} cx={x} cy={y} r="0.9"
                    fill={i < JAW.length ? "rgba(240,203,94,0.6)" : "rgba(240,203,94,0.85)"}
                    initial={{ opacity:0, scale:0 }} animate={{ opacity:1, scale:1 }}
                    transition={{ delay: 0.6 + i*0.011, duration:0.25 }}
                  />
                ))}
                {/* Scan line */}
                <line x1="0" y1={10+(scanY/100)*110} x2="100" y2={10+(scanY/100)*110} stroke="rgba(200,22,29,0.8)" strokeWidth="0.6"/>
                <line x1="0" y1={10+(scanY/100)*110} x2="100" y2={10+(scanY/100)*110} stroke="rgba(200,22,29,0.12)" strokeWidth="5"/>
                {/* Corner brackets */}
                {([[0,10,1,1],[100,10,-1,1],[0,120,1,-1],[100,120,-1,-1]] as [number,number,number,number][]).map(([cx,cy,sx,sy],i)=>(
                  <g key={i}>
                    <line x1={cx} y1={cy} x2={cx+sx*7} y2={cy} stroke="var(--color-gold)" strokeWidth="0.9"/>
                    <line x1={cx} y1={cy} x2={cx} y2={cy+sy*7} stroke="var(--color-gold)" strokeWidth="0.9"/>
                  </g>
                ))}
              </svg>
              {/* Active category label */}
              <div className="absolute bottom-2 inset-x-2 flex justify-between px-1">
                <span className="font-mono text-[8px] tracking-[0.3em] uppercase text-gold">{CATEGORIES[activeCat].key}</span>
                <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-blood animate-pulse">analyzing…</span>
              </div>
            </div>

            {/* Category dots */}
            <div className="grid grid-cols-6 gap-1.5 mt-4">
              {CATEGORIES.map((c,i) => (
                <div key={c.key} className="flex flex-col items-center gap-1.5 transition-all duration-500"
                  style={{ opacity: i === activeCat ? 1 : 0.3 }}>
                  <div className="font-mono text-[7px] tracking-[0.18em] uppercase text-gold">{c.key.slice(0,3)}</div>
                  <div className="w-full h-0.5 rounded-full transition-all duration-500"
                    style={{ background: i === activeCat ? "var(--color-gold)" : "rgba(212,169,58,0.25)",
                      boxShadow: i === activeCat ? "0 0 6px var(--color-gold)" : "none" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Floating score badge */}
          <motion.div
            initial={{ opacity:0, scale:0.6, rotate:12 }}
            animate={{ opacity:1, scale:1, rotate:5 }}
            transition={{ delay:1.3, duration:0.6, ease:[0.16,1,0.3,1] }}
            className="absolute -top-5 -right-5 z-10 fight-card px-4 py-3 text-center"
            style={{ border:"1px solid rgba(212,169,58,0.6)", boxShadow:"0 0 30px rgba(212,169,58,0.25)" }}
          >
            <div className="font-mono text-[7px] tracking-[0.3em] uppercase text-gold mb-1">Overall</div>
            <div className="font-heavy text-4xl leading-none text-gradient-gold">8.4</div>
            <div className="font-mono text-[8px] tracking-[0.25em] uppercase text-bone-2 mt-1">Elite</div>
          </motion.div>

          {/* Floating category badge */}
          <motion.div
            initial={{ opacity:0, x:20 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay:1.6, duration:0.6, ease:[0.16,1,0.3,1] }}
            className="absolute -bottom-4 -left-4 z-10 fight-card px-3 py-2"
            style={{ border:"1px solid rgba(200,22,29,0.5)" }}
          >
            <div className="font-mono text-[7px] tracking-[0.25em] uppercase text-mute mb-0.5">Top Category</div>
            <div className="font-display text-base tracking-[0.08em] uppercase" style={{ color:"var(--color-gold-2)" }}>Jawline 9.1</div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Marquee strip ── */}
      <div className="border-y border-[rgba(212,169,58,0.2)] overflow-hidden py-3"
        style={{ background: "linear-gradient(90deg, var(--color-blood-3), var(--color-blood-2), var(--color-blood-3))" }}>
        <div className="marquee-track select-none">
          {[...MARQUEE_TEXT,...MARQUEE_TEXT,...MARQUEE_TEXT,...MARQUEE_TEXT].map((t,i) => (
            <span key={i} className="font-display text-sm tracking-[0.38em] uppercase px-6" style={{ color:"rgba(244,236,216,0.7)" }}>
              {t} <span className="text-[rgba(244,236,216,0.3)] mx-1">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── How It Works ── */}
      <section className="px-6 py-20 max-w-[1280px] mx-auto w-full">
        <motion.div {...fadeUp(0)} className="flex items-center gap-4 mb-10">
          <div className="eyebrow">How It Works</div>
          <div className="flex-1 h-px bg-gradient-to-r from-[rgba(212,169,58,0.4)] to-transparent" />
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n:"01", head:"Show Your Face", body:"Position in the oval guide. Four coaching cues — Centered, Straight, Lit, Still — confirm you're ready. Camera runs entirely in your browser." },
            { n:"02", head:"AI Scans 478 Points", body:"MediaPipe FaceLandmarker maps your face geometry in real time. Six categories are computed from landmark geometry and pixel data." },
            { n:"03", head:"Get Your Score", body:"One score out of ten. Six stat cards with breakdowns. Share to the global leaderboard or keep it private — your call." },
          ].map((s,i) => (
            <motion.div key={s.n} {...fadeUp(0.1 + i*0.12)} className="fight-card p-7 relative overflow-hidden group hover:border-[rgba(212,169,58,0.45)] transition-all duration-300">
              <div className="absolute top-5 right-5 font-heavy text-7xl leading-none select-none pointer-events-none"
                style={{ color:"rgba(212,169,58,0.07)" }}>{s.n}</div>
              <div className="w-8 h-0.5 mb-5" style={{ background:"var(--color-blood)" }} />
              <div className="font-display text-xl tracking-[0.05em] uppercase text-bone mb-3">{s.head}</div>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-bone-2 leading-[1.9] opacity-75">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Six Categories ── */}
      <section className="px-6 pb-20 max-w-[1280px] mx-auto w-full">
        <div className="flex items-center gap-4 mb-10">
          <div className="eyebrow">Six Categories</div>
          <div className="flex-1 h-px bg-gradient-to-r from-[rgba(212,169,58,0.4)] to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((c,i) => (
            <motion.div key={c.key} {...fadeUp(0.05 + i*0.07)}
              className="fight-card px-6 py-5 flex items-center gap-5 group hover:border-[rgba(212,169,58,0.5)] transition-all duration-300 cursor-default"
            >
              <div className="font-heavy text-3xl leading-none shrink-0" style={{ color:"rgba(212,169,58,0.25)", transition:"color 0.3s" }}>{c.n}</div>
              <div className="min-w-0">
                <div className="font-display text-xl tracking-[0.06em] uppercase text-bone mb-1">{c.key}</div>
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-mute truncate">{c.sub}</div>
              </div>
              <div className="ml-auto w-px h-8 shrink-0" style={{ background:"rgba(212,169,58,0.2)" }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Leaderboard Preview ── */}
      <section className="px-6 pb-20 max-w-[1280px] mx-auto w-full">
        <div className="flex items-center gap-4 mb-10">
          <div className="eyebrow">Recent Fighters</div>
          <div className="flex-1 h-px bg-gradient-to-r from-[rgba(212,169,58,0.4)] to-transparent" />
          <Link href="/leaderboard" className="font-mono text-[9px] tracking-[0.26em] uppercase text-gold hover:text-gold-2 transition-colors">
            Full Board →
          </Link>
        </div>
        <div className="fight-card overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[52px_64px_1fr_80px_70px] gap-4 px-6 py-3 font-mono text-[9px] tracking-[0.28em] uppercase text-mute border-b border-[rgba(212,169,58,0.12)]">
            <span>Rank</span><span>Photo</span><span>Fighter</span>
            <span className="text-right">Score</span><span className="text-right">When</span>
          </div>
          {MOCK.map((r,i) => (
            <div key={r.name}
              className="grid grid-cols-[52px_64px_1fr_80px_70px] gap-4 px-6 py-4 items-center border-b border-[rgba(212,169,58,0.06)] last:border-0"
              style={{ filter:"blur(2px)", userSelect:"none", pointerEvents:"none" }}
            >
              <span className="font-heavy text-3xl" style={{ color:r.col, textShadow:`0 0 20px ${r.col}66` }}>{i+1}</span>
              {/* Photo placeholder */}
              <div className="w-12 h-12 border border-[rgba(212,169,58,0.25)] overflow-hidden relative"
                style={{ background:`linear-gradient(135deg, rgba(200,22,29,0.3), rgba(${i===0?"212,169,58":i===1?"192,192,192":"205,127,50"},0.2))` }}>
                <svg viewBox="0 0 48 48" className="w-full h-full opacity-40">
                  <ellipse cx="24" cy="18" rx="9" ry="11" fill="currentColor"/>
                  <ellipse cx="24" cy="40" rx="14" ry="10" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="font-display text-lg tracking-[0.04em] uppercase text-bone">{r.name}</div>
                <div className={`font-mono text-[9px] tracking-[0.22em] uppercase ${r.cls}`}>{r.tier}</div>
              </div>
              <div className="font-heavy text-3xl text-right" style={{ color:r.col }}>{r.score}</div>
              <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-mute text-right">2h ago</div>
            </div>
          ))}
        </div>
        <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-mute text-center mt-4 opacity-40">
          Sample data · scan to join the real board
        </p>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative overflow-hidden mx-6 mb-16 fight-card gold-edge"
        style={{ background:"linear-gradient(135deg, var(--color-blood-3) 0%, var(--color-blood-2) 50%, var(--color-blood-3) 100%)" }}>
        <div className="absolute inset-0 scanlines opacity-50" />
        <div className="relative z-10 px-8 py-14 text-center">
          <div className="eyebrow mb-4" style={{ color:"rgba(244,236,216,0.5)" }}>Step into the arena</div>
          <div className="font-heavy text-[clamp(3rem,10vw,8rem)] leading-none uppercase text-bone mb-2"
            style={{ textShadow:"0 0 80px rgba(212,169,58,0.3)" }}>
            YOUR TURN
          </div>
          <div className="font-mono text-[11px] tracking-[0.28em] uppercase text-bone-2 opacity-60 mb-8">
            Video stays in your browser · For entertainment only
          </div>
          <button onClick={onEnter} className="arena-btn text-base px-12 py-4"
            style={{ background:"linear-gradient(180deg,var(--color-arena-2),var(--color-arena))", border:"2px solid var(--color-gold)" }}>
            ▶ Enter The Arena
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 py-5 flex items-center justify-between border-t border-[rgba(212,169,58,0.1)]">
        <span className="font-mono text-[9px] tracking-[0.32em] uppercase text-mute opacity-50">MMXXVI · Heavyweight Division</span>
        <span className="font-mono text-[9px] tracking-[0.32em] uppercase text-mute opacity-50">Camera Required</span>
      </footer>
    </div>
  );
}
