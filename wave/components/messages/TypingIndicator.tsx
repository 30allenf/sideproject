'use client'

import { useEffect, useState } from 'react'
import { subscribeTyping } from '@/lib/typing'
import { useAuth } from '@/lib/hooks/useAuth'
import { AnimatePresence, motion } from 'framer-motion'

export default function TypingIndicator({ roomId }: { roomId: string }) {
  const { profile } = useAuth()
  const [typers, setTypers] = useState<{ uid: string; displayName: string }[]>([])

  useEffect(() => {
    if (!profile) return
    const unsub = subscribeTyping(roomId, profile.uid, setTypers)
    return unsub
  }, [roomId, profile])

  const label =
    typers.length === 0 ? null
    : typers.length === 1 ? `${typers[0].displayName} is typing`
    : typers.length === 2 ? `${typers[0].displayName} and ${typers[1].displayName} are typing`
    : 'Several people are typing'

  return (
    <div style={{ height: 24, paddingLeft: 16 }}>
      <AnimatePresence>
        {label && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-1.5"
          >
            <div className="flex gap-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <span className="font-body text-xs" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
