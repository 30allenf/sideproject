'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { db, storage } from '../firebase/config'
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  getDocs, where, startAfter, DocumentSnapshot,
  writeBatch, getDoc, arrayUnion
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { Message, ReplyRef, LinkPreview } from '../types'
import { renderMarkdown, extractUrls } from '../utils'

const PAGE_SIZE = 50

export function useMessages(roomId: string | null) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [loading, setLoading]     = useState(true)
  const [hasMore, setHasMore]     = useState(false)
  const lastDocRef = useRef<DocumentSnapshot | null>(null)

  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    setMessages([])
    lastDocRef.current = null

    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    )

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Message))
        .reverse()
      setMessages(msgs)
      setHasMore(snap.docs.length === PAGE_SIZE)
      if (snap.docs.length > 0) lastDocRef.current = snap.docs[snap.docs.length - 1]
      setLoading(false)
    })

    return unsub
  }, [roomId])

  const loadMore = useCallback(async () => {
    if (!roomId || !lastDocRef.current || !hasMore) return
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDocRef.current),
      limit(PAGE_SIZE)
    )
    const snap = await getDocs(q)
    const older = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse()
    setMessages(prev => [...older, ...prev])
    setHasMore(snap.docs.length === PAGE_SIZE)
    if (snap.docs.length > 0) lastDocRef.current = snap.docs[snap.docs.length - 1]
  }, [roomId, hasMore])

  const sendMessage = useCallback(async (params: {
    text: string
    senderId: string
    senderName: string
    senderAvatar: string
    replyTo?: ReplyRef
    imageFile?: File
    attachFile?: File
  }) => {
    if (!roomId) return null

    let imageUrl: string | undefined
    let fileUrl: string | undefined
    let fileName: string | undefined
    let fileSize: number | undefined

    if (params.imageFile) {
      const sRef = storageRef(storage, `rooms/${roomId}/${Date.now()}_${params.imageFile.name}`)
      await uploadBytes(sRef, params.imageFile)
      imageUrl = await getDownloadURL(sRef)
    }

    if (params.attachFile) {
      const sRef = storageRef(storage, `rooms/${roomId}/files/${Date.now()}_${params.attachFile.name}`)
      await uploadBytes(sRef, params.attachFile)
      fileUrl = await getDownloadURL(sRef)
      fileName = params.attachFile.name
      fileSize = params.attachFile.size
    }

    // Auto-fetch link preview
    let linkPreview: LinkPreview | undefined
    const urls = extractUrls(params.text)
    if (urls.length > 0 && !imageUrl) {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(urls[0])}`)
        if (res.ok) linkPreview = await res.json()
      } catch {}
    }

    const msgData: Omit<Message, 'id'> = {
      roomId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      text: params.text,
      html: renderMarkdown(params.text),
      imageUrl,
      fileUrl,
      fileName,
      fileSize,
      linkPreview,
      replyTo: params.replyTo,
      reactions: {},
      seenBy: {},
      delivered: true,
      edited: false,
      unsent: false,
      createdAt: serverTimestamp() as never,
      type: imageUrl ? 'image' : fileUrl ? 'file' : 'text',
    }

    const docRef = await addDoc(collection(db, 'rooms', roomId, 'messages'), msgData)
    return docRef.id
  }, [roomId])

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!roomId) return
    await updateDoc(doc(db, 'rooms', roomId, 'messages', messageId), {
      text: newText,
      html: renderMarkdown(newText),
      edited: true,
      editedAt: serverTimestamp(),
    })
  }, [roomId])

  const unsendMessage = useCallback(async (messageId: string) => {
    if (!roomId) return
    await updateDoc(doc(db, 'rooms', roomId, 'messages', messageId), {
      unsent: true,
      text: '',
      html: '',
      imageUrl: null,
      fileUrl: null,
      linkPreview: null,
      reactions: {},
    })
  }, [roomId])

  const deleteForMe = useCallback(async (messageId: string, myUid: string) => {
    if (!roomId) return
    await updateDoc(doc(db, 'rooms', roomId, 'messages', messageId), {
      [`deletedFor.${myUid}`]: true,
    })
  }, [roomId])

  const addReaction = useCallback(async (messageId: string, emoji: string, uid: string) => {
    if (!roomId) return
    const msgRef = doc(db, 'rooms', roomId, 'messages', messageId)
    const snap = await getDoc(msgRef)
    if (!snap.exists()) return
    const reactions = (snap.data().reactions ?? {}) as Record<string, string[]>
    const current = reactions[emoji] ?? []
    if (current.includes(uid)) {
      // Remove
      const updated = current.filter(u => u !== uid)
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: updated.length ? updated : []
      })
    } else {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: [...current, uid]
      })
    }
  }, [roomId])

  const markSeen = useCallback(async (messageId: string, uid: string) => {
    if (!roomId) return
    await updateDoc(doc(db, 'rooms', roomId, 'messages', messageId), {
      [`seenBy.${uid}`]: Date.now(),
    })
  }, [roomId])

  return {
    messages, loading, hasMore, loadMore,
    sendMessage, editMessage, unsendMessage, deleteForMe,
    addReaction, markSeen,
  }
}
