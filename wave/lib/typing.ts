'use client'

import { rtdb } from './firebase/config'
import { ref, set, onValue, onDisconnect, off, serverTimestamp } from 'firebase/database'

const TYPING_TTL = 3000 // ms — clear after 3s without new keystrokes

const typingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

function typingRef(roomId: string, uid: string) {
  return ref(rtdb, `typing/${roomId}/${uid}`)
}

export function setTyping(roomId: string, uid: string, displayName: string) {
  const tRef = typingRef(roomId, uid)
  set(tRef, { displayName, ts: Date.now() })
  onDisconnect(tRef).remove()

  // Clear existing timer
  const existing = typingTimers.get(`${roomId}:${uid}`)
  if (existing) clearTimeout(existing)

  // Auto-clear after TTL
  const timer = setTimeout(() => clearTyping(roomId, uid), TYPING_TTL)
  typingTimers.set(`${roomId}:${uid}`, timer)
}

export function clearTyping(roomId: string, uid: string) {
  const key = `${roomId}:${uid}`
  const timer = typingTimers.get(key)
  if (timer) { clearTimeout(timer); typingTimers.delete(key) }
  set(typingRef(roomId, uid), null)
}

export function subscribeTyping(
  roomId: string,
  myUid: string,
  callback: (typers: { uid: string; displayName: string }[]) => void
) {
  const rRef = ref(rtdb, `typing/${roomId}`)
  onValue(rRef, (snap) => {
    const val = snap.val() ?? {}
    const now = Date.now()
    const typers = Object.entries(val)
      .filter(([uid, data]) => {
        const d = data as { ts: number; displayName: string }
        return uid !== myUid && d && (now - d.ts) < TYPING_TTL * 1.5
      })
      .map(([uid, data]) => ({ uid, displayName: (data as { displayName: string }).displayName }))
    callback(typers)
  })
  return () => off(rRef)
}
