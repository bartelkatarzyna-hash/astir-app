import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import { AggregatorProvider, JobBoardSourceRef, fetchJson } from './job-board-provider'

// Adzuna is a credentialed aggregator: it needs an app id + key (free personal
// tier at developer.adzuna.com). The free tier is capped at 250 calls/day, so
// the pull is deliberately tiny — a couple of countries, one page each, newest
// first — and per-user matching narrows from there. ADZUNA_COUNTRIES and
// RESULTS_PER_PAGE are the tuning knobs. NOTE: the free tier is personal-use
// only; commercial use needs a licence from Adzuna. See docs/job-boards.md.
const API_ROOT = 'https://api.adzuna.com/v1/api/jobs'
const ADZUNA_COUNTRIES = ['de', 'gb']
const RESULTS_PER_PAGE = 50
const MAX_PAGES = 1
const MAX_DAYS_OLD = 14

// Subset of a job in the search response we rely on.
type AdzunaJob = {
  id?: string
  title?: string
  created?: string
  redirect_url?: string
  company?: { display_name?: string }
  location?: { display_name?: string; area?: string[] }
}

function workModeFromAdzuna(job: AdzunaJob): WorkMode | null {
  // Adzuna has no dedicated remote flag; infer it from the text like the other
  // location-only providers do.
  const haystack = `${job.title ?? ''} ${job.location?.display_name ?? ''}`.toLowerCase()
  return haystack.includes('remote') ? 'Remote' : null
}

@Injectable()
export class AdzunaProvider implements AggregatorProvider {
  readonly provider = 'adzuna'
  readonly kind = 'aggregator' as const
  readonly feed: JobBoardSourceRef = { externalId: 'europe', companyName: 'Adzuna' }

  private get appId(): string {
    return process.env.ADZUNA_APP_ID ?? ''
  }

  private get appKey(): string {
    return process.env.ADZUNA_APP_KEY ?? ''
  }

  isEnabled(): boolean {
    return this.appId.length > 0 && this.appKey.length > 0
  }

  private pageUrl(country: string, page: number): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      app_key: this.appKey,
      results_per_page: String(RESULTS_PER_PAGE),
      sort_by: 'date',
      max_days_old: String(MAX_DAYS_OLD),
      'content-type': 'application/json',
    })
    return `${API_ROOT}/${country}/search/${page}?${params.toString()}`
  }

  async fetchListings(): Promise<NormalizedJob[]> {
    if (!this.isEnabled()) {
      return []
    }
    const jobs: NormalizedJob[] = []
    for (const country of ADZUNA_COUNTRIES) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const payload = (await fetchJson(this.pageUrl(country, page))) as { results?: AdzunaJob[] }
        if (!Array.isArray(payload.results)) {
          throw new Error(`Adzuna "${country}" returned no results array`)
        }
        if (!payload.results.length) {
          break
        }
        for (const job of payload.results) {
          const normalized = this.normalize(job)
          if (normalized) {
            jobs.push(normalized)
          }
        }
      }
    }
    return jobs
  }

  normalize(job: AdzunaJob): NormalizedJob | null {
    if (!job.id || !job.title || !job.redirect_url || !job.company?.display_name) {
      return null
    }
    const location = job.location?.display_name?.trim() || null
    return {
      provider: this.provider,
      externalId: job.id,
      title: job.title.trim(),
      companyName: job.company.display_name.trim(),
      location,
      locations: location ? [location] : [],
      workMode: workModeFromAdzuna(job),
      // redirect_url is Adzuna's tracked link — required by their terms.
      url: job.redirect_url,
      postedAt: parseDate(job.created),
    }
  }
}
