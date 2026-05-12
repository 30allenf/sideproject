'use client'

import { useState } from 'react'
import type { Message } from '@/lib/types'

export default function EditMessageModal({ message, onSave, onClose }: {
  message: Message
  onSave: (text: string) => Promise<void>
  onClose: () => void
}) {
  const [text, setText] = useState(message.text)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    await onSave(text.trim())
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card p-5 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-lg mb-3" style={{ color: 'var(--color-espresso)' }}>
          Edit message
        </h3>
        <textarea
          className="composer-input w-full p-2 rounded-lg border mb-3"
          style={{ background: 'var(--color-paper-dim)', border: '1px solid var(--color-espresso-15)', minHeight: 80, fontFamily: 'var(--font-body)' }}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
