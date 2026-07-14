'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useUser } from '../UserProvider'

type ResolutionStatus = 'pending' | 'resolved' | 'unresolved'

type RemoteCompany = {
  id: string
  name: string
  careersUrl: string | null
  resolutionStatus: ResolutionStatus
  addedByEmail: string | null
  createdAt: string
}

type BulkResultRow = {
  name: string
  status: 'resolved' | 'unresolved' | 'duplicate' | 'invalid'
}

const STATUS_LABEL: Record<ResolutionStatus, string> = {
  resolved: 'Resolved',
  pending: 'Pending',
  unresolved: 'Not found',
}

export function AdminPanel() {
  const user = useUser()
  const [companies, setCompanies] = useState<RemoteCompany[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // Single-add form.
  const [name, setName] = useState('')
  const [careersUrl, setCareersUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Bulk paste.
  const [bulkText, setBulkText] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkResultRow[] | null>(null)

  // Re-resolve "Not found" companies (e.g. after a new ATS provider ships).
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // Inline editing of a company's name / careers URL.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    if (!user.isAdmin) {
      return
    }
    let cancelled = false
    fetch('/api/remote-companies')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        return (await response.json()) as RemoteCompany[]
      })
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [user.isAdmin])

  if (!user.isAdmin) {
    return (
      <section className="screen">
        <div className="page-head">
          <h1>Admin Panel</h1>
        </div>
        <div className="prefs-card">
          <p className="watch-invite">You don’t have access to this page.</p>
        </div>
      </section>
    )
  }

  async function refresh() {
    try {
      const response = await fetch('/api/remote-companies')
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      setCompanies((await response.json()) as RemoteCompany[])
    } catch {
      setLoadFailed(true)
    }
  }

  async function addOne(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const response = await fetch('/api/remote-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, careersUrl: careersUrl.trim() || undefined }),
      })
      if (response.status === 409) {
        setAddError('That company is already on the list.')
        return
      }
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const created = (await response.json()) as RemoteCompany
      setCompanies((prev) => [created, ...(prev ?? [])])
      setName('')
      setCareersUrl('')
    } catch {
      setAddError('Could not add that company. Try again.')
    } finally {
      setAdding(false)
    }
  }

  async function addBulk() {
    const text = bulkText.trim()
    if (!text || bulkBusy) return
    setBulkBusy(true)
    setBulkResults(null)
    try {
      const response = await fetch('/api/remote-companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const results = (await response.json()) as BulkResultRow[]
      setBulkResults(results)
      setBulkText('')
      await refresh()
    } catch {
      setBulkResults([{ name: 'Something went wrong. Try again.', status: 'invalid' }])
    } finally {
      setBulkBusy(false)
    }
  }

  async function refreshUnresolved() {
    if (refreshing) return
    setRefreshing(true)
    setRefreshMessage(null)
    try {
      const response = await fetch('/api/remote-companies/refresh', { method: 'POST' })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const result = (await response.json()) as {
        attempted: number
        resolved: number
        unresolved: number
      }
      setRefreshMessage(
        result.attempted === 0
          ? 'Nothing to re-resolve — every company is already resolved.'
          : `${result.resolved} newly resolved · ${result.unresolved} still not found.`,
      )
      await refresh()
    } catch {
      setRefreshMessage('Re-resolve failed. Try again.')
    } finally {
      setRefreshing(false)
    }
  }

  async function retryOne(company: RemoteCompany) {
    if (retryingId) return
    setRetryingId(company.id)
    try {
      const response = await fetch(`/api/remote-companies/${company.id}/resolve`, { method: 'POST' })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const updated = (await response.json()) as RemoteCompany
      setCompanies((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? prev)
    } catch {
      setRefreshMessage('Could not re-resolve that company. Try again.')
    } finally {
      setRetryingId(null)
    }
  }

  function startEdit(company: RemoteCompany) {
    setEditingId(company.id)
    setEditName(company.name)
    setEditUrl(company.careersUrl ?? '')
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function saveEdit(company: RemoteCompany) {
    const trimmed = editName.trim()
    if (!trimmed || savingEdit) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const response = await fetch(`/api/remote-companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, careersUrl: editUrl.trim() }),
      })
      if (response.status === 409) {
        setEditError('That company name is already on the list.')
        return
      }
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const updated = (await response.json()) as RemoteCompany
      setCompanies((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? prev)
      setEditingId(null)
    } catch {
      setEditError('Could not save. Try again.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function remove(company: RemoteCompany) {
    const previous = companies
    setCompanies((prev) => prev?.filter((item) => item.id !== company.id) ?? prev)
    try {
      const response = await fetch(`/api/remote-companies/${company.id}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 204) {
        throw new Error(`Request failed: ${response.status}`)
      }
    } catch {
      setCompanies(previous ?? null)
    }
  }

  const resultSummary = bulkResults
    ? {
        resolved: bulkResults.filter((row) => row.status === 'resolved').length,
        unresolved: bulkResults.filter((row) => row.status === 'unresolved').length,
        duplicate: bulkResults.filter((row) => row.status === 'duplicate').length,
        invalid: bulkResults.filter((row) => row.status === 'invalid').length,
      }
    : null

  return (
    <section className="screen">
      <div className="page-head">
        <h1>Admin Panel</h1>
      </div>

      <div className="prefs-card">
        <h2 className="prefs-section-title">Remote job board companies</h2>
        <p className="prefs-hint">
          The global, curated list of remote companies. Their matching openings appear on the Remote
          Job Board for every user and are kept off the regular Job Boards feed.
        </p>

        <form onSubmit={addOne}>
          <label>
            Company name
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setAddError(null)
              }}
              maxLength={200}
              placeholder="e.g. GitLab"
            />
          </label>
          <label>
            Careers URL (optional)
            <input
              value={careersUrl}
              onChange={(event) => setCareersUrl(event.target.value)}
              maxLength={2000}
              placeholder="https://…"
            />
          </label>
          <div className="prefs-actions">
            <button className="btn solid" type="submit" disabled={!name.trim() || adding}>
              {adding ? 'Adding…' : 'Add company'}
            </button>
            {addError ? <span className="prefs-status error">{addError}</span> : null}
          </div>
        </form>
      </div>

      <div className="prefs-card">
        <h2 className="prefs-section-title">Add many</h2>
        <p className="prefs-hint">
          One company per line. Add an optional careers URL after a comma:{' '}
          <code>GitLab, https://job-boards.greenhouse.io/gitlab</code>
        </p>
        <label>
          <textarea
            className="prefs-textarea"
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            rows={8}
            placeholder={'GitLab\nAutomattic\nZapier, https://…'}
          />
        </label>
        <div className="prefs-actions">
          <button className="btn solid" type="button" disabled={!bulkText.trim() || bulkBusy} onClick={addBulk}>
            {bulkBusy ? 'Resolving…' : 'Add all'}
          </button>
        </div>
        {resultSummary ? (
          <p className="prefs-status">
            {resultSummary.resolved} resolved · {resultSummary.unresolved} not found ·{' '}
            {resultSummary.duplicate} already listed
            {resultSummary.invalid ? ` · ${resultSummary.invalid} invalid` : ''}
          </p>
        ) : null}
      </div>

      <div className="prefs-card">
        <div className="prefs-section-head">
          <h2 className="prefs-section-title">
            On the list{companies ? ` (${companies.length})` : ''}
          </h2>
          <button
            className="btn"
            type="button"
            disabled={refreshing || !companies?.some((c) => c.resolutionStatus !== 'resolved')}
            onClick={refreshUnresolved}
          >
            {refreshing ? 'Re-resolving…' : 'Re-resolve not found'}
          </button>
        </div>
        <p className="prefs-hint">
          Re-attempts every “Not found” company — use this after a new ATS integration ships so
          companies that couldn’t be matched before get picked up.
        </p>
        {refreshMessage ? <p className="prefs-status">{refreshMessage}</p> : null}
        {loadFailed ? (
          <p className="watch-invite">Couldn’t load the list. Try refreshing.</p>
        ) : companies === null ? (
          <p className="watch-invite">Loading…</p>
        ) : companies.length === 0 ? (
          <p className="watch-invite">No companies yet. Add some above.</p>
        ) : (
          <ul className="admin-company-list">
            {companies.map((company) =>
              editingId === company.id ? (
                <li key={company.id} className="admin-company-row editing">
                  <div className="admin-company-edit">
                    <label>
                      Company name
                      <input
                        value={editName}
                        onChange={(event) => {
                          setEditName(event.target.value)
                          setEditError(null)
                        }}
                        maxLength={200}
                      />
                    </label>
                    <label>
                      Careers URL
                      <input
                        value={editUrl}
                        onChange={(event) => setEditUrl(event.target.value)}
                        maxLength={2000}
                        placeholder="https://…"
                      />
                    </label>
                    <div className="prefs-actions">
                      <button
                        className="btn solid"
                        type="button"
                        disabled={!editName.trim() || savingEdit}
                        onClick={() => saveEdit(company)}
                      >
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={savingEdit}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                      {editError ? <span className="prefs-status error">{editError}</span> : null}
                    </div>
                  </div>
                </li>
              ) : (
                <li key={company.id} className="admin-company-row">
                  <div className="admin-company-main">
                    <div className="admin-company-heading">
                      <span className="admin-company-name">{company.name}</span>
                      <span className={`admin-status admin-status-${company.resolutionStatus}`}>
                        {STATUS_LABEL[company.resolutionStatus]}
                      </span>
                    </div>
                    {company.careersUrl ? (
                      <a
                        className="admin-company-link"
                        href={company.careersUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={company.careersUrl}
                      >
                        {company.careersUrl}
                      </a>
                    ) : (
                      <span className="admin-company-link muted">No careers link</span>
                    )}
                  </div>
                  <div className="admin-company-actions">
                    <button className="text-button" type="button" onClick={() => startEdit(company)}>
                      Edit
                    </button>
                    {company.resolutionStatus !== 'resolved' ? (
                      <button
                        className="text-button"
                        type="button"
                        disabled={retryingId === company.id}
                        onClick={() => retryOne(company)}
                      >
                        {retryingId === company.id ? 'Retrying…' : 'Retry'}
                      </button>
                    ) : null}
                    <button className="text-button" type="button" onClick={() => remove(company)}>
                      Remove
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
