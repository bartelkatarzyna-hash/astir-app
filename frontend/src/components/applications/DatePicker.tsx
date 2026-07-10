'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MONTH_NAMES, formatDisplayDate, parseDateKey, toDateKey } from '@/lib/applications'
import { CalendarIcon } from '../icons'

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sameDate(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

// 6 weeks of cells covering the visible month, Monday-first (like the prototype).
function calendarCells(monthDate: Date, selectedKey: string, today: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = addDays(first, startOffset * -1)
  const cells = []
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index)
    cells.push({
      key: toDateKey(date),
      day: date.getDate(),
      muted: date.getMonth() !== monthDate.getMonth(),
      selected: toDateKey(date) === selectedKey,
      today: sameDate(date, today),
    })
  }
  return cells
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const date = parseDateKey(value)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const shellRef = useRef<HTMLDivElement>(null)
  const today = useMemo(() => new Date(), [])
  const cells = calendarCells(month, value, today)

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function shiftMonth(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div className="date-shell" ref={shellRef}>
      <button
        className={`date-trigger ${open ? 'open' : ''}`.trim()}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{formatDisplayDate(value)}</span>
        <span className="date-icon" aria-hidden="true">
          <CalendarIcon />
        </span>
      </button>
      <div
        className={`calendar-popover ${open ? 'open' : ''}`.trim()}
        role="dialog"
        aria-label="Choose applied date"
      >
        <div className="calendar-head">
          <button
            className="calendar-nav"
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            ‹
          </button>
          <div className="calendar-title">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </div>
          <button
            className="calendar-nav"
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            ›
          </button>
        </div>
        <div className="weekdays" aria-hidden="true">
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
          <span>S</span>
        </div>
        <div className="calendar-grid">
          {cells.map((cell) => (
            <button
              key={cell.key}
              className={`day-cell${cell.muted ? ' muted-day' : ''}${cell.selected ? ' selected' : ''}${cell.today ? ' today' : ''}`}
              type="button"
              onClick={() => {
                onChange(cell.key)
                setOpen(false)
              }}
            >
              {cell.day}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
