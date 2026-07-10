'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { firstName, useUser } from './UserProvider'

export function RailUser() {
  const user = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }

  return (
    <div className={`user-menu-wrap${open ? ' open' : ''}`} ref={wrapRef}>
      <div className="user-menu" role="menu" aria-label="Account">
        <Link href="/preferences" role="menuitem" onClick={() => setOpen(false)}>
          Preferences
        </Link>
        <button type="button" role="menuitem" onClick={signOut}>
          Sign out
        </button>
      </div>
      <button
        className="user"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {user.avatarUrl ? (
          <img className="av" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="av" aria-hidden="true" />
        )}
        <span className="user-name">{firstName(user)}</span>
      </button>
    </div>
  )
}
