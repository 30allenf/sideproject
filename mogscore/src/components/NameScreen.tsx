"use client";

import { useEffect, useRef, useState } from "react";
import { profanityCheck } from "@/lib/profanity";

type Props = { initial?: string; onContinue: (name: string) => void; onBack: () => void };

export default function NameScreen({ initial = "", onContinue, onBack }: Props) {
  const [name, setName] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit() {
    const t = name.trim();
    const r = profanityCheck(t);
    if (!r.ok) { setErr(r.reason ?? "Pick a different name."); return; }
    onContinue(t);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="max-w-[560px] w-full mount text-center">
        <div className="eyebrow mb-6">Step 1 of 3</div>
        <h1 className="display-l mb-10">What do they call you?</h1>
        <input
          ref={inputRef}
          className="arena-input mb-2 text-center"
          placeholder="your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={20}
        />
        <div className="h-6 my-2 font-mono text-[11px] tracking-[0.18em] uppercase text-blood">
          {err ?? " "}
        </div>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={onBack} className="ghost-btn">Back</button>
          <button onClick={submit} className="arena-btn">Continue ▶</button>
        </div>
      </div>
    </div>
  );
}
