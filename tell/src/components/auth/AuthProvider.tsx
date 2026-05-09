'use client'

import { AuthContext, useAuthProvider } from '@/hooks/useAuth'
import UsernameGate from './UsernameGate'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthProvider()

  return (
    <AuthContext.Provider value={value}>
      {value.needsUsername ? <UsernameGate /> : children}
    </AuthContext.Provider>
  )
}
