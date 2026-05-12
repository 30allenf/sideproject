'use client'

import { AnimatePresence } from 'framer-motion'
import Modal from '@/components/ui/Modal'

interface Props {
  onConfirm: () => void
  onCancel: () => void
  onDeleteForMe: () => void
}

export default function UnsendConfirmModal({ onConfirm, onCancel, onDeleteForMe }: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="card p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--color-espresso)' }}>
          Unsend message?
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--color-espresso-60)', fontFamily: 'var(--font-body)' }}>
          This will remove the message for everyone. It cannot be undone.
        </p>
        <div className="flex flex-col gap-2">
          <button className="btn btn-danger w-full" onClick={onConfirm}>
            🗑 Unsend for everyone
          </button>
          <button className="btn btn-secondary w-full" onClick={onDeleteForMe}>
            Hide for me only
          </button>
          <button className="btn btn-ghost w-full" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
