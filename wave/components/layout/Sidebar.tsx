'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { useMyRooms } from '@/lib/hooks/useRooms'
import { useMyDMs } from '@/lib/hooks/useDMs'
import { useNotifications } from '@/lib/hooks/useNotifications'
import PresenceDot from '@/components/ui/PresenceDot'
import Avatar from '@/components/ui/Avatar'
import { formatTimestamp } from '@/lib/utils'
import NewDMModal from '@/components/profile/NewDMModal'
import CreateRoomModal from '@/components/rooms/CreateRoomModal'

interface SidebarProps {
  activeRoomId?: string
  activeDMId?: string
  onNavigation?: () => void
}

export default function Sidebar({ activeRoomId, activeDMId, onNavigation }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { rooms } = useMyRooms(profile?.uid)
  const { dms } = useMyDMs(profile?.uid)
  const { unreadCount } = useNotifications(profile?.uid)
  const [showNewDM, setShowNewDM] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  function nav(path: string) {
    router.push(path)
    onNavigation?.()
  }

  const pinnedDMs = dms.filter(d => profile?.pinnedDMs?.includes(d.id))
  const unpinnedDMs = dms.filter(d => !profile?.pinnedDMs?.includes(d.id))

  return (
    <div
      className="grain flex flex-col h-full select-none"
      style={{ background: 'var(--color-sidebar)', width: '100%' }}
    >
      {/* App header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <span
          className="font-display font-semibold text-2xl cursor-pointer"
          style={{ color: 'var(--color-terracotta)', letterSpacing: '-0.01em' }}
          onClick={() => nav('/dashboard')}
        >
          Wave
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => nav('/browse')}
            className="action-btn text-base"
            title="Browse rooms"
          >
            🔍
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => nav('/notifications')}
              className="relative action-btn text-base"
              title="Notifications"
            >
              🔔
              <span className="absolute -top-1 -right-1 unread-badge text-[9px] px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-4 min-h-0">
        {/* DMs */}
        <section>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-espresso-30)' }}>
              Direct Messages
            </span>
            <button
              onClick={() => setShowNewDM(true)}
              className="action-btn text-base"
              title="New DM"
            >
              ✏️
            </button>
          </div>

          {pinnedDMs.length > 0 && (
            <div className="space-y-0.5 mb-1">
              {pinnedDMs.map(dm => (
                <DMItem
                  key={dm.id}
                  dm={dm}
                  myUid={profile!.uid}
                  active={activeDMId === dm.id}
                  pinned
                  onClick={() => nav(`/dm/${dm.id}`)}
                />
              ))}
            </div>
          )}

          <div className="space-y-0.5">
            {unpinnedDMs.length === 0 && pinnedDMs.length === 0 && (
              <p className="text-center py-6 text-sm" style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                Find someone to talk to
              </p>
            )}
            <AnimatePresence initial={false}>
              {unpinnedDMs.map((dm, i) => (
                <motion.div
                  key={dm.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <DMItem
                    dm={dm}
                    myUid={profile!.uid}
                    active={activeDMId === dm.id}
                    onClick={() => nav(`/dm/${dm.id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Rooms */}
        <section>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-espresso-30)' }}>
              Rooms
            </span>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="action-btn text-base"
              title="Create room"
            >
              ➕
            </button>
          </div>
          <div className="space-y-0.5">
            {rooms.length === 0 && (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                No rooms yet — browse or create one
              </p>
            )}
            <AnimatePresence initial={false}>
              {rooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    className={`nav-item ${activeRoomId === room.id ? 'active' : ''}`}
                    onClick={() => nav(`/room/${room.id}`)}
                  >
                    <span className="text-lg flex-shrink-0">{room.iconEmoji ?? '#'}</span>
                    <span className="truncate flex-1">{room.name}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* User panel */}
      <div
        className="relative mt-auto border-t px-3 py-2"
        style={{ borderColor: 'var(--color-espresso-15)' }}
      >
        <div
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-espresso-08)] transition-colors"
          onClick={() => setShowUserMenu(v => !v)}
        >
          <div className="relative flex-shrink-0">
            <Avatar src={profile?.avatarUrl} name={profile?.displayName ?? ''} size={32} />
            <PresenceDot status={profile?.invisible ? 'offline' : (profile?.presence ?? 'offline')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm truncate" style={{ color: 'var(--color-espresso)' }}>
              {profile?.displayName}
            </p>
            {profile?.statusMessage && (
              <p className="text-xs truncate" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
                {profile.statusMessage}
              </p>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--color-espresso-30)' }}>⚙</span>
        </div>

        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="card absolute bottom-full left-2 right-2 mb-1 overflow-hidden z-20"
            >
              {[
                { label: 'Profile', icon: '👤', path: `/profile/${profile?.username}` },
                { label: 'Settings', icon: '⚙️', path: '/settings' },
                { label: 'Browse Rooms', icon: '🔍', path: '/browse' },
              ].map(item => (
                <button
                  key={item.path}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--color-espresso-08)] transition-colors text-left"
                  style={{ color: 'var(--color-espresso)', fontFamily: 'var(--font-body)' }}
                  onClick={() => { nav(item.path); setShowUserMenu(false) }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <hr style={{ borderColor: 'var(--color-espresso-15)' }} />
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-50 transition-colors text-left"
                style={{ color: '#c0392b', fontFamily: 'var(--font-body)' }}
                onClick={() => { signOut(); setShowUserMenu(false) }}
              >
                <span>🚪</span> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} />}
      {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} />}
    </div>
  )
}

function DMItem({ dm, myUid, active, pinned, onClick }: {
  dm: import('@/lib/types').DMConversation
  myUid: string
  active: boolean
  pinned?: boolean
  onClick: () => void
}) {
  const otherId = dm.participants.find(p => p !== myUid) ?? ''
  const other = dm.participantProfiles?.[otherId]
  const unread = dm.unreadCount?.[myUid] ?? 0

  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="relative flex-shrink-0">
        <Avatar src={other?.avatarUrl} name={other?.displayName ?? '?'} size={28} />
        <PresenceDot status={other?.presence ?? 'offline'} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium" style={{ color: active ? 'var(--color-terracotta)' : 'var(--color-espresso)' }}>
          {other?.displayName ?? other?.username ?? '...'}
          {pinned && <span className="ml-1 text-xs">📌</span>}
        </p>
        {dm.lastMessage && (
          <p className="truncate text-xs" style={{ color: 'var(--color-espresso-30)', fontFamily: 'var(--font-mono)' }}>
            {dm.lastMessage}
          </p>
        )}
      </div>
      {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
    </div>
  )
}
