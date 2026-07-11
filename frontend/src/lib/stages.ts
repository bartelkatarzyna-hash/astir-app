'use client'

// User-configurable pipeline stages. The canonical stage labels live in
// `applications.ts` (STATUS_OPTIONS) and are baked into stored application
// records, so we never rename or reorder them here — renaming would orphan
// existing rows whose `status` still holds the old label. What a user *can*
// safely control is which of the interview stages their pipeline uses; a
// disabled stage drops out of the pipeline view and the stage filter.
//
// The selection is persisted per-browser in localStorage. Moving it server-side
// (so it follows the account across devices) is a follow-up.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { PIPELINE_STAGES, type Status, normalizeStatus } from './applications'

// The stages a user may switch on/off. "Applied" and "Closed" sit outside the
// pipeline and are always present, so they are not configurable here.
export const CONFIGURABLE_STAGES: Status[] = [...PIPELINE_STAGES]

const STORAGE_KEY = 'astir.pipelineStages'

function readEnabled(): Status[] {
  if (typeof window === 'undefined') return [...CONFIGURABLE_STAGES]
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...CONFIGURABLE_STAGES]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...CONFIGURABLE_STAGES]
    const allowed = parsed.filter((value): value is Status =>
      CONFIGURABLE_STAGES.includes(value as Status),
    )
    return allowed
  } catch {
    return [...CONFIGURABLE_STAGES]
  }
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

// Cache the parsed snapshot so useSyncExternalStore gets a stable reference
// between renders (it compares by identity) and only changes when we write.
let snapshot: Status[] = readEnabled()

function getSnapshot(): Status[] {
  return snapshot
}

function getServerSnapshot(): Status[] {
  return CONFIGURABLE_STAGES
}

function persist(next: Status[]) {
  // Keep canonical order regardless of toggle sequence.
  snapshot = CONFIGURABLE_STAGES.filter((stage) => next.includes(stage))
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore write failures (private mode, quota); in-memory snapshot still applies.
  }
  emit()
}

export type StageConfig = {
  enabled: Set<Status>
  isEnabled: (status: string) => boolean
  toggle: (stage: Status) => void
  reset: () => void
  isDefault: boolean
}

export function useStageConfig(): StageConfig {
  const enabledList = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Keep the module snapshot in sync if another provider/tab wrote before this
  // component mounted (the initial module read can be stale after hydration).
  useEffect(() => {
    const fresh = readEnabled()
    if (fresh.length !== snapshot.length || fresh.some((s, i) => s !== snapshot[i])) {
      snapshot = fresh
      emit()
    }
  }, [])

  const enabled = new Set(enabledList)

  const toggle = useCallback((stage: Status) => {
    const current = new Set(snapshot)
    if (current.has(stage)) current.delete(stage)
    else current.add(stage)
    persist([...current])
  }, [])

  const reset = useCallback(() => {
    persist([...CONFIGURABLE_STAGES])
  }, [])

  return {
    enabled,
    isEnabled: (status: string) => enabled.has(normalizeStatus(status)),
    toggle,
    reset,
    isDefault:
      enabledList.length === CONFIGURABLE_STAGES.length &&
      CONFIGURABLE_STAGES.every((stage) => enabled.has(stage)),
  }
}

// Which stage labels should appear in filters/selectors given the config:
// non-pipeline stages (Applied, Closed) always show; pipeline stages only if
// the user left them enabled.
export function visibleStatuses(enabled: Set<Status>, all: readonly Status[]): Status[] {
  return all.filter(
    (status) => !CONFIGURABLE_STAGES.includes(status) || enabled.has(status),
  )
}
