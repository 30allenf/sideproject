import { format, formatDistanceToNow, isToday, isYesterday, differenceInDays } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

export function formatTimestamp(ts: Timestamp | Date | number | null | undefined): string {
  if (!ts) return ''
  const date = ts instanceof Date ? ts : typeof ts === 'number' ? new Date(ts) : ts.toDate()
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE h:mm a')
  return format(date, 'MMM d, yyyy')
}

export function formatRelative(ts: Timestamp | Date | number | null | undefined): string {
  if (!ts) return ''
  const date = ts instanceof Date ? ts : typeof ts === 'number' ? new Date(ts) : ts.toDate()
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatDateHeader(ts: Timestamp | Date | number): string {
  const date = ts instanceof Date ? ts : typeof ts === 'number' ? new Date(ts) : (ts as Timestamp).toDate()
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE')
  return format(date, 'MMMM d, yyyy')
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// Render simple markdown: bold, italic, code
export function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\n/g, '<br>')
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) ?? []
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
