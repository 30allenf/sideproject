'use client'

import { useState, useEffect } from 'react'
import Avatar from '@/components/ui/Avatar'
import PresenceDot from '@/components/ui/PresenceDot'
import { subscribePresence, formatLastSeen } from '@/lib/presence'
import type { UserProfile, PresenceStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { getOrCreateDM } from '@/lib/hooks/useDMs'

interface ProfileCardProps {
  user: UserProfile
  onClose: () => void
}

export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const [presence, setPresence] = useState<PresenceStatus>(user.presence ?? 'offline')
  const [lastSeen, setLastSeen] = useState<number | null>(null)

  useEffect(() => {
    const unsub = subscribePresence(user.uid, (status, ls) => {
      setPresence(status)
      setLastSeen(ls)
    })
    return unsub
  }, [user.uid])

  async function handleMessage() {
    if (!profile) return
    const dmId = await getOrCreateDM(profile.uid, user.uid)
    onClose()
    router.push(`/dm/${dmId}`)
  }

  const presenceLabel =
    presence === 'online' ? 'Online'
    : presence === 'away' ? 'Away'
    : `Last seen ${formatLastSeen(lastSeen)}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card p-5 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
        <button className="action-btn text-base absolute top-3 right-3" onClick={onClose}>✕</button>

        <div className="flex flex-col items-center text-center gap-2">
          <div className="relative">
            <Avatar src={user.avatarUrl} name={user.displayName} size={72} />
            <PresenceDot status={presence} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--color-espresso)' }}>{user.displayName}</h2>
            <p className="font-mono text-sm" style={{ color: 'var(--color-espresso-30)' }}>@{user.username}</p>
          </div>

          {user.statusMessage && (
            <p className="text-sm italic px-4" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
              {user.statusMessage}
            </p>
          )}

          <p className="font-mono text-xs" style={{
            color: presence === 'online' ? 'var(--color-sage)' : presence === 'away' ? 'var(--color-amber)' : 'var(--color-espresso-30)'
          }}>
            {presenceLabel}
          </p>
        </div>

        {profile?.uid !== user.uid && (
          <button className="btn btn-primary w-full mt-4" onClick={handleMessage}>
            Send message
          </button>
        )}
      </div>
    </div>
  )
}
