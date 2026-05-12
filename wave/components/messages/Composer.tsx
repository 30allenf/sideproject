'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import type { ReplyRef } from '@/lib/types'
import { setTyping, clearTyping } from '@/lib/typing'
import { useAuth } from '@/lib/hooks/useAuth'

const EmojiPicker = dynamic(
  () => import('@emoji-mart/react').then(m => m.default as React.ComponentType<{
    data: unknown; onEmojiSelect: (e: { native: string }) => void;
    theme?: string; skinTonePosition?: string;
  }>),
  { ssr: false }
)

interface ComposerProps {
  roomId: string
  replyTo?: ReplyRef | null
  onCancelReply?: () => void
  onSend: (params: {
    text: string
    replyTo?: ReplyRef
    imageFile?: File
    attachFile?: File
  }) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

// Emoji data for autocomplete
const emojiShortcodes: [string, string][] = [
  [':smile:', '😊'], [':heart:', '❤️'], [':fire:', '🔥'], [':thumbsup:', '👍'],
  [':tada:', '🎉'], [':eyes:', '👀'], [':rocket:', '🚀'], [':star:', '⭐'],
  [':laugh:', '😂'], [':cry:', '😢'], [':think:', '🤔'], [':check:', '✅'],
  [':x:', '❌'], [':wave:', '👋'], [':clap:', '👏'], [':joy:', '😂'],
  [':ok:', '👌'], [':pray:', '🙏'], [':muscle:', '💪'], [':sun:', '☀️'],
]

export default function Composer({ roomId, replyTo, onCancelReply, onSend, disabled, placeholder }: ComposerProps) {
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiAC, setEmojiAC] = useState<{ query: string; matches: [string, string][] } | null>(null)
  const [acIndex, setAcIndex] = useState(0)
  const [sending, setSending] = useState(false)
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emojiData = useRef<unknown>(null)

