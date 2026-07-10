import { Injectable, Logger } from '@nestjs/common'
import { NormalizedJob, WorkMode } from '../normalized-job'
import { AggregatorProvider, JobBoardSourceRef } from './job-board-provider'

// Arbeitnow's free, no-auth job-board feed (Europe-focused). One page holds
// ~100 roles across every company. The feed's pagination is NOT globally
// sorted by date — a role posted hours ago can appear well past page 5, and
// per-page date ranges overlap — so "pull the newest N pages" silently drops
// recent openings. We instead walk the whole feed to the end (stopping when a
// page returns no data) and let per-user matching narrow by keyword/region.
// A high page cap is a safety backstop against a runaway feed, not a scope
// limit. See docs/job-boards.md.
//
// The feed is rate-limited to ~5 requests/minute (x-ratelimit-limit: 5). A
// naive back-to-back walk gets a 429 by page ~6-11, so we pace requests off
// the rate-limit headers and back off on 429. If we still get cut off we keep
// whatever we pulled rather than failing the whole source — ingestion only
// upserts, so a short pull never deletes previously-seen listings.
const FEED_URL = 'https://www.arbeitnow.com/api/job-board-api'
const MAX_PAGES = 60
const FETCH_TIMEOUT_MS = 15_000
// Fallback pace when the server doesn't tell us when the window resets. The
// limit is 5/min, so ~13s between requests keeps us just under it.
const DEFAULT_THROTTLE_MS = 13_000
const MAX_RETRIES_PER_PAGE = 3

// Subset of the feed payload we rely on.
type ArbeitnowJob = {
  slug?: string
  company_name?: string
  title?: string
  url?: string
  location?: string
  remote?: boolean
  // Epoch seconds.
  created_at?: number
}

// Raised when a page keeps returning 429 after our retries; the caller keeps
// the partial pull instead of failing the source.
class RateLimitedError extends Error {}

@Injectable()
export class ArbeitnowProvider implements AggregatorProvider {
  private readonly logger = new Logger(ArbeitnowProvider.name)

  readonly provider = 'arbeitnow'
  readonly kind = 'aggregator' as const
  readonly feed: JobBoardSourceRef = { externalId: 'europe', companyName: 'Arbeitnow' }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Fetch one page, honouring the rate limit: retry 429 after its Retry-After,
  // then pace the next request off the remaining-quota header. Throws
  // RateLimitedError if 429 persists past our retries.
  private async fetchPage(page: number): Promise<ArbeitnowJob[]> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${FEED_URL}?page=${page}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (response.status === 429) {
        if (attempt >= MAX_RETRIES_PER_PAGE) {
          throw new RateLimitedError(`Arbeitnow still 429 after ${attempt} retries on page ${page}`)
        }
        const retryAfter = Number(response.headers.get('retry-after'))
        await this.delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : DEFAULT_THROTTLE_MS)
        continue
      }
      if (!response.ok) {
        throw new Error(`GET ${FEED_URL}?page=${page} responded ${response.status}`)
      }
      const payload = (await response.json()) as { data?: ArbeitnowJob[] }
      if (!Array.isArray(payload.data)) {
        throw new Error('Arbeitnow feed returned no data array')
      }
      // Pace the next request: if this response used up the window, wait for it
      // to refill before asking for more.
      const remaining = Number(response.headers.get('x-ratelimit-remaining'))
      if (Number.isFinite(remaining) && remaining <= 0) {
        await this.delay(DEFAULT_THROTTLE_MS)
      }
      return payload.data
    }
  }

  // Aggregators ignore the source ref — the feed's scope is fixed above.
  async fetchListings(): Promise<NormalizedJob[]> {
    const jobs: NormalizedJob[] = []
    let page = 1
    try {
      for (; page <= MAX_PAGES; page++) {
        const data = await this.fetchPage(page)
        if (!data.length) {
          break
        }
        for (const job of data) {
          const normalized = this.normalize(job)
          if (normalized) {
            jobs.push(normalized)
          }
        }
      }
    } catch (error) {
      // Rate-limited mid-walk: keep what we pulled rather than losing the run.
      if (error instanceof RateLimitedError) {
        this.logger.warn(
          `${error.message}; keeping ${jobs.length} listings from ${page - 1} pages (feed truncated).`,
        )
        return jobs
      }
      throw error
    }
    // Hitting the cap means the feed is longer than our backstop and we've
    // truncated it — surface that rather than reporting silent full coverage.
    if (page > MAX_PAGES) {
      this.logger.warn(
        `Arbeitnow feed reached the ${MAX_PAGES}-page cap without ending; newest roles may be missing. Consider raising MAX_PAGES.`,
      )
    }
    return jobs
  }

  normalize(job: ArbeitnowJob): NormalizedJob | null {
    if (!job.slug || !job.title || !job.url || !job.company_name) {
      return null
    }
    const location = job.location?.trim() || null
    return {
      provider: this.provider,
      externalId: job.slug,
      title: job.title.trim(),
      companyName: job.company_name.trim(),
      location,
      locations: location ? [location] : [],
      workMode: job.remote ? ('Remote' as WorkMode) : null,
      url: job.url,
      postedAt: typeof job.created_at === 'number' ? new Date(job.created_at * 1000) : null,
    }
  }
}
