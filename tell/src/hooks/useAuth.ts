'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import type { UserProfile } from '@/types'

const PROFILE_KEY = 'tell_profile'
const UID_KEY     = 'tell_uid'

function loadProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_KEY)
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

function saveProfile(p: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
}

function getOrCreateUid(): string {
  let uid = localStorage.getItem(UID_KEY)
  if (!uid) {
    uid = 'local_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
    localStorage.setItem(UID_KEY, uid)
  }
  return uid
}

interface AuthContextValue {
  profile: UserProfile | null
  loading: boolean
  needsUsername: boolean
  setUsername: (username: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  profile: null, loading: true, needsUsername: false,
  setUsername: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthProvider(): AuthContextValue {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setProfile(loadProfile())
    setLoading(false)
  }, [])

  async function setUsername(username: string) {
    const uid = getOrCreateUid()
    const existing = loadProfile()
    const p: UserProfile = existing ?? {
      uid,
      username,
      displayName: username,
      photoURL: null,
      email: '',
      elo: { bullet: 800, blitz: 800, rapid: 800 },
      stats: { wins: 0, losses: 0, draws: 0, totalPanicDealt: 0, avgGameLength: 0 },
      friends: [],
      createdAt: Date.now(),
    }
    const updated = { ...p, uid, username, displayName: username }
    saveProfile(updated)
    setProfile(updated)
  }

  const needsUsername = !loading && (!profile || !profile.username)

  return { profile, loading, needsUsername, setUsername }
}
