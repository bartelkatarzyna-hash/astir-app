import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import {
  AtsProvider,
  JobBoardSourceRef,
  companyHandleCandidates,
  fetchJson,
} from './job-board-provider'

const PROBE_TIMEOUT_MS = 6_000

// Subset of https://api.ashbyhq.com/posting-api/job-board/{name} we rely on.
type AshbyJob = {
  id?: string
  title?: string
  location?: string
  secondaryLocations?: Array<{ location?: string }>
  address?: { postalAddress?: { addressCountry?: string } }
  isListed?: boolean
  isRemote?: boolean
  workplaceType?: string
  jobUrl?: string
  publishedAt?: string
}

function locationsFromAshby(job: AshbyJob): string[] {
  const locations = [
    job.location,
    ...(job.secondaryLocations ?? []).map((secondary) => secondary.location),
    job.address?.postalAddress?.addressCountry,
  ]
  return [...new Set(locations.map((value) => value?.trim()).filter((value): value is string => !!value))]
}

function workModeFromAshby(job: AshbyJob): WorkMode | null {
  switch (job.workplaceType) {
    case 'Remote':
      return 'Remote'
    case 'Hybrid':
      return 'Hybrid'
    case 'OnSite':
      return 'On-Site'
    default:
      return job.isRemote ? 'Remote' : null
  }
}

@Injectable()
export class AshbyProvider implements AtsProvider {
  readonly provider = 'ashby'
  readonly kind = 'ats' as const

  private boardUrl(handle: string): string {
    return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(handle)}`
  }

  handleFromUrl(url: string): string | null {
    const match = url.match(/(?:jobs|api)\.ashbyhq\.com\/(?:posting-api\/job-board\/)?([a-z0-9-]+)/i)
    return match ? match[1].toLowerCase() : null
  }

  candidateHandles(companyName: string): string[] {
    return companyHandleCandidates(companyName)
  }

  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const payload = (await fetchJson(this.boardUrl(handle), PROBE_TIMEOUT_MS)) as {
        jobs?: unknown[]
      }
      return Array.isArray(payload.jobs) && payload.jobs.length > 0
    } catch {
      return false
    }
  }

  async fetchListings(source: JobBoardSourceRef): Promise<NormalizedJob[]> {
    const payload = (await fetchJson(this.boardUrl(source.externalId))) as { jobs?: AshbyJob[] }
    if (!Array.isArray(payload.jobs)) {
      throw new Error(`Ashby job board "${source.externalId}" returned no jobs array`)
    }
    return payload.jobs
      .filter((job) => job.isListed !== false)
      .map((job) => this.normalize(job, source))
      .filter((job): job is NormalizedJob => job !== null)
  }

  normalize(job: AshbyJob, source: JobBoardSourceRef): NormalizedJob | null {
    if (!job.id || !job.title || !job.jobUrl) {
      return null
    }
    return {
      provider: this.provider,
      externalId: job.id,
      title: job.title.trim(),
      companyName: source.companyName,
      location: job.location?.trim() || null,
      locations: locationsFromAshby(job),
      workMode: workModeFromAshby(job),
      url: job.jobUrl,
      postedAt: parseDate(job.publishedAt),
    }
  }
}
