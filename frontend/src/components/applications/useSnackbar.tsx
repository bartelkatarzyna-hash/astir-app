'use client'

import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'

export type SnackMessage = { text: string; linkText?: string; href?: string }

// Transient status toast. Mirrors showSnack in prototype/app.js, including the
// optional inline link (e.g. "…you can see it in pipeline").
export function useSnackbar() {
  const [message, setMessage] = useState<SnackMessage | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const showSnack = useCallback((next: SnackMessage, duration = 3500) => {
    window.clearTimeout(timer.current)
    setMessage(next)
    timer.current = window.setTimeout(() => setMessage(null), duration)
  }, [])

  return { message, showSnack }
}

export function Snackbar({ message }: { message: SnackMessage | null }) {
  let body: React.ReactNode = message?.text ?? ''
  if (message?.linkText && message.href && message.text.includes(message.linkText)) {
    const [before, after] = message.text.split(message.linkText)
    body = (
      <>
        {before}
        <Link href={message.href}>{message.linkText}</Link>
        {after}
      </>
    )
  }
  return (
    <div className="snackbar" hidden={!message} role="status" aria-live="polite">
      {body}
    </div>
  )
}
