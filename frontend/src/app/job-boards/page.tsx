import { AppShell } from '@/components/AppShell'
import { JobBoardsView } from '@/components/JobBoardsView'

export default function JobBoardsPage() {
  return (
    <AppShell active="job-boards">
      <JobBoardsView />
    </AppShell>
  )
}
