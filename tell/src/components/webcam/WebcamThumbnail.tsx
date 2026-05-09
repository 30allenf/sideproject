'use client'

interface WebcamThumbnailProps {
  videoRef: React.RefObject<HTMLVideoElement | null> | null
  label: string
  noSignal?: boolean
}

export default function WebcamThumbnail({ videoRef, label, noSignal }: WebcamThumbnailProps) {
  return (
    <div
      className="relative overflow-hidden w-full"
      style={{
        height: 56,
        background: '#000',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Scanlines */}
      <div className="scanlines" />

      {noSignal || !videoRef ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: '#000' }}
        >
          <div className="readout text-center" style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            NO<br />FEED
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted playsInline
          style={{ transform: 'scaleX(-1)', filter: 'contrast(1.1) brightness(0.85)' }}
        />
      )}

      {/* Label */}
      <div
        className="absolute bottom-0 inset-x-0 readout text-center py-0.5"
        style={{ fontSize: 7, background: 'rgba(0,0,0,0.7)', color: 'var(--color-bone-dim)', letterSpacing: '0.22em' }}
      >
        {label}
      </div>
    </div>
  )
}
