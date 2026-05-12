'use client'

import Avatar from '@/components/ui/Avatar'
import PresenceDot from '@/components/ui/PresenceDot'
import type { UserProfile } from '@/lib/types'
import { formatLastSeen } from '@/lib/presence'

interface MemberListProps {
  members: Record<string, UserProfile>
  admins: string[]
  myUid: string
  isAdmin: boolean
  onRemove?: (uid: string) => void
  onClose: () => void
}

export default function MemberList({ members, admins, myUid, isAdmin, onRemove, onClose }: MemberListProps) {
  const sorted = Object.values(members).sort((a, b) => {
    const order = { online: 0, away: 1, offline: 2 }
    return (order[a.presence] ?? 2) - (order[b.presence] ?? 2)
  })

  return (
    <div className="h-full flex flex-col" style={{ width: 280 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-espresso-15)' }}>
        <h3 className="font-display font-semibold text-sm">Members ({sorted.length})</h3>
        <button className="action-btn text-base" onClick={onClose}>✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sorted.map(member => (
          <div
            key={member.uid}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--color-espresso-08)] transition-colors group"
          >
            <div className="relative flex-shrink-0">
              <Avatar src={member.avatarUrl} name={member.displayName} size={32} />
              <PresenceDot status={member.presence ?? 'offline'} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-sm truncate" style={{ color: 'var(--color-espresso)' }}>
                {member.displayName}
                {admins.includes(member.uid) && (
                  <span className="ml-1 text-[10px] font-mono px-1 rounded" style={{ background: 'var(--color-terra-soft)', color: 'var(--color-terracotta)' }}>
                    admin
                  </span>
                )}
              </p>
              <p className="font-mono text-[11px] truncate" style={{ color: 'var(--color-espresso-30)' }}>
                {member.presence === 'online' ? 'Online'
                 : member.presence === 'away' ? 'Away'
                 : `Last seen ${formatLastSeen(member.lastSeen?.toMillis?.() ?? null)}`}
              </p>
            </div>
            {isAdmin && member.uid !== myUid && (
              <button
                className="action-btn text-sm danger opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove?.(member.uid)}
                title="Remove member"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
