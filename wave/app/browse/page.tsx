'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePublicRooms } from '@/lib/hooks/useRooms'
import { useRoomActions } from '@/lib/hooks/useRooms'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import { formatRelative } from '@/lib/utils'

export default function BrowsePage() {
  const { profile } = useAuth()
  const { rooms, loading } = usePublicRooms()
  const { joinRoom } = useRoomActions()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [joining, setJoining] = useState<string | null>(null)

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  )

  async function handleJoin(roomId: string) {
    if (!profile) return
    setJoining(roomId)
    await joinRoom(roomId, profile.uid)
    router.push(`/room/${roomId}`)
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)' }}>
        {/* Header */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-espresso-15)' }}
        >
          <h1 className="font-display font-semibold text-2xl mb-3" style={{ color: 'var(--color-espresso)' }}>
            Browse Rooms
          </h1>
          <input
            className="w-full max-w-sm px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--color-paper-dim)', border: '1.5px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)' }}
            placeholder="Search rooms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Room grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="flex gap-1.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-display text-lg" style={{ color: 'var(--color-espresso-60)' }}>No rooms found</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room, i) => {
              const isMember = profile ? room.members.includes(profile.uid) : false
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => isMember ? router.push(`/room/${room.id}`) : undefined}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">{room.iconEmoji ?? '#'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-base truncate" style={{ color: 'var(--color-espresso)' }}>
                        {room.name}
                      </h3>
                      <p className="text-xs truncate" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
                        {room.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px]" style={{ color: 'var(--color-espresso-30)' }}>
                      {room.members.length} member{room.members.length !== 1 ? 's' : ''}
                      {room.lastMessageAt && ` · active ${formatRelative(room.lastMessageAt)}`}
                    </span>
                    {isMember ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => router.push(`/room/${room.id}`)}
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleJoin(room.id)}
                        disabled={joining === room.id}
                      >
                        {joining === room.id ? '...' : 'Join'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
