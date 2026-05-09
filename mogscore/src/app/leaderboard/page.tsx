"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getBackend, type Entry, type Filter } from "@/lib/backend";
import { tierFor } from "@/lib/face-scoring";

type Mode = "face" | "body" | "combine";

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("face");
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [backendMode, setBackendMode] = useState<"local" | "public">("local");

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    (async () => {
      const b = await getBackend();
      setBackendMode(b.mode);
      try {
        const r = await b.top(mode, filter);
        if (!cancelled) setRows(r);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, filter]);

  return (
    <div className="min-h-screen px-6 py-10">
      <header className="max-w-[1100px] mx-auto mb-10 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-[0.4em]">MOGSCORE</Link>
        <Link href="/" className="ghost-btn">Scan</Link>
      </header>

      <div className="max-w-[1100px] mx-auto mount">
        <div className="eyebrow mb-3">Hall of Fights</div>
        <h1 className="display-l mb-8">Leaderboard.</h1>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {(["face", "body", "combine"] as Mode[]).map((m) => {
            const enabled = true;
            const label = m === "body" ? "Physique" : m === "combine" ? "Overall" : m;
            return (
              <button
                key={m}
                onClick={() => enabled && setMode(m)}
                disabled={false}
                className={`px-5 py-3 font-display text-sm tracking-[0.28em] uppercase transition-all border ${
                  mode === m
                    ? "bg-blood text-bone border-gold"
                    : "bg-transparent text-bone-2 border-[rgba(212,169,58,0.2)] hover:border-gold"
                } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {label}{!enabled && " (soon)"}
              </button>
            );
          })}
          <span className={`ml-auto font-mono text-[10px] tracking-[0.28em] uppercase font-semibold px-3 py-1 border ${
            backendMode === "public"
              ? "text-gold border-gold"
              : "text-mute border-[rgba(212,169,58,0.2)]"
          }`}>
            {backendMode === "public" ? "Public" : "Local"}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-8">
          {(["all","week","today"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 font-mono text-[10px] tracking-[0.24em] uppercase border ${
                filter === f
                  ? "border-gold text-gold"
                  : "border-[rgba(212,169,58,0.15)] text-mute hover:border-[rgba(212,169,58,0.4)]"
              }`}
            >
              {f === "all" ? "All Time" : f === "week" ? "This Week" : "Today"}
            </button>
          ))}
        </div>

        {/* Body */}
        {rows === null ? (
          <div className="font-mono text-[12px] tracking-[0.2em] uppercase text-mute py-20 text-center">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="fight-card p-12 text-center">
            <div className="display-m mb-3">No fights logged.</div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-mute mb-6">
              Be the first to step into the arena.
            </p>
            <Link href="/" className="arena-btn">▶ Enter The Arena</Link>
          </div>
        ) : (
          <div className="fight-card">
            {/* header row */}
            <div className="grid grid-cols-[60px_72px_1fr_120px_100px_70px] gap-4 px-5 py-3 font-mono text-[10px] tracking-[0.28em] uppercase text-mute border-b border-[rgba(212,169,58,0.15)] items-center">
              <span>Rank</span>
              <span>Photo</span>
              <span>Player</span>
              <span>Top Cat.</span>
              <span className="text-right">Overall</span>
              <span className="text-right">When</span>
            </div>
            {rows.map((r, i) => (
              <Row
                key={r.id}
                entry={r}
                rank={i + 1}
                expanded={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ entry, rank, expanded, onToggle }: { entry: Entry; rank: number; expanded: boolean; onToggle: () => void }) {
  const tier = tierFor(entry.overall);
  const cats: { k: string; v: number }[] = [
    { k: "Eyes", v: entry.eyes ?? 0 },
    { k: "Skin", v: entry.skin ?? 0 },
    { k: "Jawline", v: entry.jawline ?? 0 },
    { k: "Hair", v: entry.hair ?? 0 },
    { k: "Symmetry", v: entry.symmetry ?? 0 },
    { k: "Harmony", v: entry.harmony ?? 0 },
  ];
  const top = [...cats].sort((a, b) => b.v - a.v)[0];

  const rankColor =
    rank === 1 ? "var(--color-gold-2)"
    : rank === 2 ? "#c0c0c0"
    : rank === 3 ? "#cd7f32"
    : "var(--color-mute)";

  return (
    <>
      <button
        onClick={onToggle}
        className="grid grid-cols-[60px_72px_1fr_120px_100px_70px] gap-4 px-5 py-4 items-center w-full text-left border-b border-[rgba(212,169,58,0.08)] hover:bg-[rgba(212,169,58,0.04)] transition"
      >
        <span className="font-heavy text-2xl" style={{ color: rankColor }}>{rank}</span>
        <div className="w-14 h-14 bg-arena-2 overflow-hidden border border-[rgba(212,169,58,0.2)]">
          {entry.photo_url && <img src={entry.photo_url} alt={entry.name} className="w-full h-full object-cover" />}
        </div>
        <div>
          <div className="font-display text-xl tracking-[0.04em] uppercase">{entry.name}</div>
          <div className={`font-mono text-[10px] tracking-[0.24em] uppercase ${tier.className}`}>{tier.label}</div>
        </div>
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase">
          <span className="text-gold">{top.k}</span>{" "}
          <span className="text-bone">{top.v.toFixed(1)}</span>
        </div>
        <span className="font-heavy text-3xl text-right" style={{ color: "var(--color-gold-2)" }}>
          {entry.overall.toFixed(1)}
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-mute text-right">
          {relTime(entry.created_at)}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-b border-[rgba(212,169,58,0.15)] overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-5 bg-[rgba(10,6,6,0.4)]">
              {cats.map((c) => (
                <div key={c.k} className="text-center">
                  <div className="font-mono text-[9px] tracking-[0.32em] uppercase text-gold mb-1">{c.k}</div>
                  <div className="font-heavy text-2xl">{c.v.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
