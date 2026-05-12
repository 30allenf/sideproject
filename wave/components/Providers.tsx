'use client'

import { useEffect } from 'react'
import { AuthContext, useAuthProvider } from '@/lib/hooks/useAuth'
import { initPresence } from '@/lib/presence'

export function Providers({ children }: { children: React.ReactNode }) {
  const authValue = useAuthProvider()

  useEffect(() => {
    if (!authValue.profile?.uid) return
    const cleanup = initPresence(authValue.profile.uid, authValue.profile.invisible ?? false)
    return cleanup
  }, [authValue.profile?.uid, authValue.profile?.invisible])

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}
