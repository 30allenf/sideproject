'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface AppShellProps {
  children: React.ReactNode
  activeRoomId?: string
  activeDMId?: string
  rightPanel?: React.ReactNode
  showRightPanel?: boolean
}

export default function AppShell({ children, activeRoomId, activeDMId, rightPanel, showRightPanel }: AppShellProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileSidebar, setMobileSidebar] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-paper">
      <WaveLoader />
    </div>
  )

  if (!user) return null

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-paper)' }}>
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {mobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`
          fixed md:relative z-50 md:z-auto h-full
          ${mobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ width: 280, flexShrink: 0, transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        <Sidebar
          activeRoomId={activeRoomId}
          activeDMId={activeDMId}
          onNavigation={() => setMobileSidebar(false)}
        />
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 md:hidden border-b" style={{ borderColor: 'var(--color-espresso-15)' }}>
          <button
            onClick={() => setMobileSidebar(true)}
            className="action-btn text-lg"
          >
            ☰
          </button>
          <span className="font-display font-semibold text-lg" style={{ color: 'var(--color-terracotta)' }}>Wave</span>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Chat area */}
          <div className="flex-1 min-w-0 h-full">
            {children}
          </div>

          {/* Right panel (thread / room info) */}
          <AnimatePresence>
            {showRightPanel && rightPanel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="border-l overflow-hidden flex-shrink-0"
                style={{ borderColor: 'var(--color-espresso-15)', background: 'var(--color-surface)' }}
              >
                {rightPanel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function WaveLoader() {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="font-display text-4xl font-light" style={{ color: 'var(--color-terracotta)', letterSpacing: '-0.02em' }}>Wave</span>
      <div className="flex gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}
