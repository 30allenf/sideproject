'use client'

import { useState } from 'react'
import type { Room, UserProfile } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'
import PresenceDot from '@/components/ui/PresenceDot'

interface RoomHeaderProps {
  room: Room
  members: Record<string, UserProfile>
  myUid: string
  onShowMembers: () => void
  onSearch: () => void
}

export default function RoomHeader({ room, members, myUid, onShowMembers, onSearch }: RoomHeaderProps) {
  const memberCount = room.members.length
  const onlineCount = Object.values(members).filter(m => m.presence === 'online').length

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
      style={{ borderColor: 'var(--color-espresso-15)', background: 'var(--color-surface)' }}
    >
      <span className="text-2xl flex-shrink-0">{room.iconEmoji ?? '#'}</span>
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-semibold text-base leading-tight truncate" style={{ color: 'var(--color-espresso)' }}>
          {room.name}
        </h1>
        {room.description && (
          <p className="font-mono text-[11px] truncate" style={{ color: 'var(--color-espresso-30)' }}>
            {room.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Member presence stack */}
        <button
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          onClick={onShowMembers}
          title={`${memberCount} members, ${onlineCount} online`}
        >
          <div className="flex -space-x-1.5">
            {Object.values(members).slice(0, 4).map(m => (
              <div key={m.uid} className="relative">
                <Avatar src={m.avatarUrl} name={m.displayName} size={22} />
              </div>
            ))}
          </div>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-espresso-30)' }}>
            {memberCount}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-sage)' }} />
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-sage)' }}>{onlineCount}</span>
        </button>

        <button className="action-btn text-base" onClick={onSearch} title="Search messages">🔍</button>
      </div>
    </div>
  )
}
