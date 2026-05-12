'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRoomActions } from '@/lib/hooks/useRooms'

const ROOM_EMOJIS = ['💬', '🎮', '🎵', '📚', '🎨', '🌍', '🏠', '⚡', '🔬', '🍕', '🌿', '💻']

export default function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const { createRoom, joinRoom } = useRoomActions()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [iconEmoji, setIconEmoji] = useState('💬')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!profile || !name.trim()) return
    setCreating(true)
    setError('')
    try {
      const id = await createRoom({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        createdBy: profile.uid,
        iconEmoji,
      })
      onClose()
      router.push(`/room/${id}`)
    } catch (e: unknown) {
      setError('Failed to create room. Try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-semibold text-xl mb-4" style={{ color: 'var(--color-espresso)' }}>
          Create a room
        </h2>

        {/* Emoji picker */}
        <div className="mb-4">
          <label className="font-mono text-xs uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-espresso-60)' }}>Icon</label>
          <div className="flex flex-wrap gap-2">
            {ROOM_EMOJIS.map(e => (
              <button
                key={e}
                className="w-9 h-9 text-xl rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: iconEmoji === e ? 'var(--color-terra-soft)' : 'var(--color-paper-dim)',
                  border: iconEmoji === e ? '1.5px solid var(--color-terracotta)' : '1.5px solid transparent',
                }}
                onClick={() => setIconEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="font-mono text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-espresso-60)' }}>
            Name <span style={{ color: 'var(--color-terracotta)' }}>*</span>
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-paper-dim)', border: '1px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)', outline: 'none' }}
            placeholder="e.g. design-chat"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="font-mono text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-espresso-60)' }}>Description</label>
          <input
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-paper-dim)', border: '1px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)', outline: 'none' }}
            placeholder="What's this room about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <button
            className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: isPublic ? 'var(--color-terracotta)' : 'var(--color-espresso-15)' }}
            onClick={() => setIsPublic(v => !v)}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ left: isPublic ? 'calc(100% - 22px)' : '2px', transform: 'none' }}
            />
          </button>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-espresso-60)' }}>
            {isPublic ? 'Public — anyone can find and join' : 'Private — invite only'}
          </span>
        </div>

        {error && <p className="text-sm mb-3" style={{ color: 'var(--color-terracotta)' }}>{error}</p>}

        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? 'Creating...' : 'Create room'}
          </button>
        </div>
      </div>
    </div>
  )
}
