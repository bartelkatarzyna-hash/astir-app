'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Track how many menus are open across the app so the body-level modality
// classes reflect "any menu open", even if instances open/close around each
// other. surface-open suppresses tooltips (see Tooltips.tsx); menu-open lets
// the stylesheet drop hover states on the rest of the app.
let openMenuCount = 0
function setMenuModality(open: boolean) {
  openMenuCount = Math.max(0, openMenuCount + (open ? 1 : -1))
  const anyOpen = openMenuCount > 0
  document.body.classList.toggle('surface-open', anyOpen)
  document.body.classList.toggle('menu-open', anyOpen)
}

// Shared "menu is modal" behavior for the popover pattern (KebabMenu,
// StageFilter). While `open`, clicking outside `ref` or pressing Escape closes
// it, and the body gains surface-open/menu-open so the rest of the app can't be
// hovered or clicked and tooltips are suppressed. `setOpen` must be a stable
// setter (e.g. from useState) so the effect only re-runs when `open` flips.
export function useMenuModality(
  open: boolean,
  ref: React.RefObject<HTMLElement | null>,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (!open) return
    setMenuModality(true)
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
      setMenuModality(false)
    }
  }, [open, ref, setOpen])
}

// Full-viewport transparent layer rendered while a menu is open. It sits below
// the open .menu-wrap (z-index 30) but above the rest of the app (z-index 25),
// so the trigger and menu items stay live while everything beneath is inert.
// Clicking it closes the menu.
export function MenuScrim({ onClose }: { onClose: () => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="interaction-scrim" aria-hidden="true" onClick={onClose} />,
    document.body,
  )
}
