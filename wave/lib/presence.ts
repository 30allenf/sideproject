'use client'

import { rtdb, auth } from './firebase/config'
import { db } from './firebase/config'
import {
  ref, onValue, set, onDisconnect,
  serverTimestamp as rtServerTimestamp, get,
  off
} from 'firebase/database'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import type { PresenceStatus } from './types'

// Timeouts (ms)
export const AWAY_TIMEOUT    = 2 * 60 * 1000    // 2 min idle → away
export const OFFLINE_TIMEOUT = 10 * 60 * 1000   // 10 min idle → offline

let activityTimer: ReturnType<typeof setTimeout> | null = null
let awayTimer:     ReturnType<typeof setTimeout> | null = null
let lastActivity   = Date.now()
let currentStatus: PresenceStatus = 'offline'

function getPresenceRef(uid: string) {
  return ref(rtdb, `presence/${uid}`)
}

export function initPresence(uid: string, invisible: boolean) {
  if (invisible) {
    // Write offline to RTDB so others see offline, but app still works
    set(getPresenceRef(uid), { status: 'offline', lastSeen: rtServerTimestamp() })
    return () => {}
  }

  const presRef = getPresenceRef(uid)

  // Set online immediately
  setStatus(uid, 'online', invisible)

  // On disconnect: set offline
  onDisconnect(presRef).set({ status: 'offline', lastSeen: rtServerTimestamp() })

  // Activity listeners
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
  const onActivity = () => handleActivity(uid, invisible)
  events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

  // Visibility change
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      handleActivity(uid, invisible)
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  // Watch RTDB connection
  const connRef = ref(rtdb, '.info/connected')
  onValue(connRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(presRef).set({ status: 'offline', lastSeen: rtServerTimestamp() })
      if (!invisible) setStatus(uid, 'online', false)
    }
  })

  return () => {
    events.forEach(e => window.removeEventListener(e, onActivity))
    document.removeEventListener('visibilitychange', onVisibility)
    off(connRef)
    if (activityTimer) clearTimeout(activityTimer)
    if (awayTimer) clearTimeout(awayTimer)
    setStatus(uid, 'offline', false)
  }
}

function handleActivity(uid: string, invisible: boolean) {
  if (invisible) return
  lastActivity = Date.now()

  if (currentStatus !== 'online') {
    setStatus(uid, 'online', false)
  }

  if (awayTimer) clearTimeout(awayTimer)
  awayTimer = setTimeout(() => {
    if (!invisible) setStatus(uid, 'away', false)
  }, AWAY_TIMEOUT)
}

async function setStatus(uid: string, status: PresenceStatus, invisible: boolean) {
  if (invisible && status !== 'offline') return
  currentStatus = status

  const presRef = getPresenceRef(uid)
  const data: { status: string; lastSeen?: ReturnType<typeof rtServerTimestamp> } = { status }
  if (status === 'offline' || status === 'away') {
    data.lastSeen = rtServerTimestamp()
  }
  await set(presRef, data)

  // Mirror to Firestore for profile reads
  try {
    await updateDoc(doc(db, 'users', uid), {
      presence: status,
      lastSeen: status !== 'online' ? serverTimestamp() : null,
    })
  } catch { /* user doc may not exist yet */ }
}

export function subscribePresence(
  uid: string,
  callback: (status: PresenceStatus, lastSeen: number | null) => void
) {
  const presRef = getPresenceRef(uid)
  const unsub = onValue(presRef, (snap) => {
    const val = snap.val()
    if (!val) {
      callback('offline', null)
      return
    }
    callback(val.status as PresenceStatus, val.lastSeen ?? null)
  })
  return () => off(presRef, 'value', unsub as never)
}

export function formatLastSeen(lastSeen: number | null): string {
  if (!lastSeen) return 'a while ago'
  const diff = Date.now() - lastSeen
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) {
    const d = new Date(lastSeen)
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return new Date(lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
