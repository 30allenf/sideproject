'use client'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
}

const COLORS = [
  '#c4622d', '#6b8f6b', '#e8a030', '#4a7fa5',
  '#9b59b6', '#27ae60', '#e67e22', '#c0392b',
]

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Avatar({ src, name, size = 36, className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`avatar ${className}`}
        style={{ width: size, height: size, borderRadius: '50%' }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <div
      className={`avatar flex items-center justify-center font-display font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: colorForName(name),
        color: 'white',
        fontSize: size * 0.38,
        borderRadius: '50%',
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  )
}
