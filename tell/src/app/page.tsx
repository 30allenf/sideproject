'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { signInWithGoogle } from '@/lib/firebase/auth'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const TAGLINES = [
  'Your heartbeat is visible.',
  'Your body betrays you.',
  'Bluffing is a skill.',
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  async function handleSignIn() {
    try {
      await signInWithGoogle()
    } catch {
      toast.error('Sign-in failed. Try again.')
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center top, #1a0505, #0a0a0a 60%)' }}
    >
      {/* Ambient red flicker */}
      <div className="ambient-panic" />

      {/* Background text */}
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        style={{ opacity: 0.03 }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="font-display text-crimson whitespace-nowrap"
            style={{ fontSize: '180px', lineHeight: 1, top: i * 160, position: 'absolute' }}
          >
            TELL TELL TELL TELL TELL TELL
          </div>
        ))}
      </div>

      <motion.div
        className="relative z-10 text-center max-w-2xl"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.14 } } }}
      >
        {/* Eyebrow */}
        <motion.p
          className="readout mb-4"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        >
          <span style={{ color: 'var(--color-crimson)' }}>■</span>
          <span className="sep">—</span>
          CLASSIFIED INTEL
          <span className="sep">—</span>
          <span style={{ color: 'var(--color-crimson)' }}>■</span>
        </motion.p>

        {/* Title */}
        <motion.h1
          className="font-display font-black text-bone"
          style={{ fontSize: 'clamp(100px, 18vw, 200px)', letterSpacing: '-0.02em', lineHeight: 0.88 }}
          variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
        >
          TELL
        </motion.h1>

        {/* Taglines */}
        <div className="mt-6 space-y-1">
          {TAGLINES.map((t, i) => (
            <motion.p
              key={t}
              className="font-display text-bone-dim font-semibold tracking-wider"
              style={{ fontSize: 'clamp(16px, 3vw, 22px)', color: 'var(--color-bone-dim)' }}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0, transition: { delay: 0.5 + i * 0.12 } },
              }}
            >
              {t}
            </motion.p>
          ))}
        </div>

        {/* Explanation */}
        <motion.p
          className="font-mono text-sm mt-10 max-w-md mx-auto leading-relaxed"
          style={{ color: 'var(--color-bone-dim)' }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.9 } } }}
        >
          Chess where both players' webcams extract heart rate in real time.
          Your opponent watches your panic meter. You watch theirs.
          One bluff token. No mercy.
        </motion.p>

        {/* CTA */}
        <motion.div
          className="mt-10"
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: 1.1 } } }}
        >
          <button className="btn-primary text-xl px-12 py-4" onClick={handleSignIn} disabled={loading}>
            {loading ? 'LOADING...' : 'BEGIN SURVEILLANCE'}
          </button>
        </motion.div>

        {/* Mobile warning */}
        <motion.p
          className="mt-6 text-xs readout"
          style={{ color: 'var(--color-amber-dim)' }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 1.3 } } }}
        >
          TELL is a desktop experience. rPPG requires a stationary webcam.
        </motion.p>
      </motion.div>

      {/* Decorative corner brackets */}
      {[
        'top-6 left-6 border-t border-l',
        'top-6 right-6 border-t border-r',
        'bottom-6 left-6 border-b border-l',
        'bottom-6 right-6 border-b border-r',
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-12 h-12 ${cls}`}
          style={{ borderColor: 'var(--color-crimson)', opacity: 0.5 }}
        />
      ))}
    </div>
  )
}
