'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import { getOrCreateDM } from '@/lib/hooks/useDMs'
import { subscribePresence, formatLastSeen } from '@/lib/presence'
import AppShell from '@/components/layout/AppShell'
import Avatar from '@/components/ui/Avatar'
import PresenceDot from '@/components/ui/PresenceDot'
import type { UserProfile, PresenceStatus } from '@/lib/types'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { profile: myProfile } = useAuth()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [presence, setPresence] = useState<PresenceStatus>('offline')
  const [lastSeen, setLastSeen] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, 'users'), where('username', '==', username))
      const snap = await getDocs(q)
      if (!snap.empty) setUser(snap.docs[0].data() as UserProfile)
      setLoading(false)
    }
    load()
  }, [username])

  useEffect(() => {
    if (!user) return
    const unsub = subscribePresence(user.uid, (s, ls) => {
      setPresence(s)
      setLastSeen(ls)
    })
    return unsub
  }, [user?.uid])

  const presenceLabel =
    presence === 'online' ? 'Online now'
    : presence === 'away' ? 'Away'
    : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}`
    : 'Offline'

  return (
    <AppShell>
      <div className="flex flex-col h-full items-center justify-center p-8" style={{ background: 'var(--color-surface)' }}>
        {loading && <div className="flex gap-1.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}

        {!loading && !user && (
          <div className="text-center">
            <p className="font-display text-4xl mb-2" style={{ color: 'var(--color-espresso-30)' }}>¯\_(ツ)_/¯</p>
            <p style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>User not found.</p>
          </div>
        )}

        {user && (
          <div className="card p-8 max-w-sm w-full text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar src={user.avatarUrl} name={user.displayName} size={80} />
                <PresenceDot status={presence} />
              </div>
              <div>
                <h1 className="font-display font-semibold text-2xl" style={{ color: 'var(--color-espresso)' }}>
                  {user.displayName}
                </h1>
                <p className="font-mono text-sm" style={{ color: 'var(--color-espresso-30)' }}>@{user.username}</p>
              </div>
              {user.statusMessage && (
                <p className="text-sm italic px-4" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
                  {user.statusMessage}
                </p>
              )}
              <p
                className="font-mono text-xs"
                style={{ color: presence === 'online' ? 'var(--color-sage)' : presence === 'away' ? 'var(--color-amber)' : 'var(--color-espresso-30)' }}
              >
                {presenceLabel}
              </p>
            </div>

            {myProfile?.uid !== user.uid && (
              <button
                className="btn btn-primary w-full mt-6"
                onClick={async () => {
                  if (!myProfile) return
                  const dmId = await getOrCreateDM(myProfile.uid, user.uid)
                  router.push(`/dm/${dmId}`)
                }}
              >
                Send message
              </button>
            )}
            {myProfile?.uid === user.uid && (
              <button
                className="btn btn-secondary w-full mt-6"
                onClick={() => router.push('/settings')}
              >
                Edit profile
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
