'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Application,
  type Status,
  deleteApplication,
  normalizeMode,
  plainDate,
  stageRank,
} from '@/lib/applications'
import { KebabMenu } from './applications/KebabMenu'
import { LogApplicationModal, type LogApplicationInitial } from './applications/LogApplicationModal'
import { StageSelect } from './applications/StageSelect'
import { useApplications } from './applications/useApplications'
import { ChevronDownIcon, OpenIcon, SearchIcon } from './icons'

type ColumnKey = 'company' | 'role' | 'stage' | 'location' | 'type' | 'posted' | 'applied' | 'menu'
type Column = { key: ColumnKey; label: string; sortable?: boolean }
type SortKey = 'company' | 'role' | 'stage'
type Sort = { key: SortKey; dir: 'asc' | 'desc' }

const COLUMNS: Column[] = [
  { key: 'company', label: 'Company', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'location', label: 'Location' },
  { key: 'type', label: 'Type' },
  { key: 'posted', label: 'Posted' },
  { key: 'applied', label: 'Applied' },
  { key: 'menu', label: '' },
]

const WIDTHS_KEY = 'astir.applicationTableWidths'
const menuColumnStyle = { width: 'calc(var(--menu-trigger) + var(--space-4))' } as const

function tableValue(value: string | null | undefined) {
  return value ? value : '—'
}

function countText(count: number) {
  return count === 1 ? '1 application' : `${count} applications`
}

export function ApplicationsView() {
  const { applications, changeStage, reload, overlay } = useApplications()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'company', dir: 'asc' })
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<LogApplicationInitial | null>(null)
  const [deleting, setDeleting] = useState<Application | null>(null)
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WIDTHS_KEY)
      if (saved) setWidths(JSON.parse(saved) as Record<string, number>)
    } catch {
      // ignore malformed cache
    }
  }, [])

  const all = applications ?? []
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all
      .filter((application) =>
        needle
          ? `${application.company} ${application.role}`.toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => {
        let result = 0
        if (sort.key === 'stage') result = stageRank(a.status) - stageRank(b.status)
        else if (sort.key === 'role') result = a.role.localeCompare(b.role)
        else result = a.company.localeCompare(b.company)
        if (result === 0) {
          result = a.company.localeCompare(b.company) || a.role.localeCompare(b.role)
        }
        return sort.dir === 'desc' ? -result : result
      })
  }, [all, query, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  function colWidth(key: ColumnKey): React.CSSProperties | undefined {
    if (key === 'menu') return menuColumnStyle
    return widths[key] ? { width: `${widths[key]}px` } : undefined
  }

  function startResize(key: ColumnKey, event: React.PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    const header = (event.target as HTMLElement).closest('th')
    if (!header) return
    resizing.current = { key, startX: event.clientX, startWidth: header.getBoundingClientRect().width }
    document.body.classList.add('resizing-table')

    const minWidth =
      Number(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--table-column-min')
          .replace('px', ''),
      ) || 0

    function onMove(moveEvent: PointerEvent) {
      const state = resizing.current
      if (!state) return
      const next = Math.max(minWidth, state.startWidth + moveEvent.clientX - state.startX)
      setWidths((current) => ({ ...current, [state.key]: Math.round(next) }))
    }
    function onUp() {
      resizing.current = null
      document.body.classList.remove('resizing-table')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setWidths((current) => {
        try {
          window.localStorage.setItem(WIDTHS_KEY, JSON.stringify(current))
        } catch {
          // ignore quota / disabled storage
        }
        return current
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function openEdit(application: Application) {
    setEditing({
      id: application.id,
      listingId: application.listingId,
      company: application.company,
      role: application.role,
      link: application.link ?? '',
      status: application.status,
      appliedDate: application.appliedDate,
      note: application.note,
    })
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteApplication(deleting.id)
    setDeleting(null)
    await reload()
  }

  return (
    <section className="screen applications-screen" data-screen="applications">
      <Link className="crumb" href="/pipeline">
        Pipeline
      </Link>
      <div className="applications-head">
        <div>
          <h1>All applications</h1>
          <div className="applications-count">{countText(all.length)}</div>
        </div>
        <div className={`applications-search ${searchOpen ? 'open' : ''}`.trim()}>
          <button
            className="round-icon"
            type="button"
            aria-label="Search"
            data-tooltip="Search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <SearchIcon />
          </button>
          <input
            type="search"
            autoComplete="off"
            placeholder="Search"
            hidden={!searchOpen}
            aria-hidden={!searchOpen}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="applications-table-wrap">
        <table className="applications-table">
          <colgroup>
            {COLUMNS.map((column) => (
              <col data-col={column.key} style={colWidth(column.key)} key={column.key} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  className={`${column.sortable ? 'sortable' : ''}${sort.key === column.key ? ' active-sort' : ''}`.trim()}
                  data-column={column.key}
                  style={colWidth(column.key)}
                  key={column.key}
                >
                  {column.sortable ? (
                    <button type="button" onClick={() => toggleSort(column.key as SortKey)}>
                      <span>{column.label}</span>
                      {sort.key === column.key ? (
                        <span className={`sort-indicator ${sort.dir}`} aria-hidden="true">
                          <ChevronDownIcon />
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <span>{column.label ? <span>{column.label}</span> : null}</span>
                  )}
                  {column.key !== 'menu' ? (
                    <span
                      className="column-resizer"
                      aria-hidden="true"
                      onPointerDown={(event) => startResize(column.key, event)}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  No applications here yet.
                </td>
              </tr>
            ) : (
              rows.map((application) => {
                const openUrl = application.link || application.posting?.url || ''
                return (
                  <tr key={application.id}>
                    <td>{tableValue(application.company)}</td>
                    <td>
                      <span className="table-role">
                        <span>{tableValue(application.role)}</span>
                        {openUrl ? (
                          <a
                            className="round-icon small"
                            href={openUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open posting"
                            data-tooltip="Open posting"
                          >
                            <OpenIcon />
                          </a>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <StageSelect
                        className="stage-select"
                        value={application.status}
                        onChange={(status: Status) =>
                          void changeStage(application, status, 'applications')
                        }
                      />
                    </td>
                    <td>{tableValue(application.posting?.location)}</td>
                    <td>
                      {application.posting?.workMode
                        ? normalizeMode(application.posting.workMode)
                        : '—'}
                    </td>
                    <td>{tableValue(plainDate(application.posting?.postedAt))}</td>
                    <td>{tableValue(plainDate(application.appliedDate))}</td>
                    <td>
                      <KebabMenu menuClassName="application-menu">
                        <button type="button" onClick={() => openEdit(application)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => setDeleting(application)}>
                          Delete
                        </button>
                      </KebabMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <LogApplicationModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => void reload()}
        />
      ) : null}

      {deleting ? (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setDeleting(null)}
        >
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="deleteApplicationTitle">
            <div className="modal-head">
              <h2 id="deleteApplicationTitle">Delete this application?</h2>
            </div>
            <div className="modal-copy">
              This removes the application and its notes. There is no undo.
            </div>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="btn solid" type="button" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {overlay}
    </section>
  )
}
