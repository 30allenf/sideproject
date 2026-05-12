'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
  title?: string
}

export default function Modal({ onClose, children, maxWidth = 440, title }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="card w-full"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-center justify-between px-5 pt-5 pb-3 border-b"
            style={{ borderColor: 'var(--color-espresso-15)' }}
          >
            <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--color-espresso)' }}>
              {title}
            </h2>
            <button className="action-btn text-lg" onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className={title ? 'p-5' : ''}>{children}</div>
      </motion.div>
    </div>
  )
}
