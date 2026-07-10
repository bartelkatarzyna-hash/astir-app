'use client'

import { type CSSProperties, useState } from 'react'
import {
  type ActivityId,
  type Goal,
  activity,
  activityOrder,
  goalInfoCopy,
  goalTarget,
  progressFor,
  strokeOffset,
} from '@/lib/goals'
import { Greeting } from './Greeting'
import { HeardBackModal } from './applications/HeardBackModal'
import { LogApplicationModal } from './applications/LogApplicationModal'
import { useApplications } from './applications/useApplications'
import { GoalsSetupModal } from './home/GoalsSetupModal'
import { useWeekGoals } from './home/useWeekGoals'
import { InfoIcon, MinusIcon, PencilIcon, PlusIcon } from './icons'

function gaugeStyle(deep: string, offset: number): CSSProperties {
  return { '--goal-color': `var(${deep})`, '--goal-offset': offset } as CSSProperties
}

function InfoGlyph({ id }: { id: ActivityId }) {
  const copy = goalInfoCopy[id]
  return copy ? (
    <span className="goal-info" data-info-tooltip={copy}>
      <InfoIcon />
    </span>
  ) : (
    <span className="goal-info disabled-info">
      <InfoIcon />
    </span>
  )
}

// Ghost placeholder tile, used before goals are set (and for the not-selected
// activities once some are).
function PlaceholderTile({ id }: { id: ActivityId }) {
  const info = activity[id]
  return (
    <article className="goal-tile ghost-tile" aria-disabled="true">
      <svg className="goal-gauge" viewBox="0 0 96 56" aria-hidden="true" style={gaugeStyle(info.deep, 126)}>
        <path className="gauge-track" pathLength={126} d="M8 48a40 40 0 0 1 80 0" />
        <path className="gauge-sweep" pathLength={126} d="M8 48a40 40 0 0 1 80 0" />
      </svg>
      <div className="goal-title-row">
        <div className="goal-title">{info.name}</div>
        <span className="goal-info disabled-info">
          <InfoIcon />
        </span>
      </div>
    </article>
  )
}

function GoalTile({
  goal,
  progress,
  active,
  onActivate,
  onStep,
}: {
  goal: Goal
  progress: number
  active: boolean
  onActivate: (id: ActivityId | '') => void
  onStep: (id: ActivityId, delta: number) => void
}) {
  const info = activity[goal.id]
  const target = goalTarget(goal)
  const met = progress >= target
  // The Applications count is driven by logged applications, so it has no
  // manual stepper.
  const canEdit = goal.id !== 'apply'
  const classes = [
    'goal-tile',
    goal.id,
    met ? 'met' : '',
    canEdit ? 'editable' : '',
    active ? 'control-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={classes}
      data-goal={goal.id}
      onPointerOut={(event) => {
        if (!active) return
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        onActivate('')
      }}
    >
      <svg
        className="goal-gauge"
        viewBox="0 0 96 56"
        aria-hidden="true"
        style={gaugeStyle(info.deep, strokeOffset(progress, target))}
      >
        <path className="gauge-track" pathLength={126} d="M8 48a40 40 0 0 1 80 0" />
        <path className="gauge-sweep" pathLength={126} d="M8 48a40 40 0 0 1 80 0" />
        <text className="gauge-ratio" x="48" y="41" textAnchor="middle">
          {progress}/{target}
        </text>
      </svg>
      <div className="goal-title-row">
        <div className="goal-title">{info.name}</div>
        <InfoGlyph id={goal.id} />
      </div>
      {canEdit ? (
        <div className="goal-stepper">
          <button
            className="goal-step minus"
            type="button"
            aria-label={`Remove ${info.name} entry`}
            onClick={() => {
              onActivate(goal.id)
              onStep(goal.id, -1)
            }}
          >
            <MinusIcon />
          </button>
          <button
            className="goal-step plus"
            type="button"
            aria-label={`Add ${info.name} entry`}
            onClick={() => {
              onActivate(goal.id)
              onStep(goal.id, 1)
            }}
          >
            <PlusIcon />
          </button>
        </div>
      ) : null}
    </article>
  )
}

