'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDM } from '@/lib/hooks/useDMs'
import AppShell from '@/components/layout/AppShell'
import ChatArea from '@/components/messages/ChatArea'
import Avatar from '@/components/ui/Avatar'
import PresenceDot from '@/components/ui/PresenceDot'
import { db } from '@/lib/firebase/config'
import { getDoc, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { subscribePresence, formatLastSeen } from '@/lib/presence'
import type { UserProfile, PresenceStatus } from '@/lib/types'
import { useNotifications } from '@/lib/hooks/useNotifications'

export default function DMPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const router = useRouter()
  const dm = useDM(id)
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null)
  const [presence, setPresence] = useState<PresenceStatus>('offline')
  const [lastSeen, setLastSeen] = useState<number | null>(null)

  // Get other participant profile
  useEffect(() => {
    if (!dm || !profile) return
    const otherId = dm.participants.find(p => p !== profile.uid)
    if (!otherId) return
    getDoc(doc(db, 'users', otherId)).then(snap => {
      if (snap.exists()) setOtherProfile(snap.data() as UserProfile)
    })
  }, [dm?.id, profile?.uid])

  // Subscribe to other's presence
  useEffect(() => {
    if (!otherProfile) return
    const unsub = subscribePresence(otherProfile.uid, (s, ls) => {
      setPresence(s)
      setLastSeen(ls)
    })
    return unsub
  }, [otherProfile?.uid])

  // Mark as read (clear unread count)
  useEffect(() => {
    if (!id || !profile?.uid) return
    const dmRef = doc(db, 'dms', id)
    updateDoc(dmRef, { [`unreadCount.${profile.uid}`]: 0 }).catch(() => {})
  }, [id, profile?.uid])

  const membersMap = otherProfile && profile
    ? {
        [profile.uid]: profile,
        [otherProfile.uid]: otherProfile,
      }
    : {}

  const isPinned = profile?.pinnedDMs?.includes(id) ?? false

  async function togglePin() {
    if (!profile?.uid) return
    const userRef = doc(db, 'users', profile.uid)
    if (isPinned) {
      await updateDoc(userRef, { pinnedDMs: arrayRemove(id) })
    } else {
      await updateDoc(userRef, { pinnedDMs: arrayUnion(id) })
    }
  }

  const presenceLabel =
    presence === 'online' ? 'Online now'
    : presence === 'away' ? 'Away'
    : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}`
    : 'Offline'

  return (
    <AppShell activeDMId={id}>
      <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)' }}>
        {/* DM Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-espresso-15)', background: 'var(--color-surface)' }}
        >
          {otherProfile ? (
            <div className="relative flex-shrink-0">
              <Avatar src={otherProfile.avatarUrl} name={otherProfile.displayName} size={36} />
              <PresenceDot status={presence} size="sm" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full" style={{ background: 'var(--color-paper-dim)' }} />
          )}

          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-base leading-tight" style={{ color: 'var(--color-espresso)' }}>
              {otherProfile?.displayName ?? '...'}
            </h1>
            <p className="font-mono text-[11px]" style={{
              color: presence === 'online' ? 'var(--color-sage)' : presence === 'away' ? 'var(--color-amber)' : 'var(--color-espresso-30)'
            }}>
              {presenceLabel}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="action-btn text-base"
              onClick={togglePin}
              title={isPinned ? 'Unpin' : 'Pin to top'}
            >
              📌
            </button>
          </div>
        </div>

        <ChatArea
          roomId={id}
          members={membersMap as Record<string, UserProfile>}
          isDM={true}
        />
      </div>
    </AppShell>
  )
}
