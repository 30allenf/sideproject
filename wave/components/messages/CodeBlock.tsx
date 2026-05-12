'use client'

import { useEffect, useRef } from 'react'
import hljs from 'highlight.js'

export default function CodeBlock({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block as HTMLElement)
      })
    }
  }, [html])

  return (
    <div
      ref={ref}
      className="message-body code-block-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