export function HomeView() {
  const { applications, reload, changeStage, showSnack, overlay } = useApplications()
  const { week, setGoals, stepGoal } = useWeekGoals()

  const [logging, setLogging] = useState(false)
  const [heardOpen, setHeardOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeControl, setActiveControl] = useState<ActivityId | ''>('')

  const apps = applications ?? []
  const hasApplications = apps.length > 0

  const goals = week.goals
  const hasGoals = goals.length > 0
  const progressById = new Map<ActivityId, number>(
    goals.map((goal) => [goal.id, progressFor(goal.id, week, apps)]),
  )
  const allMet = hasGoals && goals.every((goal) => (progressById.get(goal.id) ?? 0) >= goalTarget(goal))
  const support = allMet
    ? 'You did it. Take a moment to savor it.'
    : "You're doing great, keep it up."

  const selectedById = new Map(goals.map((goal) => [goal.id, goal]))

  return (
    <section className="screen" data-screen="today">
      <div className="today-head">
        <Greeting />
      </div>

      <section className="home-card" aria-labelledby="applicationsLabel">
        <div className="label" id="applicationsLabel">
          Applications
        </div>
        <p className="home-card-copy">
          After you apply, record it here. Out of sight until the screening stage.
        </p>
        <div className="home-card-actions">
          <button className="btn ghost" type="button" onClick={() => setLogging(true)}>
            Log application
          </button>
        </div>
      </section>

      <section className="home-card" aria-labelledby="heardBackLabel" hidden={!hasApplications}>
        <div className="label" id="heardBackLabel">
          Screenings
        </div>
        <p className="home-card-copy">
          A company moved you forward. Bring the application into your pipeline.
        </p>
        <div className="home-card-actions">
          <button className="btn ghost" type="button" onClick={() => setHeardOpen(true)}>
            Move to pipeline
          </button>
        </div>
      </section>

      <section className="goals-card" aria-labelledby="goalsLabel">
        <div className="card-head">
          <div className="label" id="goalsLabel">
            This week&apos;s goals
          </div>
          <button
            className="round-icon add-application goal-edit-action"
            type="button"
            aria-label="Edit"
            data-tooltip="Edit"
            onClick={() => setEditing(true)}
          >
            <PencilIcon />
          </button>
        </div>
        <div>
          {hasGoals ? (
            <>
              <div className="goals-support">{support}</div>
              <div className="goal-grid">
                {activityOrder.map((id) => {
                  const goal = selectedById.get(id)
                  return goal ? (
                    <GoalTile
                      key={id}
                      goal={goal}
                      progress={progressById.get(id) ?? 0}
                      active={activeControl === id}
                      onActivate={setActiveControl}
                      onStep={stepGoal}
                    />
                  ) : (
                    <PlaceholderTile key={id} id={id} />
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="unwritten-line">Set up your goals for this week</div>
              <div className="goal-grid ghost-grid">
                {activityOrder.map((id) => (
                  <PlaceholderTile key={id} id={id} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {logging ? (
        <LogApplicationModal
          initial={{ status: 'Applied' }}
          onClose={() => setLogging(false)}
          onSaved={(application, isNew) => {
            void reload()
            if (isNew && application.status !== 'Hired') {
              showSnack({ text: 'Application logged.' })
            }
          }}
        />
      ) : null}

      {heardOpen ? (
        <HeardBackModal
          applications={apps}
          onClose={() => setHeardOpen(false)}
          onChoose={(application, status) => {
            setHeardOpen(false)
            void changeStage(application, status, 'heard')
          }}
        />
      ) : null}

      {editing ? (
        <GoalsSetupModal
          initial={goals}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            setGoals(next)
            setEditing(false)
          }}
        />
      ) : null}

      {overlay}
    </section>
  )
}
