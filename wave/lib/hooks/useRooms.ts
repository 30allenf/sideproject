'use client'

import { useState, useEffect, useCallback } from 'react'
import { db, storage } from '../firebase/config'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, arrayUnion, arrayRemove, getDocs,
  orderBy, getDoc, deleteDoc
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { Room } from '../types'

export function useMyRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    const q = query(collection(db, 'rooms'), where('members', 'array-contains', uid), orderBy('updatedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { rooms, loading }
}

export function usePublicRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('isPublic', '==', true), orderBy('updatedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)))
      setLoading(false)
    })
    return unsub
  }, [])

  return { rooms, loading }
}

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null)

  useEffect(() => {
    if (!roomId) return
    const unsub = onSnapshot(doc(db, 'rooms', roomId), snap => {
      if (snap.exists()) setRoom({ id: snap.id, ...snap.data() } as Room)
    })
    return unsub
  }, [roomId])

  return room
}

export function useRoomActions() {
  const createRoom = useCallback(async (params: {
    name: string
    description: string
    isPublic: boolean
    createdBy: string
    iconEmoji?: string
  }): Promise<string> => {
    const docRef = await addDoc(collection(db, 'rooms'), {
      ...params,
      members: [params.createdBy],
      admins: [params.createdBy],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }, [])

  const joinRoom = useCallback(async (roomId: string, uid: string) => {
    await updateDoc(doc(db, 'rooms', roomId), {
      members: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    })
  }, [])

  const leaveRoom = useCallback(async (roomId: string, uid: string) => {
    await updateDoc(doc(db, 'rooms', roomId), {
      members: arrayRemove(uid),
      updatedAt: serverTimestamp(),
    })
  }, [])

  const updateRoom = useCallback(async (roomId: string, updates: Partial<Room>) => {
    await updateDoc(doc(db, 'rooms', roomId), { ...updates, updatedAt: serverTimestamp() })
  }, [])

  const inviteMember = useCallback(async (roomId: string, uid: string) => {
    await updateDoc(doc(db, 'rooms', roomId), {
      members: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    })
  }, [])

  const removeMember = useCallback(async (roomId: string, uid: string) => {
    await updateDoc(doc(db, 'rooms', roomId), {
      members: arrayRemove(uid),
      admins: arrayRemove(uid),
      updatedAt: serverTimestamp(),
    })
  }, [])

  const addCustomEmoji = useCallback(async (roomId: string, name: string, file: File) => {
    const sRef = storageRef(storage, `rooms/${roomId}/emoji/${name}`)
    await uploadBytes(sRef, file)
    const url = await getDownloadURL(sRef)
    await updateDoc(doc(db, 'rooms', roomId), { [`customEmoji.${name}`]: url })
  }, [])

  return { createRoom, joinRoom, leaveRoom, updateRoom, inviteMember, removeMember, addCustomEmoji }
}

export async function searchUserByUsername(username: string) {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}
