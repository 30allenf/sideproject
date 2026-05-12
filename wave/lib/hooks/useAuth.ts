'use client'

import { useState, useEffect, useContext, createContext } from 'react'
import type { UserProfile } from '../types'

const PROFILE_KEY = 'wave_profile'

function generateUid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface AuthContextValue {
  user: { uid: string } | null
  profile: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  createAccount: (username: string, displayName: string) => Promise<void>
  needsUsername: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  createAccount: async () => {},
  needsUsername: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthProvider(): AuthContextValue {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      try { setProfile(JSON.parse(raw)) } catch {}
    }
    setLoading(false)
  }, [])

  async function createAccount(username: string, displayName: string) {
    const uid = generateUid()
    const now = new Date().toISOString()
    const newProfile: UserProfile = {
      uid,
      email: '',
      displayName,
      username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      avatarUrl: '',
      statusMessage: '',
      presence: 'online',
      lastSeen: null,
      invisible: false,
      notificationsEnabled: true,
      mutedRooms: [],
      mutedDMs: [],
      pinnedDMs: [],
      createdAt: now as never,
      updatedAt: now as never,
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile))
    setProfile(newProfile)

    // Also try to write to Firestore if Firebase is configured
    try {
      const { db } = await import('../firebase/config')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(doc(db, 'users', uid), { ...newProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    } catch {}
  }

  async function signOut() {
    localStorage.removeItem(PROFILE_KEY)
    setProfile(null)
  }

  // Keep for API compatibility — not used without Firebase
  async function signInWithGoogle() {}

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile) return
    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() as never }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
    setProfile(updated)

    try {
      const { db } = await import('../firebase/config')
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      await updateDoc(doc(db, 'users', profile.uid), { ...updates, updatedAt: serverTimestamp() })
    } catch {}
  }

  const user = profile ? { uid: profile.uid } : null
  const needsUsername = false  // account creation sets username immediately

  return { user, profile, loading, signInWithGoogle, signOut, updateProfile, createAccount, needsUsername }
}
