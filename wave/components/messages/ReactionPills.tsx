'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserProfile } from '@/lib/types'

interface ReactionPillsProps {
  reactions: Record<string, string[]>
  myUid: string
  members?: Record<string, UserProfile>
  onReact: (emoji: string) => void
}

export default function ReactionPills({ reactions, myUid, members, onReact }: ReactionPillsProps) {
  const entries = Object.entries(reactions).filter(([, uids]) => uids.length > 0)
  const visible = entries.slice(0, 6)
  const overflow = entries.length - 6

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      <AnimatePresence initial={false}>
        {visible.map(([emoji, uids]) => {
          const iMine = uids.includes(myUid)
          const names = uids.map(u => members?.[u]?.displayName ?? u).join(', ')
          return (
            <motion.button
              key={emoji}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="relative group/pill flex items-center gap-1 px-2 py-0.5 rounded-full text-sm cursor-pointer border transition-all"
              style={{
                background: iMine ? 'var(--color-terra-soft)' : 'var(--color-paper-dim)',
                borderColor: iMine ? 'var(--color-terra-glow)' : 'var(--color-espresso-15)',
                fontFamily: 'var(--font-mono)',
              }}
              onClick={() => onReact(emoji)}
              title={names}
            >
              <span>{emoji}</span>
              <motion.span
                className="text-[11px] font-semibold"
                style={{ color: iMine ? 'var(--color-terracotta)' : 'var(--color-espresso-60)' }}
                key={uids.length}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {uids.length}
              </motion.span>
              <div className="tooltip hidden group-hover/pill:block pointer-events-none z-20 text-[10px]">{names}</div>
            </motion.button>
          )
        })}
        {overflow > 0 && (
          <span
            className="flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border"
            style={{ background: 'var(--color-paper-dim)', borderColor: 'var(--color-espresso-15)', color: 'var(--color-espresso-60)' }}
          >
            +{overflow}
          </span>
        )}
      </AnimatePresence>
    </div>
  )
}
