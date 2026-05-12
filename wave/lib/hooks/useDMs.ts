'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/config'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, getDocs, getDoc, orderBy, setDoc
} from 'firebase/firestore'
import type { DMConversation, UserProfile } from '../types'

export function useMyDMs(uid: string | undefined) {
  const [dms, setDMs] = useState<DMConversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    const q = query(
      collection(db, 'dms'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setDMs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DMConversation)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { dms, loading }
}

export function useDM(dmId: string | null) {
  const [dm, setDM] = useState<DMConversation | null>(null)

  useEffect(() => {
    if (!dmId) return
    const unsub = onSnapshot(doc(db, 'dms', dmId), snap => {
      if (snap.exists()) setDM({ id: snap.id, ...snap.data() } as DMConversation)
    })
    return unsub
  }, [dmId])

  return dm
}

export async function getOrCreateDM(uid1: string, uid2: string): Promise<string> {
  // Canonical ID: sorted uids joined
  const dmId = [uid1, uid2].sort().join('_')
  const dmRef = doc(db, 'dms', dmId)
  const snap = await getDoc(dmRef)

  if (!snap.exists()) {
    // Fetch both profiles for participant profiles map
    const [snap1, snap2] = await Promise.all([
      getDoc(doc(db, 'users', uid1)),
      getDoc(doc(db, 'users', uid2)),
    ])
    const p1 = snap1.data() as UserProfile
    const p2 = snap2.data() as UserProfile

    await setDoc(dmRef, {
      participants: [uid1, uid2],
      participantProfiles: {
        [uid1]: { displayName: p1.displayName, username: p1.username, avatarUrl: p1.avatarUrl, presence: p1.presence ?? 'offline', lastSeen: p1.lastSeen ?? null },
        [uid2]: { displayName: p2.displayName, username: p2.username, avatarUrl: p2.avatarUrl, presence: p2.presence ?? 'offline', lastSeen: p2.lastSeen ?? null },
      },
      lastMessage: null,
      lastMessageAt: serverTimestamp(),
      lastSenderId: null,
      unreadCount: { [uid1]: 0, [uid2]: 0 },
      typing: {},
    })
  }

  return dmId
}

export async function searchUsers(query_str: string): Promise<UserProfile[]> {
  if (!query_str.trim()) return []
  const q = query(
    collection(db, 'users'),
    where('username', '>=', query_str.toLowerCase()),
    where('username', '<=', query_str.toLowerCase() + '')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as UserProfile)
}
