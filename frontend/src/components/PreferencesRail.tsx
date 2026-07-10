'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/preferences', label: 'General' },
  { href: '/preferences/watchlist', label: 'Watchlist Preferences' },
]

export function PreferencesRail() {
  const pathname = usePathname()

  return (
    <aside className="rail" aria-label="Preferences">
      <Link className="back-to-app" href="/">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 7l-5 5 5 5" />
        </svg>
        Back to App
      </Link>
      <nav className="nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={pathname === item.href ? 'active' : undefined}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
