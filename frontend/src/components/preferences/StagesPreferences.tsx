'use client'

import { CONFIGURABLE_STAGES, useStageConfig } from '@/lib/stages'

// Lets the user choose which interview stages their pipeline tracks. Toggling a
// stage off hides it from the Pipeline screen and the applications stage filter.
// Stages are never renamed here (see lib/stages.ts for why).
export function StagesPreferences() {
  const { enabled, toggle, reset, isDefault } = useStageConfig()

  return (
    <section className="screen">
      <div className="page-head">
        <h1>Stages</h1>
      </div>
      <div className="prefs-card">
        <div className="prefs-field">
          <div className="prefs-field-label">Pipeline stages</div>
          <div className="prefs-field-hint">
            Choose the interview stages your pipeline uses. Switch off any you don&apos;t need —
            they&apos;ll drop out of the Pipeline screen and the stage filter. Applied and Closed
            always stay.
          </div>
          <ul className="stage-list">
            {CONFIGURABLE_STAGES.map((stage) => {
              const on = enabled.has(stage)
              return (
                <li className="stage-row" key={stage}>
                  <span className="stage-row-name">{stage}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${on ? 'Disable' : 'Enable'} ${stage}`}
                    className={`stage-switch${on ? ' on' : ''}`}
                    onClick={() => toggle(stage)}
                  >
                    <span className="stage-switch-knob" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="prefs-actions">
          <button className="btn ghost" type="button" disabled={isDefault} onClick={reset}>
            Reset to default
          </button>
        </div>
      </div>
    </section>
  )
}
