import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import {
  AtsProvider,
  JobBoardSourceRef,
  companyHandleCandidates,
  fetchJson,
} from './job-board-provider'

const PROBE_TIMEOUT_MS = 6_000

// Subset of https://boards-api.greenhouse.io/v1/boards/{token}/jobs we rely on.
type GreenhouseJob = {
  id?: number | string
  title?: string
  absolute_url?: string
  company_name?: string
  location?: { name?: string }
  first_published?: string
  updated_at?: string
}

function workModeFromLocation(location: string | null): WorkMode | null {
  if (!location) {
    return null
  }
  const lowered = location.toLowerCase()
  if (lowered.includes('remote')) {
    return 'Remote'
  }
  if (lowered.includes('hybrid')) {
    return 'Hybrid'
  }
  return null
}

@Injectable()
export class GreenhouseProvider implements AtsProvider {
  readonly provider = 'greenhouse'
  readonly kind = 'ats' as const

  private jobsUrl(handle: string): string {
    return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(handle)}/jobs`
  }

  handleFromUrl(url: string): string | null {
    const match = url.match(
      /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9-]+)/i,
    )
    return match ? match[1].toLowerCase() : null
  }

  candidateHandles(companyName: string): string[] {
    return companyHandleCandidates(companyName)
  }

  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const payload = (await fetchJson(this.jobsUrl(handle), PROBE_TIMEOUT_MS)) as {
        jobs?: unknown[]
      }
      return Array.isArray(payload.jobs) && payload.jobs.length > 0
    } catch {
      return false
    }
  }

  async fetchListings(source: JobBoardSourceRef): Promise<NormalizedJob[]> {
    const payload = (await fetchJson(this.jobsUrl(source.externalId))) as { jobs?: GreenhouseJob[] }
    if (!Array.isArray(payload.jobs)) {
      throw new Error(`Greenhouse board "${source.externalId}" returned no jobs array`)
    }
    return payload.jobs
      .map((job) => this.normalize(job, source))
      .filter((job): job is NormalizedJob => job !== null)
  }

  normalize(job: GreenhouseJob, source: JobBoardSourceRef): NormalizedJob | null {
    if (job.id === undefined || !job.title || !job.absolute_url) {
      return null
    }
    const location = job.location?.name?.trim() || null
    return {
      provider: this.provider,
      externalId: String(job.id),
      title: job.title.trim(),
      companyName: job.company_name?.trim() || source.companyName,
      location,
      locations: location ? [location] : [],
      workMode: workModeFromLocation(location),
      url: job.absolute_url,
      postedAt: parseDate(job.first_published) ?? parseDate(job.updated_at),
    }
  }
}
