import { AppShell } from '@/components/AppShell'
import { ApplicationsView } from '@/components/ApplicationsView'

export default function ApplicationsPage() {
  return (
    <AppShell active="applications">
      <ApplicationsView />
    </AppShell>
  )
}
