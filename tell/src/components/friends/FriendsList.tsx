'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useFriends } from '@/hooks/useFriends'
import FriendCard from './FriendCard'
import type { UserProfile, PresenceRecord } from '@/types'
import { createChallenge } from '@/lib/firebase/db'
import { createLiveGame } from '@/lib/firebase/realtime'
import { generateGameId } from '@/lib/chess/game'
import { TIME_CONTROLS } from '@/lib/chess/game'
import type { TimeControl } from '@/types'
import type { LiveGame } from '@/types'
import toast from 'react-hot-toast'

interface FriendsListProps {
  friends: UserProfile[]
  presence: Record<string, PresenceRecord>
  myProfile: UserProfile
}

const TIME_OPTIONS: { label: string; tc: TimeControl; inc: number }[] = [
  { label: '2+1 BULLET',  tc: 'bullet',   inc: 1000 },
  { label: '5+0 BLITZ',   tc: 'blitz5+0', inc: 0 },
  { label: '5+3 BLITZ',   tc: 'blitz5+3', inc: 3000 },
  { label: '15+10 RAPID', tc: 'rapid',     inc: 10000 },
]

export default function FriendsList({ friends, presence, myProfile }: FriendsListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [challenging, setChallenging] = useState<string | null>(null)
  const { sendRequest, search } = useFriends(myProfile)
  const router = useRouter()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchTerm.trim()) return
    const results = await search(searchTerm.trim())
    setSearchResults(results.filter(r => r.uid !== myProfile.uid))
  }

  async function sendFriendRequest(uid: string) {
    await sendRequest(uid)
    toast.success('Friend request sent')
  }

  async function challengeFriend(friend: UserProfile, tc: TimeControl, inc: number) {
    const challengeId = await createChallenge(
      myProfile.uid, myProfile.username, friend.uid, tc, inc
    )
    toast.success(`Challenge sent to ${friend.username}`)
    setChallenging(null)
  }

  const online = friends.filter(f => presence[f.uid]?.online)
  const offline = friends.filter(f => !presence[f.uid]?.online)

  return (
    <div className="card p-4 space-y-4 h-full" style={{ minHeight: 400 }}>
      <h3 className="font-display font-bold text-bone tracking-widest uppercase">
        OPERATIVES ({friends.length})
      </h3>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="flex-1 bg-surface border border-subtle text-bone font-mono text-xs px-3 py-2 focus:outline-none focus:border-crimson"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          placeholder="search by handle..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="btn-ghost text-xs px-3">FIND</button>
      </form>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <div className="readout text-xs" style={{ color: 'var(--color-muted)' }}>RESULTS</div>
          {searchResults.map(u => (
            <div key={u.uid} className="flex items-center justify-between py-1">
              <span className="font-mono text-xs text-bone">{u.username}</span>
              {!myProfile.friends.includes(u.uid) ? (
                <button className="btn-ghost text-xs py-1 px-2" onClick={() => sendFriendRequest(u.uid)}>
                  + ADD
                </button>
              ) : (
                <span className="readout text-xs" style={{ color: 'var(--color-signal)' }}>FRIEND</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Online friends */}
      {online.length > 0 && (
        <div className="space-y-2">
          <div className="readout text-xs" style={{ color: 'var(--color-signal)' }}>
            ● ONLINE ({online.length})
          </div>
          {online.map(f => (
            <FriendCard
              key={f.uid}
              friend={f}
              presence={presence[f.uid]}
              onChallenge={() => setChallenging(f.uid)}
            />
          ))}
        </div>
      )}

      {/* Offline friends */}
      {offline.length > 0 && (
        <div className="space-y-2">
          <div className="readout text-xs" style={{ color: 'var(--color-muted)' }}>
            ○ OFFLINE ({offline.length})
          </div>
          {offline.map(f => (
            <FriendCard key={f.uid} friend={f} presence={presence[f.uid]} />
          ))}
        </div>
      )}

      {friends.length === 0 && (
        <p className="font-mono text-xs italic" style={{ color: 'var(--color-muted)' }}>
          No allies yet. Search for operatives above.
        </p>
      )}

      {/* Challenge modal */}
      {challenging && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setChallenging(null)}
        >
          <motion.div
            className="card p-6 w-full max-w-xs"
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <h4 className="font-display font-bold text-bone text-xl tracking-widest uppercase mb-4">
              CHALLENGE
            </h4>
            <div className="space-y-2">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.tc}
                  className="btn-ghost w-full text-sm"
                  onClick={() => {
                    const f = friends.find(f => f.uid === challenging)
                    if (f) challengeFriend(f, opt.tc, opt.inc)
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="btn-ghost w-full mt-3 text-xs" onClick={() => setChallenging(null)}>
              CANCEL
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
