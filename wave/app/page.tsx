'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'

export default function Home() {
  const { profile, loading, createAccount } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<'landing' | 'create'>('landing')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!loading && profile?.username) {
      router.replace('/dashboard')
    }
  }, [profile, loading, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const u = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    const d = displayName.trim()
    if (u.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (!d) { setError('Display name is required.'); return }
    setCreating(true)
    setError('')
    try {
      await createAccount(u, d)
      router.replace('/dashboard')
    } catch {
      setError('Something went wrong. Try again.')
      setCreating(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-paper)' }}>
      <span className="font-display text-4xl font-light" style={{ color: 'var(--color-terracotta)' }}>Wave</span>
    </div>
  )

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--color-paper)' }}
    >
      {/* Grain */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.28 0 0 0 0 0.18 0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          mixBlendMode: 'multiply',
          opacity: 0.5,
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="font-display font-light"
            style={{ fontSize: 72, color: 'var(--color-terracotta)', letterSpacing: '-0.03em', lineHeight: 0.95 }}
          >
            Wave
          </h1>
          <p className="mt-2 text-base italic" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
            Messaging that feels human.
          </p>
        </div>

        {step === 'landing' && (
          <motion.div
            className="card p-6 text-center"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-sm mb-6" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
              Real-time chat with presence, reactions, and read receipts.
            </p>
            <button
              className="btn btn-primary w-full text-base py-3"
              onClick={() => setStep('create')}
            >
              Create account →
            </button>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.form
            className="card p-6"
            onSubmit={handleCreate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="font-display font-semibold text-xl mb-5" style={{ color: 'var(--color-espresso)' }}>
              Create your account
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="block font-mono text-xs uppercase tracking-wider mb-1"
                  style={{ color: 'var(--color-espresso-60)' }}
                >
                  Display Name
                </label>
                <input
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{
                    background: 'var(--color-paper-dim)',
                    border: '1.5px solid var(--color-espresso-15)',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-espresso)',
                  }}
                  placeholder="Your full name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={40}
                  autoFocus
                />
              </div>

              <div>
                <label
                  className="block font-mono text-xs uppercase tracking-wider mb-1"
                  style={{ color: 'var(--color-espresso-60)' }}
                >
                  Username
                </label>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-mono)', fontSize: 15 }}>@</span>
                  <input
                    className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                    style={{
                      background: 'var(--color-paper-dim)',
                      border: '1.5px solid var(--color-espresso-15)',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-espresso)',
                    }}
                    placeholder="yourhandle"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    maxLength={20}
                  />
                </div>
                <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-espresso-30)' }}>
                  Letters, numbers, underscores only
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm" style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep('landing')}
              >
                ←
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={creating || !displayName.trim() || username.length < 3}
              >
                {creating ? 'Creating…' : 'Get started →'}
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  )
}
