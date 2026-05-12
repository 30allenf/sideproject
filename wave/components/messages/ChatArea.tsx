'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import MessageList from './MessageList'
import Composer from './Composer'
import TypingIndicator from './TypingIndicator'
import UnsendConfirmModal from './UnsendConfirmModal'
import EditMessageModal from './EditMessageModal'
import { useMessages } from '@/lib/hooks/useMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Message, ReplyRef, UserProfile } from '@/lib/types'

interface ChatAreaProps {
  roomId: string
  members?: Record<string, UserProfile>
  isDM?: boolean
  disabled?: boolean
}

export default function ChatArea({ roomId, members, isDM, disabled }: ChatAreaProps) {
  const { profile } = useAuth()
  const {
    messages, loading, hasMore, loadMore,
    sendMessage, editMessage, unsendMessage, deleteForMe,
    addReaction, markSeen,
  } = useMessages(roomId)

  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null)
  const [toUnsend, setToUnsend] = useState<Message | null>(null)
  const [toEdit, setToEdit]     = useState<Message | null>(null)

  const handleSend = useCallback(async (params: {
    text: string
    replyTo?: ReplyRef
    imageFile?: File
    attachFile?: File
  }) => {
    if (!profile) return
    await sendMessage({
      text: params.text,
      senderId: profile.uid,
      senderName: profile.displayName,
      senderAvatar: profile.avatarUrl ?? '',
      replyTo: params.replyTo,
      imageFile: params.imageFile,
      attachFile: params.attachFile,
    })
  }, [profile, sendMessage])

  const handleUnsend = useCallback(async () => {
    if (!toUnsend) return
    await unsendMessage(toUnsend.id)
    setToUnsend(null)
  }, [toUnsend, unsendMessage])

  const handleDeleteForMe = useCallback(async () => {
    if (!toUnsend || !profile) return
    await deleteForMe(toUnsend.id, profile.uid)
    setToUnsend(null)
  }, [toUnsend, profile, deleteForMe])

  const handleEdit = useCallback(async (newText: string) => {
    if (!toEdit) return
    await editMessage(toEdit.id, newText)
    setToEdit(null)
  }, [toEdit, editMessage])

  const handleReply = useCallback((msg: Message) => {
    setReplyTo({
      messageId: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
      imageUrl: msg.imageUrl,
      unsent: msg.unsent,
    })
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReply={handleReply}
        onUnsend={setToUnsend}
        onEdit={setToEdit}
        onReact={(msgId, emoji) => addReaction(msgId, emoji, profile?.uid ?? '')}
        onMarkSeen={(msgId) => profile && markSeen(msgId, profile.uid)}
        members={members}
        isDM={isDM}
      />

      <TypingIndicator roomId={roomId} />

      <Composer
        roomId={roomId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
        disabled={disabled || !profile}
      />

      <AnimatePresence>
        {toUnsend && (
          <UnsendConfirmModal
            onConfirm={handleUnsend}
            onCancel={() => setToUnsend(null)}
            onDeleteForMe={handleDeleteForMe}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toEdit && (
          <EditMessageModal
            message={toEdit}
            onSave={handleEdit}
            onClose={() => setToEdit(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
