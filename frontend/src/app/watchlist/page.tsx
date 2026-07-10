import { AppShell } from '@/components/AppShell'
import { WatchlistView } from '@/components/WatchlistView'

export default function WatchlistPage() {
  return (
    <AppShell active="watchlist">
      <WatchlistView />
    </AppShell>
  )
}
