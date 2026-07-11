import Link from 'next/link'
import type { ReactNode } from 'react'
import { RailUser } from './RailUser'
import {
  BookmarkIcon,
  BriefcaseIcon,
  GlobeIcon,
  HomeIcon,
  PipelineIcon,
} from './icons'

type ActiveRoute =
  | 'home'
  | 'watchlist'
  | 'job-boards'
  | 'remote-job-board'
  | 'pipeline'
  | 'applications'

type AppShellProps = {
  active: ActiveRoute
  children: ReactNode
}

const navItems: Array<{ key: ActiveRoute; href: string; label: string; Icon: () => ReactNode }> = [
  { key: 'home', href: '/', label: 'Home', Icon: HomeIcon },
  { key: 'pipeline', href: '/pipeline', label: 'Pipeline', Icon: PipelineIcon },
  { key: 'watchlist', href: '/watchlist', label: 'Watchlist', Icon: BookmarkIcon },
  { key: 'job-boards', href: '/job-boards', label: 'Job board', Icon: BriefcaseIcon },
  { key: 'remote-job-board', href: '/remote-job-board', label: 'Remote job board', Icon: GlobeIcon },
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
              <span className="nav-icon" aria-hidden="true">
                <item.Icon />
              </span>
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