  useEffect(() => {
    import('@emoji-mart/data').then(m => { emojiData.current = m.default })
  }, [])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`
  }, [text])

  // Handle typing indicators
  function handleTyping() {
    if (!profile) return
    setTyping(roomId, profile.uid, profile.displayName)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      if (profile) clearTyping(roomId, profile.uid)
    }, 3000)
  }

  function checkEmojiAC(val: string) {
    // Look for :word pattern at end of input
    const match = val.match(/:(\w+)$/)
    if (match && match[1].length >= 1) {
      const query = match[1].toLowerCase()
      const matches = emojiShortcodes.filter(([code]) => code.slice(1).includes(query)).slice(0, 6)
      if (matches.length > 0) {
        setEmojiAC({ query, matches })
        setAcIndex(0)
        return
      }
    }
    setEmojiAC(null)
  }

  function insertEmoji(native: string) {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const before = text.slice(0, pos)
    const after = text.slice(pos)
    const newText = before + native + after
    setText(newText)
    setShowEmojiPicker(false)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(pos + native.length, pos + native.length)
    }, 0)
  }

  function insertACEmoji(native: string) {
    if (!emojiAC) return
    // Replace `:query` at end with emoji
    const newText = text.replace(/:(\w+)$/, native + ' ')
    setText(newText)
    setEmojiAC(null)
    textareaRef.current?.focus()
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && !imagePreview && !attachFile) return
    setSending(true)
    try {
      await onSend({
        text: trimmed,
        replyTo: replyTo ?? undefined,
        imageFile: imagePreview?.file,
        attachFile: attachFile ?? undefined,
      })
      setText('')
      setImagePreview(null)
      setAttachFile(null)
      onCancelReply?.()
      if (profile) clearTyping(roomId, profile.uid)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Emoji autocomplete navigation
    if (emojiAC) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcIndex(i => (i + 1) % emojiAC.matches.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAcIndex(i => (i - 1 + emojiAC.matches.length) % emojiAC.matches.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertACEmoji(emojiAC.matches[acIndex][1]); return }
      if (e.key === 'Escape')    { e.preventDefault(); setEmojiAC(null); return }
    }
    // Send on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          setImagePreview({ file, url: URL.createObjectURL(file) })
          return
        }
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.type.startsWith('image/')) {
      setImagePreview({ file, url: URL.createObjectURL(file) })
    } else {
      if (file.size > 10 * 1024 * 1024) { alert('File too large — max 10 MB'); return }
      setAttachFile(file)
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) {
      setImagePreview({ file, url: URL.createObjectURL(file) })
    } else {
      if (file.size > 10 * 1024 * 1024) { alert('File too large — max 10 MB'); return }
      setAttachFile(file)
    }
    e.target.value = ''
  }

  return (
    <div
      className="px-4 pb-4 pt-2 flex-shrink-0"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-start gap-2 px-3 py-2 mb-2 rounded-t-lg"
              style={{ background: 'var(--color-terra-soft)', borderLeft: '2px solid var(--color-terracotta)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-xs mb-0.5" style={{ color: 'var(--color-terracotta)' }}>
                  Replying to {replyTo.senderName}
                </p>
                {replyTo.imageUrl && (
                  <img src={replyTo.imageUrl} alt="" className="w-8 h-8 object-cover rounded mr-1 inline-block" />
                )}
                <p className="text-xs truncate" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
                  {replyTo.unsent ? '[original message unsent]' : replyTo.text}
                </p>
              </div>
              <button className="action-btn text-sm flex-shrink-0" onClick={onCancelReply}>✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image/file preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 mb-2"
          >
            <img src={imagePreview.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
            <button className="action-btn text-sm mt-1" onClick={() => setImagePreview(null)}>✕</button>
          </motion.div>
        )}
        {attachFile && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-paper-dim)', border: '1px solid var(--color-espresso-15)' }}
          >
            <span>📎</span>
            <span className="text-sm flex-1 truncate" style={{ fontFamily: 'var(--font-body)' }}>{attachFile.name}</span>
            <button className="action-btn text-sm" onClick={() => setAttachFile(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main composer */}
      <div className="relative">
        {/* Emoji autocomplete */}
        <AnimatePresence>
          {emojiAC && (
            <motion.div
              className="emoji-ac"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {emojiAC.matches.map(([code, native], i) => (
                <div
                  key={code}
                  className={`emoji-ac-item ${i === acIndex ? 'active' : ''}`}
                  onMouseDown={e => { e.preventDefault(); insertACEmoji(native) }}
                >
                  <span className="text-lg">{native}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--color-espresso-60)' }}>{code}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="composer-wrap flex items-end gap-2">
          {/* Attach */}
          <button
            className="action-btn text-lg flex-shrink-0 mb-0.5"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="*/*"
            onChange={handleFileInput}
          />

          {/* Text input */}
          <textarea
            ref={textareaRef}
            className="composer-input flex-1"
            value={text}
            onChange={e => {
              setText(e.target.value)
              handleTyping()
              checkEmojiAC(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder ?? 'Say something...'}
            disabled={disabled || sending}
            rows={1}
          />

          {/* Emoji picker toggle */}
          <button
            className="action-btn text-lg flex-shrink-0 mb-0.5"
            onClick={() => setShowEmojiPicker(v => !v)}
            title="Emoji"
          >
            😊
          </button>

          {/* Send */}
          <button
            className="btn btn-primary btn-sm flex-shrink-0 mb-0.5"
            onClick={handleSend}
            disabled={disabled || sending || (!text.trim() && !imagePreview && !attachFile)}
          >
            {sending ? '...' : '↑'}
          </button>
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmojiPicker && emojiData.current ? (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, zIndex: 30 }}
            >
              <EmojiPicker
                data={emojiData.current}
                onEmojiSelect={(e) => insertEmoji(e.native)}
                theme="light"
                skinTonePosition="search"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Keyboard hint */}
      <p className="font-mono text-[10px] mt-1 text-right" style={{ color: 'var(--color-espresso-30)' }}>
        Enter to send · Shift+Enter for newline · : for emoji
      </p>
    </div>
  )
}
