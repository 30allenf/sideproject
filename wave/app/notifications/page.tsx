'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '@/lib/hooks/useAuth'
import { useNotifications } from '@/lib/hooks/useNotifications'
import AppShell from '@/components/layout/AppShell'
import Avatar from '@/components/ui/Avatar'
import { useRouter } from 'next/navigation'
import { formatRelative } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function NotificationsPage() {
  const { profile } = useAuth()
  const { notifications, markAllRead, markRead } = useNotifications(profile?.uid)
  const router = useRouter()

  function handleNotifClick(n: { id: string; type: string; roomId?: string; dmId?: string }) {
    markRead(n.id)
    if (n.type === 'dm' || n.type === 'mention') {
      if (n.dmId) router.push(`/dm/${n.dmId}`)
      else if (n.roomId) router.push(`/room/${n.roomId}`)
    } else if (n.roomId) {
      router.push(`/room/${n.roomId}`)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)' }}>
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-espresso-15)' }}
        >
          <h1 className="font-display font-semibold text-xl" style={{ color: 'var(--color-espresso)' }}>Notifications</h1>
          {notifications.some(n => !n.read) && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <span className="text-5xl">🔔</span>
              <p className="font-display text-lg" style={{ color: 'var(--color-espresso-60)' }}>All caught up</p>
            </div>
          )}
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-[var(--color-espresso-08)] transition-colors"
              style={{ background: !n.read ? 'var(--color-amber-soft)' : undefined }}
              onClick={() => handleNotifClick(n)}
            >
              <Avatar src={n.senderAvatar} name={n.senderName} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-espresso)' }}>
                  <strong>{n.senderName}</strong> {n.type === 'dm' ? 'sent you a message' : n.type === 'mention' ? 'mentioned you' : n.type === 'reaction' ? 'reacted to your message' : 'invited you'}
                </p>
                {n.text && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>{n.text}</p>
                )}
                <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-espresso-30)' }}>
                  {n.createdAt ? formatRelative(n.createdAt) : ''}
                </p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--color-amber)' }} />}
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
