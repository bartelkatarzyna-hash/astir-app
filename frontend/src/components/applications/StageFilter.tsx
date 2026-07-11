'use client'

import { useRef, useState } from 'react'
import { STATUS_OPTIONS, type Status } from '@/lib/applications'
import { useStageConfig, visibleStatuses } from '@/lib/stages'
import { CheckIcon, FilterIcon } from '../icons'
import { MenuScrim, useMenuModality } from './menuModality'

// Filter the applications table by one or more stages. An empty selection
// means "no filter" (every stage shows). Mirrors the KebabMenu popover
// pattern: click a row to toggle it, click outside or press Escape to close.
export function StageFilter({
  selected,
  onChange,
}: {
  selected: Set<Status>
  onChange: (next: Set<Status>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const active = selected.size > 0
  const { enabled } = useStageConfig()
  const stageOptions = visibleStatuses(enabled, STATUS_OPTIONS)
  useMenuModality(open, ref, setOpen)

  function toggle(status: Status) {
    const next = new Set(selected)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    onChange(next)
  }

  return (
    <span className={`menu-wrap ${open ? 'open' : ''}`.trim()} ref={ref}>
      <button
        className={`round-icon ${active ? 'on' : ''}`.trim()}
        type="button"
        aria-label="Filter by stage"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tooltip="Filter by stage"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <FilterIcon />
        {active ? <span className="round-icon-dot" aria-hidden="true" /> : null}
      </button>
      <span className="watch-menu stage-filter-menu" role="menu">
        <span className="stage-filter-head">
          <span>Filter by stage</span>
          {active ? (
            <button
              type="button"
              className="stage-filter-clear"
              onClick={() => onChange(new Set())}
            >
              Clear
            </button>
          ) : null}
        </span>
        {stageOptions.map((option) => {
          const checked = selected.has(option)
          return (
            <button
              key={option}
              type="button"
              role="menuitemcheckbox"
              aria-checked={checked}
              className={`stage-filter-option ${checked ? 'checked' : ''}`.trim()}
              onClick={() => toggle(option)}
            >
              <span className="stage-filter-check" aria-hidden="true">
                {checked ? <CheckIcon /> : null}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </span>
      {open ? <MenuScrim onClose={() => setOpen(false)} /> : null}
    </span>
  )
}
