'use client'

import { useState } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'

export default function UsernameSetup() {
  const { user, profile, updateProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    const u = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (u.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (u.length > 20) { setError('Username must be 20 characters or less.'); return }
    if (!displayName.trim()) { setError('Display name is required.'); return }
    setSaving(true)
    setError('')
    try {
      // Check uniqueness
      const q = query(collection(db, 'users'), where('username', '==', u))
      const snap = await getDocs(q)
      if (!snap.empty) { setError('Username taken — try another.'); setSaving(false); return }
      await updateProfile({ username: u, displayName: displayName.trim() })
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-paper)' }}>
      <div className="card p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="font-display text-4xl font-light mb-2" style={{ color: 'var(--color-terracotta)', letterSpacing: '-0.02em' }}>
            Wave
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
            One last thing — set up your profile.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-espresso-60)' }}>
              Display Name
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{ background: 'var(--color-paper-dim)', border: '1.5px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)' }}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How you appear to others"
              maxLength={40}
              autoFocus
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-espresso-60)' }}>
              Username
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm" style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-mono)' }}>@</span>
              <input
                className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                style={{ background: 'var(--color-paper-dim)', border: '1.5px solid var(--color-espresso-15)', fontFamily: 'var(--font-mono)', color: 'var(--color-espresso)' }}
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourhandle"
                maxLength={20}
              />
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-body)' }}>{error}</p>}

          <button
            className="btn btn-primary w-full mt-2"
            onClick={handleSubmit}
            disabled={saving || !username || !displayName}
          >
            {saving ? 'Saving...' : 'Get started →'}
          </button>
        </div>
      </div>
    </div>
  )
}
