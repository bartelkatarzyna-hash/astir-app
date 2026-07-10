'use client'

import { useEffect, useRef, useState } from 'react'
import { KebabIcon } from '../icons'

// Kebab (⋮) button with a popover menu. The stylesheet only reveals
// .watch-menu when its .menu-wrap has the `open` class, so the open state has
// to be wired in JS (this was missing on the watchlist). Clicking a menu item
// or anywhere outside closes it.
export function KebabMenu({
  menuClassName = '',
  children,
}: {
  menuClassName?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className={`menu-wrap ${open ? 'open' : ''}`.trim()} ref={ref}>
      <button
        className="round-icon kebab"
        type="button"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tooltip="More"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <KebabIcon />
      </button>
      <span
        className={`watch-menu ${menuClassName}`.trim()}
        role="menu"
        onClick={() => setOpen(false)}
      >
        {children}
      </span>
    </span>
  )
}
