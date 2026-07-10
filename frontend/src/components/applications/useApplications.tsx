'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  type Application,
  type Status,
  fetchApplications,
  isPipelineStatus,
  updateApplication,
} from '@/lib/applications'
import { HiredModal } from './HiredModal'
import { Snackbar, useSnackbar } from './useSnackbar'

type StageContext = 'pipeline' | 'applications' | 'heard'

// Shared data + mutations for the Pipeline and All applications screens: one
// fetch of the user's applications, inline stage changes with the prototype's
// snackbar semantics, and the Hired celebration. Returns an `overlay` node the
// screen renders once (snackbar + hired modal).
export function useApplications() {
  const [applications, setApplications] = useState<Application[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [hiredFor, setHiredFor] = useState<Application | null>(null)
  const { message: snack, showSnack } = useSnackbar()

  const reload = useCallback(async () => {
    try {
      setApplications(await fetchApplications())
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const changeStage = useCallback(
    async (application: Application, status: Status, context: StageContext) => {
      const wasPipeline = isPipelineStatus(application.status)
      const updated = await updateApplication(application.id, { status })
      await reload()
      if (status === 'Hired') {
        setHiredFor(updated)
        return
      }
      if (context === 'pipeline' && wasPipeline && status === 'Applied') {
        showSnack(
          {
            text: 'Moved back to applied. Kept in all applications.',
            linkText: 'all applications',
            href: '/applications',
          },
          5000,
        )
      } else if (context === 'pipeline' && wasPipeline && status === 'Closed') {
        showSnack(
          {
            text: 'Closed. Kept in all applications.',
            linkText: 'all applications',
            href: '/applications',
          },
          5000,
        )
      } else if (context === 'heard') {
        const inPipeline = isPipelineStatus(status)
        showSnack(
          inPipeline
            ? {
                text: 'Updated. You can see it in pipeline.',
                linkText: 'pipeline',
                href: '/pipeline',
              }
            : {
                text: 'Updated. Kept in all applications.',
                linkText: 'all applications',
                href: '/applications',
              },
          5000,
        )
      }
    },
    [reload, showSnack],
  )

  // Bulk-close the other in-progress applications after a hire.
  const closeOthers = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => updateApplication(id, { status: 'Closed' })))
      await reload()
    },
    [reload],
  )

  const otherPipeline = hiredFor
    ? (applications ?? []).filter(
        (item) => item.id !== hiredFor.id && isPipelineStatus(item.status),
      )
    : []

  const overlay = (
    <>
      {hiredFor ? (
        <HiredModal
          application={hiredFor}
          others={otherPipeline}
          onClose={() => setHiredFor(null)}
          onCloseOthers={(ids) => void closeOthers(ids)}
        />
      ) : null}
      <Snackbar message={snack} />
    </>
  )

  return { applications, failed, reload, changeStage, showSnack, overlay }
}
