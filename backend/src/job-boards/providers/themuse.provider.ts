import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import { AggregatorProvider, JobBoardSourceRef, fetchJson } from './job-board-provider'

// The Muse's free public API. Its corpus is US-heavy, so the feed's pull scope
// is a curated set of European locations (aligned with the default hiring
// regions) plus remote; per-user matching narrows further by keyword/region.
// Editing MUSE_LOCATIONS is how you retune this feed. See docs/job-boards.md.
const API_URL = 'https://www.themuse.com/api/public/jobs'
const MUSE_LOCATIONS = [
  'Berlin, Germany',
  'Munich, Germany',
  'Hamburg, Germany',
  'Frankfurt, Germany',
  'Warsaw, Poland',
  'London, United Kingdom',
  'Amsterdam, Netherlands',
  'Paris, France',
  'Dublin, Ireland',
  'Madrid, Spain',
  'Flexible / Remote',
]
// 20 results per page; cap the newest-first pull so one feed can't run away.
const MAX_PAGES = 25

// Subset of https://www.themuse.com/api/public/jobs we rely on.
type MuseJob = {
  id?: number
  name?: string
  company?: { name?: string }
  locations?: Array<{ name?: string }>
  refs?: { landing_page?: string }
  publication_date?: string
}

function workModeFromMuse(locations: string[]): WorkMode | null {
  return locations.some((location) => location.toLowerCase().includes('remote')) ? 'Remote' : null
}

@Injectable()
export class TheMuseProvider implements AggregatorProvider {
  readonly provider = 'themuse'
  readonly kind = 'aggregator' as const
  readonly feed: JobBoardSourceRef = { externalId: 'europe', companyName: 'The Muse' }

  private pageUrl(page: number): string {
    const locations = MUSE_LOCATIONS.map((location) => `location=${encodeURIComponent(location)}`)
    return `${API_URL}?${locations.join('&')}&descending=true&page=${page}`
  }

  // Aggregators ignore the source ref — the feed's scope is fixed above.
  async fetchListings(): Promise<NormalizedJob[]> {
    const jobs: NormalizedJob[] = []
    // The API is 0-indexed and reports the total page count; stop at whichever
    // comes first, the cap or the last page.
    for (let page = 0; page < MAX_PAGES; page++) {
      const payload = (await fetchJson(this.pageUrl(page))) as {
        results?: MuseJob[]
        page_count?: number
      }
      if (!Array.isArray(payload.results)) {
        throw new Error('The Muse feed returned no results array')
      }
      for (const job of payload.results) {
        const normalized = this.normalize(job)
        if (normalized) {
          jobs.push(normalized)
        }
      }
      if (!payload.results.length || page + 1 >= (payload.page_count ?? 0)) {
        break
      }
    }
    return jobs
  }

  normalize(job: MuseJob): NormalizedJob | null {
    if (job.id === undefined || !job.name || !job.company?.name || !job.refs?.landing_page) {
      return null
    }
    const locations = [
      ...new Set(
        (job.locations ?? [])
          .map((location) => location.name?.trim())
          .filter((name): name is string => !!name),
      ),
    ]
    return {
      provider: this.provider,
      externalId: String(job.id),
      title: job.name.trim(),
      companyName: job.company.name.trim(),
      location: locations[0] ?? null,
      locations,
      workMode: workModeFromMuse(locations),
      url: job.refs.landing_page,
      postedAt: parseDate(job.publication_date),
    }
  }
}
