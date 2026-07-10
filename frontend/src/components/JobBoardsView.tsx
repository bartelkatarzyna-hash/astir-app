'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Application } from '@/lib/applications'
import { formatPostedDate, isPipelineStatus } from '@/lib/applications'
import { LogApplicationModal, type LogApplicationInitial } from './applications/LogApplicationModal'
import { Snackbar, useSnackbar } from './applications/useSnackbar'
import { OpenIcon, PlusIcon } from './icons'

// Shape of GET /api/job-boards/listings (JobBoardListing on the backend).
type Listing = {
  id: string
  title: string
  companyName: string
  location: string | null
  workMode: string | null
  url: string
  postedAt: string | null
  firstSeenAt: string
  providers: string[]
  matchedKeywords: string[]
  status: string
}

type SortKey = 'newest' | 'discovered' | 'company'

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'newest', label: 'Newest' },
  { key: 'discovered', label: 'Recently added' },
  { key: 'company', label: 'Company' },
]

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000

// "New" means posted at the source within the last 48h. Listings without a
// provider posting date get no label (we don't fall back to when we pulled it in).
function isFresh(listing: Listing): boolean {
  if (!listing.postedAt) return false
  return Date.now() - new Date(listing.postedAt).getTime() < NEW_WINDOW_MS
}

// "Newest" means the provider's posting date when it exists, falling back to
// when we first saw the listing.
function listedAt(listing: Listing): number {
  return new Date(listing.postedAt ?? listing.firstSeenAt).getTime()
}

function metaLine(listing: Listing): string {
  return [listing.companyName, listing.location, listing.workMode].filter(Boolean).join(' · ')
}

function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const sorted = [...listings]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => listedAt(b) - listedAt(a))
    case 'discovered':
      return sorted.sort(
        (a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
      )
    case 'company':
      return sorted.sort(
        (a, b) => a.companyName.localeCompare(b.companyName) || listedAt(b) - listedAt(a),
      )
  }
}

function ListingRow({ listing, onLog }: { listing: Listing; onLog: (listing: Listing) => void }) {
  return (
    <div className="watch-role">
      <div className="role-main">
        <div className="role-title-line">
          <span className="role-name" title={listing.title}>
            {listing.title}
          </span>
          <a
            className="round-icon small"
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open posting"
            data-tooltip="Open posting"
          >
            <OpenIcon />
          </a>
          {isFresh(listing) ? <span className="role-new-chip">New</span> : null}
        </div>
        <div className="role-loc">{metaLine(listing)}</div>
        <div className="role-posted">Posted: {formatPostedDate(listing.postedAt)}</div>
        {listing.providers.includes('adzuna') ? (
          // Adzuna's terms require attribution wherever its listings appear.
          <div className="role-attribution">
            <a href="https://www.adzuna.com/" target="_blank" rel="noreferrer">
              Jobs by Adzuna
            </a>
          </div>
        ) : null}
      </div>
      <button
        className="round-icon add-application"
        type="button"
        aria-label="Log application"
        data-tooltip="Log application"
        onClick={() => onLog(listing)}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

export function JobBoardsView() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [sort, setSort] = useState<SortKey>('newest')
  const [logging, setLogging] = useState<LogApplicationInitial | null>(null)
  const { message: snack, showSnack } = useSnackbar()

  useEffect(() => {
    let cancelled = false
    fetch('/api/job-boards/listings')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Listings request failed: ${response.status}`)
        }
        return (await response.json()) as Listing[]
      })
      .then((data) => {
        if (!cancelled) {
          setListings(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => sortListings(listings ?? [], sort), [listings, sort])

  function openLog(listing: Listing) {
    setLogging({
      listingId: listing.id,
      company: listing.companyName,
      role: listing.title,
      link: listing.url,
      status: 'Applied',
    })
  }

  // Logging an application removes the listing from the board (the backend now
  // hides applied listings), so drop it locally too and point the user on.
  function onLogged(application: Application, listingId: string | null) {
    if (listingId) {
      setListings((prev) => prev?.filter((listing) => listing.id !== listingId) ?? prev)
    }
    showSnack(
      isPipelineStatus(application.status)
        ? { text: 'Logged. You can see it in pipeline.', linkText: 'pipeline', href: '/pipeline' }
        : {
            text: 'Logged. Find it in all applications.',
            linkText: 'all applications',
            href: '/applications',
          },
      5000,
    )
  }

  return (
    <section className="screen" data-screen="job-boards">
      <div className="page-head">
        <h1>Job Boards</h1>
        <div className="option-toggles" role="group" aria-label="Sort listings">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`option-toggle${sort === option.key ? ' on' : ''}`}
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="watchlist">
        {failed ? (
          <p className="watch-invite">Job boards are resting for a moment. Try again soon.</p>
        ) : listings === null ? (
          <p className="watch-invite">Gathering openings…</p>
        ) : sorted.length === 0 ? (
          <p className="watch-invite">
            Nothing matching your preferences yet. New openings appear here as boards are checked.
          </p>
        ) : (
          <article className="watch-group board-feed">
            {sorted.map((listing) => (
              <ListingRow listing={listing} key={listing.id} onLog={openLog} />
            ))}
          </article>
        )}
      </div>
      {logging ? (
        <LogApplicationModal
          initial={logging}
          fromJobBoard
          onClose={() => setLogging(null)}
          onSaved={(application) => onLogged(application, logging.listingId ?? null)}
        />
      ) : null}
      <Snackbar message={snack} />
    </section>
  )
}
