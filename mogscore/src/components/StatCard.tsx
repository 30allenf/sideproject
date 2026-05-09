"use client";

import { motion } from "framer-motion";
import { verdictFor } from "@/lib/verdicts";

type Props = {
  category: string;
  score: number;
  delay?: number;
};

export default function StatCard({ category, score, delay = 0 }: Props) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fight-card p-5"
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-mono text-[10px] tracking-[0.32em] uppercase text-gold">
          {category}
        </span>
        <span className="font-heavy text-4xl text-bone leading-none">
          {score.toFixed(1)}
        </span>
      </div>
      <div className="progress-track my-3">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.15, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="font-mono text-[11px] leading-relaxed text-bone-2 opacity-85">
        {verdictFor(category, score)}
      </div>
    </motion.div>
  );
}
