'use client'

import { useCallback, useEffect, useState } from 'react'
import { todayKey } from '@/lib/applications'
import {
  type ActivityId,
  type Goal,
  type Week,
  applyGoalDelta,
  emptyWeek,
  readWeek,
  weekKeyFor,
  writeWeek,
} from '@/lib/goals'

// Owns this week's goal state. Starts empty on the server and first client
// render (so hydration matches, same as the Greeting), then hydrates from
// localStorage and persists every mutation back to the shared store.
export function useWeekGoals() {
  const [week, setWeek] = useState<Week>(emptyWeek)
  const [key, setKey] = useState('')

  useEffect(() => {
    const currentKey = weekKeyFor()
    setKey(currentKey)
    setWeek(readWeek(currentKey))
  }, [])

  const mutate = useCallback(
    (next: (current: Week) => Week) => {
      setWeek((current) => {
        const updated = next(current)
        if (key) writeWeek(key, updated)
        return updated
      })
    },
    [key],
  )

  const setGoals = useCallback(
    (goals: Goal[]) => {
      mutate((current) => ({ ...current, goals }))
    },
    [mutate],
  )

  const stepGoal = useCallback(
    (id: ActivityId, delta: number) => {
      mutate((current) => applyGoalDelta(current, id, delta, todayKey()))
    },
    [mutate],
  )

  return { week, setGoals, stepGoal }
}
