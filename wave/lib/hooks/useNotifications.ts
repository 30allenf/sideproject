'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/config'
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  orderBy, limit, addDoc, serverTimestamp, writeBatch, getDocs
} from 'firebase/firestore'
import type { Notification } from '../types'

export function useNotifications(uid: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!uid) return
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const unsub = onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    })
    return unsub
  }, [uid])

  const markAllRead = useCallback(async () => {
    if (!uid) return
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      where('read', '==', false)
    )
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { read: true }))
    await batch.commit()
  }, [uid])

  const markRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true })
  }, [])

  return { notifications, unreadCount, markAllRead, markRead }
}

export async function createNotification(notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
  await addDoc(collection(db, 'notifications'), {
    ...notif,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return
  new Notification(title, { body, icon: icon ?? '/icon-192.png' })
}
