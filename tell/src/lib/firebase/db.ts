import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './client'
import type { UserProfile, FriendRequest, GameRecord, EloRatings } from '@/types'

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as UserProfile

  const defaultProfile: UserProfile = {
    uid: user.uid,
    username: '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL,
    email: user.email ?? '',
    elo: { bullet: 1200, blitz: 1200, rapid: 1200 },
    stats: { wins: 0, losses: 0, draws: 0, totalPanicDealt: 0, avgGameLength: 0 },
    friends: [],
    createdAt: Date.now(),
  }
  await setDoc(ref, defaultProfile)
  return defaultProfile
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function setUsername(uid: string, username: string): Promise<void> {
  const reserved = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  if (reserved.exists()) throw new Error('Username taken')
  await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid })
  await updateDoc(doc(db, 'users', uid), { username })
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  if (!usernameDoc.exists()) return null
  return getUserProfile(usernameDoc.data().uid)
}

export function subscribeToProfile(uid: string, cb: (p: UserProfile) => void): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), snap => {
    if (snap.exists()) cb(snap.data() as UserProfile)
  })
}

export async function updateElo(uid: string, ratings: Partial<EloRatings>): Promise<void> {
  const updates: Record<string, number> = {}
  for (const [k, v] of Object.entries(ratings)) updates[`elo.${k}`] = v
  await updateDoc(doc(db, 'users', uid), updates)
}

export async function recordGameResult(
  uid: string,
  result: 'win' | 'loss' | 'draw',
  panicDealt: number,
  gameLength: number
): Promise<void> {
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, {
    'stats.wins':          result === 'win'  ? increment(1) : increment(0),
    'stats.losses':        result === 'loss' ? increment(1) : increment(0),
    'stats.draws':         result === 'draw' ? increment(1) : increment(0),
    'stats.totalPanicDealt': increment(panicDealt),
    'stats.avgGameLength':  gameLength, // approximated, could be weighted average
  })
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export async function sendFriendRequest(
  fromUid: string,
  fromUsername: string,
  toUid: string
): Promise<void> {
  await addDoc(collection(db, 'friendRequests'), {
    from: fromUid,
    fromUsername,
    to: toUid,
    status: 'pending',
    createdAt: Date.now(),
  })
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
  fromUid: string,
  toUid: string
): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status: accept ? 'accepted' : 'declined',
  })
  if (accept) {
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(toUid) })
    await updateDoc(doc(db, 'users', toUid),   { friends: arrayUnion(fromUid) })
  }
}

export async function removeFriend(uid: string, friendUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid),       { friends: arrayRemove(friendUid) })
  await updateDoc(doc(db, 'users', friendUid), { friends: arrayRemove(uid) })
}

export function subscribeToFriendRequests(
  uid: string,
  cb: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', uid),
    where('status', '==', 'pending')
  )
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)))
  })
}

export async function getFriends(uids: string[]): Promise<UserProfile[]> {
  if (!uids.length) return []
  const chunks: string[][] = []
  for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10))
  const results: UserProfile[] = []
  for (const chunk of chunks) {
    const q = query(collection(db, 'users'), where('uid', 'in', chunk))
    const snap = await getDocs(q)
    snap.docs.forEach(d => results.push(d.data() as UserProfile))
  }
  return results
}

export async function searchUsers(term: string): Promise<UserProfile[]> {
  const q = query(
    collection(db, 'users'),
    where('username', '>=', term),
    where('username', '<=', term + ''),
    limit(10)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as UserProfile)
}

// ─── Game Records ─────────────────────────────────────────────────────────────

export async function saveGame(game: Omit<GameRecord, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'games'), game)
  return ref.id
}

export async function getGame(id: string): Promise<GameRecord | null> {
  const snap = await getDoc(doc(db, 'games', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as GameRecord) : null
}

export async function getRecentGames(uid: string, count = 10): Promise<GameRecord[]> {
  const q = query(
    collection(db, 'games'),
    where('players.white.uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(count)
  )
  const q2 = query(
    collection(db, 'games'),
    where('players.black.uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(count)
  )
  const [s1, s2] = await Promise.all([getDocs(q), getDocs(q2)])
  const games = [
    ...s1.docs.map(d => ({ id: d.id, ...d.data() } as GameRecord)),
    ...s2.docs.map(d => ({ id: d.id, ...d.data() } as GameRecord)),
  ]
  return games.sort((a, b) => b.createdAt - a.createdAt).slice(0, count)
}

// ─── Challenges ──────────────────────────────────────────────────────────────

export async function createChallenge(
  from: string,
  fromUsername: string,
  to: string,
  timeControl: string,
  increment: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'challenges'), {
    from, fromUsername, to, timeControl, increment,
    status: 'pending',
    createdAt: Date.now(),
  })
  return ref.id
}

export function subscribeToIncomingChallenges(
  uid: string,
  cb: (challenges: import('@/types').Challenge[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'challenges'),
    where('to', '==', uid),
    where('status', '==', 'pending')
  )
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as import('@/types').Challenge)))
  })
}

export async function respondToChallenge(
  challengeId: string,
  accept: boolean,
  gameId?: string
): Promise<void> {
  await updateDoc(doc(db, 'challenges', challengeId), {
    status: accept ? 'accepted' : 'declined',
    ...(gameId ? { gameId } : {}),
  })
}
