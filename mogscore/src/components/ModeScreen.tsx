"use client";

export type Mode = "face" | "body" | "combine";

type Props = { onSelect: (m: Mode) => void; onBack: () => void };

const MODES: { id: Mode; name: string; tagline: string; description: string; soon?: boolean }[] = [
  {
    id: "face",
    name: "Face",
    tagline: "Six categories. Real geometry.",
    description: "Eyes · Skin · Jawline · Hair · Symmetry · Harmony. Scored on 478 facial landmarks.",
  },
  {
    id: "body",
    name: "Physique",
    tagline: "Abs · definition · conditioning.",
    description: "Five categories scored on your midsection: Definition · Symmetry · Tone · Lines · Conditioning.",
  },
  {
    id: "combine",
    name: "Overall",
    tagline: "Face + physique. One score.",
    description: "Face scan then abs scan. 60/40 weighted MOGSCORE. One combined rank.",
  },
];

export default function ModeScreen({ onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen flex flex-col px-8 py-10">
      <div className="max-w-[1100px] w-full mx-auto mount">
        <div className="eyebrow mb-3">Step 2 of 3</div>
        <h1 className="display-l mb-2">Pick your mode.</h1>
        <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-bone-2 opacity-70 mb-10">
          Three weight classes. All modes are live.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MODES.map((m) => (
            <button
              key={m.id}
              disabled={m.soon}
              onClick={() => !m.soon && onSelect(m.id)}
              className={`fight-card p-7 text-left transition-all relative ${
                m.soon
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-gold hover:-translate-y-1 cursor-pointer"
              }`}
              style={!m.soon ? { boxShadow: "0 0 0 transparent" } : undefined}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]"
                   style={{ background: m.id === "face" ? "var(--color-blood)" : m.id === "body" ? "var(--color-gold)" : "var(--color-bone)" }} />
              {m.soon && (
                <span className="absolute top-3 right-3 font-mono text-[9px] tracking-[0.24em] uppercase text-mute border border-[rgba(212,169,58,0.3)] px-2 py-0.5">
                  Coming Soon
                </span>
              )}
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-gold mb-2">Round · {m.id}</div>
              <h2 className="font-display text-5xl mb-2">{m.name}</h2>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-bone-2 mb-5">{m.tagline}</div>
              <p className="font-mono text-[12px] leading-relaxed text-bone-2 opacity-80">{m.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-10">
          <button onClick={onBack} className="ghost-btn">← Back</button>
        </div>
      </div>
    </div>
  );
}
