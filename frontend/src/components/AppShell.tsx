import Link from 'next/link'
import type { ReactNode } from 'react'
import { RailUser } from './RailUser'

type ActiveRoute = 'home' | 'watchlist' | 'job-boards' | 'pipeline' | 'applications'

type AppShellProps = {
  active: ActiveRoute
  children: ReactNode
}

const navItems: Array<{ key: ActiveRoute; href: string; label: string }> = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'watchlist', href: '/watchlist', label: 'Watchlist' },
  { key: 'job-boards', href: '/job-boards', label: 'Job Boards' },
  { key: 'pipeline', href: '/pipeline', label: 'Pipeline' },
]

export function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="app">
      <aside className="rail" aria-label="Primary">
        <div className="brand">
          <span className="mini" aria-hidden="true">
            <span className="halo" />
            <span className="core" />
          </span>
          <span className="name">Astir</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.key}
              className={active === item.key ? 'active' : undefined}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <RailUser />
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
