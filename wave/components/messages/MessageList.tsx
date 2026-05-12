'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MessageItem from './MessageItem'
import type { Message, UserProfile } from '@/lib/types'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatDateHeader } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onReply: (msg: Message) => void
  onUnsend: (msg: Message) => void
  onEdit: (msg: Message) => void
  onReact: (msgId: string, emoji: string) => void
  onMarkSeen: (msgId: string) => void
  members?: Record<string, UserProfile>
  isDM?: boolean
}

export default function MessageList({
  messages, loading, hasMore, onLoadMore,
  onReply, onUnsend, onEdit, onReact, onMarkSeen,
  members, isDM,
}: MessageListProps) {
  const { profile } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef    = useRef<HTMLDivElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const [prevHeight, setPrevHeight] = useState(0)
  const didInitialScroll = useRef(false)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!bottomRef.current) return
    if (!didInitialScroll.current || messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: didInitialScroll.current ? 'smooth' : 'instant' })
      didInitialScroll.current = true
    }
  }, [messages.length])

  // Preserve scroll position when loading older messages
  const handleLoadMore = useCallback(() => {
    if (listRef.current) setPrevHeight(listRef.current.scrollHeight)
    onLoadMore()
  }, [onLoadMore])

  useEffect(() => {
    if (prevHeight > 0 && listRef.current) {
      const newHeight = listRef.current.scrollHeight
      listRef.current.scrollTop = newHeight - prevHeight
      setPrevHeight(0)
    }
  }, [messages.length, prevHeight])

  // Infinite scroll (upward)
  useEffect(() => {
    const sentinel = topRef.current
    if (!sentinel || !hasMore) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) handleLoadMore()
    }, { threshold: 0.1 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, handleLoadMore])

  if (loading) return (
    <div className="flex items-center justify-center flex-1 py-12">
      <div className="flex gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )

  // Group messages: add date separators and collapse same-sender
  const groups = groupMessages(messages)

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto min-h-0"
      style={{ padding: '8px 0 0' }}
    >
      {/* Load more sentinel */}
      {hasMore && (
        <div ref={topRef} className="flex justify-center py-3">
          <button
            className="btn btn-ghost btn-sm text-xs"
            onClick={handleLoadMore}
          >
            Load earlier messages
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center py-20">
          <span className="text-5xl">💬</span>
          <p className="font-display text-xl font-light" style={{ color: 'var(--color-espresso)' }}>
            {isDM ? 'Start the conversation' : 'First message in this room'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
            Say something. It&apos;ll be great.
          </p>
        </div>
      )}

      {groups.map(item => {
        if (item.type === 'date') {
          return (
            <div key={`date-${item.date}`} className="flex items-center gap-3 px-4 py-3 select-none">
              <hr className="flex-1" style={{ borderColor: 'var(--color-espresso-15)' }} />
              <span className="font-mono text-[11px] uppercase tracking-widest px-2" style={{ color: 'var(--color-espresso-30)' }}>
                {item.date}
              </span>
              <hr className="flex-1" style={{ borderColor: 'var(--color-espresso-15)' }} />
            </div>
          )
        }
        return (
          <MessageItem
            key={item.msg.id}
            message={item.msg}
            isOwnMessage={item.msg.senderId === profile?.uid}
            collapsed={item.collapsed}
            members={members}
            onReply={() => onReply(item.msg)}
            onUnsend={() => onUnsend(item.msg)}
            onEdit={() => onEdit(item.msg)}
            onReact={(emoji) => onReact(item.msg.id, emoji)}
            onMarkSeen={() => onMarkSeen(item.msg.id)}
            isDM={isDM}
          />
        )
      })}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  )
}

type GroupItem =
  | { type: 'date'; date: string }
  | { type: 'msg'; msg: Message; collapsed: boolean }

function groupMessages(messages: Message[]): GroupItem[] {
  const result: GroupItem[] = []
  let lastDate = ''
  let lastSender = ''
  let lastTs = 0

  for (const msg of messages) {
    const ts = msg.createdAt?.toDate?.()?.getTime() ?? 0
    const dateStr = msg.createdAt ? formatDateHeader(msg.createdAt) : ''

    if (dateStr !== lastDate) {
      result.push({ type: 'date', date: dateStr })
      lastDate = dateStr
      lastSender = ''
      lastTs = 0
    }

    const sameWindow = msg.senderId === lastSender && ts - lastTs < 5 * 60 * 1000
    result.push({ type: 'msg', msg, collapsed: sameWindow })
    lastSender = msg.senderId
    lastTs = ts
  }

  return result
}
