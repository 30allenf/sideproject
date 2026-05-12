// Firebase removed — user profile stored in localStorage
import type { UserProfile } from '@/types'

function profileKey(uid: string) { return `tell_profile_${uid}` }

export function getOrCreateUserProfile(_user: unknown): Promise<UserProfile> {
  return Promise.resolve(null as unknown as UserProfile)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(profileKey(uid))
  return raw ? JSON.parse(raw) : null
}

export async function setUsername(uid: string, username: string): Promise<void> {
  const existing = await getUserProfile(uid)
  if (!existing) return
  localStorage.setItem(profileKey(uid), JSON.stringify({ ...existing, username, displayName: username }))
}

export async function saveGame(_gameId: string, _record: unknown): Promise<void> {}
export async function getRecentGames(_uid: string): Promise<unknown[]> { return [] }
export async function getFriends(_uids: string[]): Promise<UserProfile[]> { return [] }
export async function sendFriendRequest(..._args: unknown[]): Promise<void> {}
export async function respondToFriendRequest(..._args: unknown[]): Promise<void> {}
export function subscribeToFriendRequests(_uid: string, _cb: (reqs: unknown[]) => void) { return () => {} }
export function subscribeToProfile(_uid: string, _cb: (p: UserProfile | null) => void) { return () => {} }
export async function searchUsers(_term: string): Promise<UserProfile[]> { return [] }
export async function createChallenge(..._args: unknown[]): Promise<void> {}
export function subscribeToIncomingChallenges(_uid: string, _cb: (c: unknown[]) => void) { return () => {} }
