'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '@/components/ui/Avatar'
import ReactionBar from './ReactionBar'
import ReactionPills from './ReactionPills'
import CodeBlock from './CodeBlock'
import type { Message, UserProfile } from '@/lib/types'
import { formatTimestamp } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢']

interface MessageItemProps {
  message: Message
  isOwnMessage: boolean
  collapsed: boolean
  members?: Record<string, UserProfile>
  onReply: () => void
  onUnsend: () => void
  onEdit: () => void
  onReact: (emoji: string) => void
  onMarkSeen: () => void
  isDM?: boolean
}

export default function MessageItem({
  message, isOwnMessage, collapsed, members,
  onReply, onUnsend, onEdit, onReact, onMarkSeen, isDM,
}: MessageItemProps) {
  const { profile } = useAuth()
  const [highlighted, setHighlighted] = useState(false)
  const [showSeenBy, setShowSeenBy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Read receipt via IntersectionObserver
  const { ref: inViewRef, inView } = useInView({ threshold: 0.5, triggerOnce: true })
  useEffect(() => {
    if (inView && profile && !isOwnMessage && !message.seenBy?.[profile.uid]) {
      onMarkSeen()
    }
  }, [inView, profile, isOwnMessage, message.seenBy, onMarkSeen])

  // Combine refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    inViewRef(node)
  }, [inViewRef])

  function jumpToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-pulse')
    setTimeout(() => el.classList.remove('highlight-pulse'), 1600)
  }

  if (message.unsent) {
    return (
      <div
        id={`msg-${message.id}`}
        className="message-row px-4 py-0.5"
        ref={setRefs}
      >
        {!collapsed && <div style={{ height: 8 }} />}
        <div className="flex gap-3" style={{ paddingLeft: collapsed ? 44 : 0 }}>
          {!collapsed && (
            <div style={{ width: 36, flexShrink: 0 }} />
          )}
          <p className="unsent-msg">— message unsent</p>
        </div>
      </div>
    )
  }

  const seenUids = Object.keys(message.seenBy ?? {})
  const seenByOthers = seenUids.filter(u => u !== profile?.uid)

  return (
    <motion.div
      id={`msg-${message.id}`}
      ref={setRefs}
      className="message-row px-4 py-0.5 group"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      {!collapsed && <div style={{ height: 10 }} />}

      <div className="flex gap-3">
        {/* Avatar */}
        <div style={{ width: 36, flexShrink: 0 }}>
          {!collapsed ? (
            <Avatar
              src={message.senderAvatar || members?.[message.senderId]?.avatarUrl}
              name={message.senderName}
              size={36}
            />
          ) : null}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          {!collapsed && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span
                className="font-display font-semibold text-sm"
                style={{ color: 'var(--color-espresso)' }}
              >
                {message.senderName}
              </span>
              <span
                className="font-mono text-[11px]"
                style={{ color: 'var(--color-espresso-30)' }}
              >
                {formatTimestamp(message.createdAt)}
              </span>
              {message.edited && (
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-espresso-30)' }}>
                  (edited)
                </span>
              )}
            </div>
          )}

          {/* Reply quote */}
          {message.replyTo && (
            <div
              className="reply-quote mb-1"
              onClick={() => jumpToMessage(message.replyTo!.messageId)}
            >
              <p className="font-display font-semibold text-xs mb-0.5" style={{ color: 'var(--color-terracotta)' }}>
                ↩ {message.replyTo.senderName}
              </p>
              {message.replyTo.unsent ? (
                <p className="text-xs italic" style={{ color: 'var(--color-espresso-30)' }}>original message was unsent</p>
              ) : (
                <div className="flex items-start gap-2">
                  {message.replyTo.imageUrl && (
                    <img
                      src={message.replyTo.imageUrl}
                      alt=""
                      className="w-10 h-10 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
                    {message.replyTo.text}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Message body */}
          {message.type === 'image' && message.imageUrl ? (
            <ImageMessage url={message.imageUrl} text={message.text} html={message.html} />
          ) : message.type === 'file' && message.fileUrl ? (
            <FileMessage url={message.fileUrl} name={message.fileName ?? 'file'} size={message.fileSize} />
          ) : message.html?.includes('<pre') || message.html?.includes('```') ? (
            <CodeBlock html={message.html} />
          ) : (
            <div
              className="message-body"
              dangerouslySetInnerHTML={{ __html: message.html ?? message.text }}
            />
          )}

          {/* Link preview */}
          {message.linkPreview && <LinkPreviewCard preview={message.linkPreview} />}

          {/* Reactions */}
          {Object.keys(message.reactions ?? {}).length > 0 && (
            <ReactionPills
              reactions={message.reactions}
              myUid={profile?.uid ?? ''}
              members={members}
              onReact={onReact}
            />
          )}

          {/* Read receipts (own messages in DM only) */}
          {isDM && isOwnMessage && (
            <ReadReceipt
              message={message}
              seenByOthers={seenByOthers}
              members={members}
              onShowSeenBy={() => setShowSeenBy(v => !v)}
            />
          )}
        </div>

        {/* Action bar */}
        <div className="message-actions">
          {QUICK_REACTIONS.map(emoji => (
            <button key={emoji} className="action-btn text-base" onClick={() => onReact(emoji)} title={emoji}>
              {emoji}
            </button>
          ))}
          <button className="action-btn text-sm" onClick={onReply} title="Reply">↩</button>
          {isOwnMessage && (
            <>
              <button className="action-btn text-sm" onClick={onEdit} title="Edit">✏️</button>
              <button className="action-btn danger text-sm" onClick={onUnsend} title="Unsend">🗑</button>
            </>
          )}
        </div>
      </div>

      {/* Seen by tooltip in groups */}
      {showSeenBy && !isDM && seenByOthers.length > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ml-12 mt-1 flex items-center gap-1 flex-wrap"
          >
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-espresso-30)' }}>Seen by:</span>
            {seenByOthers.map(uid => {
              const m = members?.[uid]
              return (
                <div key={uid} className="relative group/seen">
                  <Avatar src={m?.avatarUrl} name={m?.displayName ?? uid} size={16} />
                  <div className="tooltip hidden group-hover/seen:block text-[10px]">{m?.displayName ?? uid}</div>
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}

function ImageMessage({ url, text, html }: { url: string; text: string; html?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="mt-1">
        <img
          src={url}
          alt={text || 'image'}
          className="rounded-lg max-w-xs max-h-64 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
          onClick={() => setOpen(true)}
        />
        {text && <div className="message-body mt-1" dangerouslySetInnerHTML={{ __html: html ?? text }} />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="modal-backdrop cursor-zoom-out"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.img
              src={url}
              alt={text}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function FileMessage({ url, name, size }: { url: string; name: string; size?: number }) {
  const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE'
  const sizeStr = size ? (size > 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`) : ''
  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 px-4 py-3 rounded-lg mt-1 hover:opacity-80 transition-opacity"
      style={{ background: 'var(--color-paper-dim)', border: '1px solid var(--color-espresso-15)' }}
    >
      <span className="text-2xl">📎</span>
      <div>
        <p className="font-display font-semibold text-sm" style={{ color: 'var(--color-espresso)' }}>{name}</p>
        <p className="font-mono text-[11px]" style={{ color: 'var(--color-espresso-30)' }}>{ext} {sizeStr && `• ${sizeStr}`}</p>
      </div>
      <span className="ml-2 text-lg">⬇️</span>
    </a>
  )
}

function LinkPreviewCard({ preview }: { preview: import('@/lib/types').LinkPreview }) {
  return (
    <a href={preview.url} target="_blank" rel="noreferrer" className="link-preview block mt-2 hover:opacity-80 transition-opacity">
      <div className="link-preview-bar" />
      <div className="link-preview-body">
        {preview.imageUrl && (
          <img src={preview.imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2" />
        )}
        <p className="font-display font-semibold text-sm mb-0.5 truncate" style={{ color: 'var(--color-espresso)' }}>{preview.title}</p>
        {preview.description && (
          <p className="text-xs line-clamp-2" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>{preview.description}</p>
        )}
        <p className="font-mono text-[10px] mt-1 truncate" style={{ color: 'var(--color-terracotta)' }}>{preview.url}</p>
      </div>
    </a>
  )
}

function ReadReceipt({ message, seenByOthers, members, onShowSeenBy }: {
  message: Message
  seenByOthers: string[]
  members?: Record<string, UserProfile>
  onShowSeenBy: () => void
}) {
  const seen = seenByOthers.length > 0

  return (
    <div className="flex justify-end mt-0.5 gap-1 items-center">
      {seen ? (
        <span
          className="receipt-seen font-mono text-[11px] cursor-pointer select-none"
          title={`Seen by ${seenByOthers.map(u => members?.[u]?.displayName ?? u).join(', ')}`}
          onClick={onShowSeenBy}
        >
          ✓✓
        </span>
      ) : message.delivered ? (
        <span className="receipt-delivered font-mono text-[11px]" title="Delivered">✓✓</span>
      ) : (
        <span className="receipt-delivered font-mono text-[11px]" title="Sent">✓</span>
      )}
    </div>
  )
}
