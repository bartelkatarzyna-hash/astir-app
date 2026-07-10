'use client'

import { useEffect, useState } from 'react'
import { firstName, useUser } from './UserProvider'

// Same store the prototype uses; hasVisited rides along inside it so the
// greeting survives the eventual localStorage-to-database migration intact.
const storageKey = 'astir.v1'

function readHasVisited(): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return false
    }
    const saved = JSON.parse(raw) as { hasVisited?: unknown }
    return Boolean(saved.hasVisited)
  } catch {
    return false
  }
}

function markVisited() {
  try {
    const raw = window.localStorage.getItem(storageKey)
    const saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    window.localStorage.setItem(storageKey, JSON.stringify({ ...saved, hasVisited: true }))
  } catch {
    // localStorage unavailable; greet as a first visit again next time.
  }
}

export function Greeting() {
  const user = useUser()
  const [hasVisited, setHasVisited] = useState(false)

  useEffect(() => {
    setHasVisited(readHasVisited())
    markVisited()
  }, [])

  return (
    <h1>
      {hasVisited ? 'Welcome back' : 'Welcome'}, {firstName(user)}
    </h1>
  )
}
