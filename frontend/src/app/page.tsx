import { AppShell } from '@/components/AppShell'
import { HomeView } from '@/components/HomeView'

export default function HomePage() {
  return (
    <AppShell active="home">
      <HomeView />
    </AppShell>
  )
}
