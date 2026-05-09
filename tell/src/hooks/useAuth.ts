'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange } from '@/lib/firebase/auth'
import { getUserProfile, setUsername as dbSetUsername } from '@/lib/firebase/db'
import { setPresence } from '@/lib/firebase/realtime'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  needsUsername: boolean
  setUsername: (username: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, needsUsername: false,
  setUsername: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthProvider(): AuthContextValue {
  const [user, setUser]         = useState<User | null>(null)
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u)
      if (u) {
        const p = await getUserProfile(u.uid)
        setProfile(p)
        // Register presence
        const cleanupPresence = setPresence(u.uid, null)
        return () => cleanupPresence()
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function setUsername(username: string) {
    if (!user) return
    await dbSetUsername(user.uid, username)
    const p = await getUserProfile(user.uid)
    setProfile(p)
  }

  const needsUsername = !!user && !!profile && !profile.username

  return { user, profile, loading, needsUsername, setUsername }
}
