'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { getOrCreateDM } from '@/lib/hooks/useDMs'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, orderBy, startAt, endAt } from 'firebase/firestore'
import Avatar from '@/components/ui/Avatar'
import PresenceDot from '@/components/ui/PresenceDot'
import type { UserProfile } from '@/lib/types'

export default function NewDMModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!search.trim() || search.length < 1) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('username'),
          startAt(search.toLowerCase()),
          endAt(search.toLowerCase() + '')
        )
        const snap = await getDocs(q)
        const users = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.uid !== profile?.uid)
        setResults(users)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, profile?.uid])

  async function handleSelect(user: UserProfile) {
    if (!profile) return
    const dmId = await getOrCreateDM(profile.uid, user.uid)
    onClose()
    router.push(`/dm/${dmId}`)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-semibold text-lg mb-3" style={{ color: 'var(--color-espresso)' }}>
          New direct message
        </h2>
        <input
          className="w-full px-3 py-2.5 rounded-lg border text-sm mb-3 outline-none"
          style={{
            background: 'var(--color-paper-dim)',
            border: '1.5px solid var(--color-espresso-15)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-espresso)',
          }}
          placeholder="Search by username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />

        {loading && (
          <div className="flex justify-center py-4">
            <div className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
          </div>
        )}

        {!loading && results.length === 0 && search.length > 0 && (
          <p className="text-center py-4 text-sm italic" style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-body)' }}>
            No users found
          </p>
        )}

        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {results.map(user => (
            <button
              key={user.uid}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-espresso-08)] transition-colors text-left"
              onClick={() => handleSelect(user)}
            >
              <div className="relative flex-shrink-0">
                <Avatar src={user.avatarUrl} name={user.displayName} size={36} />
                <PresenceDot status={user.presence ?? 'offline'} size="sm" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm truncate" style={{ color: 'var(--color-espresso)' }}>
                  {user.displayName}
                </p>
                <p className="font-mono text-xs truncate" style={{ color: 'var(--color-espresso-30)' }}>
                  @{user.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
