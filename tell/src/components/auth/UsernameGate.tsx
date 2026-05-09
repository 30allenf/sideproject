'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function UsernameGate() {
  const { setUsername } = useAuth()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (trimmed.length < 3 || trimmed.length > 20) {
      toast.error('3–20 characters, letters/numbers/underscore only')
      return
    }
    setLoading(true)
    try {
      await setUsername(trimmed)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Username unavailable')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-void flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-10 max-w-sm w-full"
        style={{ borderColor: 'var(--color-crimson)' }}
      >
        <h2 className="font-display text-bone text-4xl font-black tracking-widest uppercase mb-2">
          IDENTIFY
        </h2>
        <p className="readout mb-8" style={{ color: 'var(--color-bone-dim)' }}>
          Choose your call sign. It cannot be changed.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full bg-surface border border-subtle text-bone font-mono px-4 py-3 text-sm focus:outline-none focus:border-crimson"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            placeholder="your_handle"
            value={value}
            onChange={e => setValue(e.target.value)}
            maxLength={20}
            spellCheck={false}
            autoFocus
          />
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'REGISTERING...' : 'CONFIRM IDENTITY'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
