'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getFriends,
  sendFriendRequest,
  respondToFriendRequest,
  subscribeToFriendRequests,
  subscribeToProfile,
  searchUsers,
} from '@/lib/firebase/db'
import { subscribePresence } from '@/lib/firebase/realtime'
import type { UserProfile, FriendRequest, PresenceRecord } from '@/types'

export function useFriends(profile: UserProfile | null) {
  const [friends, setFriends]             = useState<UserProfile[]>([])
  const [presence, setPresence]           = useState<Record<string, PresenceRecord>>({})
  const [pendingRequests, setPending]     = useState<FriendRequest[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!profile?.friends?.length) { setFriends([]); setLoading(false); return }
    getFriends(profile.friends).then(f => { setFriends(f); setLoading(false) })
    const unsub = subscribePresence(profile.friends, setPresence)
    return unsub
  }, [profile?.friends?.join(',')])   // eslint-disable-line

  useEffect(() => {
    if (!profile?.uid) return
    return subscribeToFriendRequests(profile.uid, setPending)
  }, [profile?.uid])

  const sendRequest = useCallback(async (toUid: string) => {
    if (!profile) return
    await sendFriendRequest(profile.uid, profile.username, toUid)
  }, [profile])

  const respond = useCallback(async (request: FriendRequest, accept: boolean) => {
    await respondToFriendRequest(request.id, accept, request.from, profile!.uid)
  }, [profile])

  const search = useCallback((term: string) => searchUsers(term), [])

  return { friends, presence, pendingRequests, loading, sendRequest, respond, search }
}
