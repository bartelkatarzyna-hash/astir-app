import type { ReactNode } from 'react'
import { PreferencesRail } from '@/components/PreferencesRail'

export default function PreferencesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <PreferencesRail />
      <main className="main">{children}</main>
    </div>
  )
}
