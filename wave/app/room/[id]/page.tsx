'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRoom, useRoomActions } from '@/lib/hooks/useRooms'
import AppShell from '@/components/layout/AppShell'
import ChatArea from '@/components/messages/ChatArea'
import RoomHeader from '@/components/rooms/RoomHeader'
import MemberList from '@/components/rooms/MemberList'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import type { UserProfile } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, loading } = useAuth()
  const router = useRouter()
  const room = useRoom(id)
  const { joinRoom, leaveRoom, removeMember } = useRoomActions()
  const [members, setMembers] = useState<Record<string, UserProfile>>({})
  const [showMembers, setShowMembers] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load member profiles
  useEffect(() => {
    if (!room?.members.length) return
    const load = async () => {
      const profiles: Record<string, UserProfile> = {}
      await Promise.all(room.members.map(async uid => {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) profiles[uid] = snap.data() as UserProfile
      }))
      setMembers(profiles)
    }
    load()
  }, [room?.members.join(',')])

  // Redirect if not member and private
  useEffect(() => {
    if (!loading && !room?.isPublic && profile && !room?.members.includes(profile.uid)) {
      router.replace('/dashboard')
    }
  }, [room, profile, loading, router])

  // Auto-join public rooms
  useEffect(() => {
    if (room?.isPublic && profile && !room.members.includes(profile.uid)) {
      joinRoom(room.id, profile.uid)
    }
  }, [room?.id, room?.isPublic, profile?.uid])

  if (!room) return (
    <AppShell>
      <div className="flex items-center justify-center h-full">
        <div className="flex gap-1.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
      </div>
    </AppShell>
  )

  const isAdmin = !!profile && room.admins.includes(profile.uid)
  const isMember = !!profile && room.members.includes(profile.uid)

  return (
    <AppShell activeRoomId={id}>
      <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)' }}>
        <RoomHeader
          room={room}
          members={members}
          myUid={profile?.uid ?? ''}
          onShowMembers={() => setShowMembers(v => !v)}
          onSearch={() => setShowSearch(v => !v)}
        />

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden border-b"
              style={{ borderColor: 'var(--color-espresso-15)' }}
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <input
                  className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--color-paper-dim)', border: '1px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)' }}
                  placeholder="Search messages…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button className="action-btn text-sm" onClick={() => { setShowSearch(false); setSearchQuery('') }}>✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <ChatArea
              roomId={id}
              members={members}
              isDM={false}
              disabled={!isMember}
            />
          </div>

          {/* Member panel */}
          <AnimatePresence>
            {showMembers && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="border-l overflow-hidden flex-shrink-0"
                style={{ borderColor: 'var(--color-espresso-15)' }}
              >
                <MemberList
                  members={members}
                  admins={room.admins}
                  myUid={profile?.uid ?? ''}
                  isAdmin={isAdmin}
                  onRemove={uid => removeMember(room.id, uid)}
                  onClose={() => setShowMembers(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isMember && (
          <div
            className="px-4 py-3 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--color-espresso-15)', background: 'var(--color-paper-dim)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
              You&apos;re viewing this room as a guest.
            </p>
            {profile && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => joinRoom(room.id, profile.uid)}
              >
                Join room
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
