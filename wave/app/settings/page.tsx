'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import AppShell from '@/components/layout/AppShell'
import Avatar from '@/components/ui/Avatar'
import { storage, db } from '@/lib/firebase/config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { requestPushPermission } from '@/lib/hooks/useNotifications'

export default function SettingsPage() {
  const { profile, updateProfile } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [statusMessage, setStatusMessage] = useState(profile?.statusMessage ?? '')
  const [invisible, setInvisible] = useState(profile?.invisible ?? false)
  const [notifs, setNotifs] = useState(profile?.notificationsEnabled ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ displayName, statusMessage, invisible, notificationsEnabled: notifs })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setAvatarUploading(true)
    try {
      const sRef = ref(storage, `avatars/${profile.uid}`)
      await uploadBytes(sRef, file)
      const url = await getDownloadURL(sRef)
      await updateProfile({ avatarUrl: url })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleRequestNotifs() {
    const granted = await requestPushPermission()
    if (granted) {
      setNotifs(true)
      await updateProfile({ notificationsEnabled: true })
    } else {
      alert('Notification permission denied. Enable it in your browser settings.')
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
        <div
          className="px-6 py-4 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--color-espresso-15)' }}
        >
          <button className="action-btn text-base" onClick={() => router.back()}>←</button>
          <h1 className="font-display font-semibold text-xl" style={{ color: 'var(--color-espresso)' }}>Settings</h1>
        </div>

        <div className="max-w-lg mx-auto w-full px-6 py-6 space-y-8">
          {/* Avatar */}
          <section>
            <h2 className="font-display font-semibold text-base mb-4" style={{ color: 'var(--color-espresso)' }}>Profile picture</h2>
            <div className="flex items-center gap-4">
              {avatarUploading ? (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--color-paper-dim)' }}>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-espresso-30)' }}>…</span>
                </div>
              ) : (
                <Avatar src={profile?.avatarUrl} name={profile?.displayName ?? ''} size={64} />
              )}
              <div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'Uploading…' : 'Change photo'}
                </button>
                <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-espresso-30)' }}>
                  JPG, PNG, GIF — max 5 MB
                </p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </section>

          {/* Display name */}
          <section>
            <h2 className="font-display font-semibold text-base mb-3" style={{ color: 'var(--color-espresso)' }}>Display name</h2>
            <input
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--color-paper-dim)', border: '1.5px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)' }}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
            />
          </section>

          {/* Status */}
          <section>
            <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--color-espresso)' }}>Status message</h2>
            <p className="text-sm mb-2" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
              Shown on your profile card. Max 60 characters.
            </p>
            <div className="relative">
              <input
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none pr-12"
                style={{ background: 'var(--color-paper-dim)', border: '1.5px solid var(--color-espresso-15)', fontFamily: 'var(--font-body)', color: 'var(--color-espresso)' }}
                value={statusMessage}
                onChange={e => setStatusMessage(e.target.value.slice(0, 60))}
                placeholder="🎧 in the zone"
                maxLength={60}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px]"
                style={{ color: statusMessage.length > 50 ? 'var(--color-terracotta)' : 'var(--color-espresso-30)' }}
              >
                {60 - statusMessage.length}
              </span>
            </div>
          </section>

          {/* Presence */}
          <section>
            <h2 className="font-display font-semibold text-base mb-3" style={{ color: 'var(--color-espresso)' }}>Presence</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: invisible ? 'var(--color-terracotta)' : 'var(--color-espresso-15)' }}
                onClick={() => setInvisible(v => !v)}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: invisible ? 'calc(100% - 22px)' : '2px' }}
                />
              </button>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)', fontFamily: 'var(--font-body)' }}>
                  Invisible mode
                </p>
                <p className="text-xs" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
                  Appear offline to everyone, but you can still use Wave normally.
                </p>
              </div>
            </label>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="font-display font-semibold text-base mb-3" style={{ color: 'var(--color-espresso)' }}>Notifications</h2>
            {(typeof Notification === 'undefined' || Notification.permission !== 'granted') ? (
              <div
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: 'var(--color-amber-soft)', border: '1px solid var(--color-amber)' }}
              >
                <span className="text-lg">🔔</span>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-espresso)', fontFamily: 'var(--font-body)' }}>
                    Browser notifications are disabled
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={handleRequestNotifs}>
                    Enable notifications
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
                  style={{ background: notifs ? 'var(--color-terracotta)' : 'var(--color-espresso-15)' }}
                  onClick={() => setNotifs(v => !v)}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: notifs ? 'calc(100% - 22px)' : '2px' }}
                  />
                </button>
                <p className="text-sm" style={{ color: 'var(--color-espresso)', fontFamily: 'var(--font-body)' }}>
                  Push notifications for DMs and mentions
                </p>
              </label>
            )}
          </section>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span className="text-sm font-mono" style={{ color: 'var(--color-sage)' }}>✓ Saved</span>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
