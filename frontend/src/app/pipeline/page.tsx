import { AppShell } from '@/components/AppShell'
import { PipelineView } from '@/components/PipelineView'

export default function PipelinePage() {
  return (
    <AppShell active="pipeline">
      <PipelineView />
    </AppShell>
  )
}
