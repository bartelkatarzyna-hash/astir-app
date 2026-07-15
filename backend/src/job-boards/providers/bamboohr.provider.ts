import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import {
  AtsProvider,
  JobBoardSourceRef,
  companyHandleCandidates,
  fetchJson,
} from './job-board-provider'

const PROBE_TIMEOUT_MS = 6_000

// Every BambooHR careers site serves its open roles as JSON at
// https://{handle}.bamboohr.com/careers/list — no key, no login. The response
// wraps the openings in a `result` array; each item carries the opening id and
// name, a coarse `location`/`atsLocation` pair, and an `isRemote` flag. There
// is no posted date and no per-job URL, so we build the public link from the
// handle and id: https://{handle}.bamboohr.com/careers/{id}.
type BambooLocation = {
  city?: string | null
  state?: string | null
  province?: string | null
  country?: string | null
}

type BambooJob = {
  id?: string | number
  jobOpeningName?: string
  departmentLabel?: string
  employmentStatusLabel?: string
  location?: BambooLocation
  atsLocation?: BambooLocation
  isRemote?: boolean | null
}

function joinLocation(location: BambooLocation | undefined): string | null {
  if (!location) {
    return null
  }
  const parts = [location.city, location.state ?? location.province, location.country]
    .map((part) => part?.trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

@Injectable()
export class BambooHrProvider implements AtsProvider {
  readonly provider = 'bamboohr'
  readonly kind = 'ats' as const

  private listUrl(handle: string): string {
    return `https://${encodeURIComponent(handle)}.bamboohr.com/careers/list`
  }

  handleFromUrl(url: string): string | null {
    // Careers sites live at https://{account}.bamboohr.com/careers[/{id}]. Only
    // the account subdomain carries the handle; the platform's own hosts
    // (www, staticfe, content, etc.) never do.
    const match = url.match(/([a-z0-9-]+)\.bamboohr\.com/i)
    if (!match) {
      return null
    }
    const handle = match[1].toLowerCase()
    return ['www', 'staticfe', 'content'].includes(handle) ? null : handle
  }

  candidateHandles(companyName: string): string[] {
    return companyHandleCandidates(companyName)
  }

  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const payload = (await fetchJson(this.listUrl(handle), PROBE_TIMEOUT_MS)) as {
        result?: unknown[]
      }
      return Array.isArray(payload.result) && payload.result.length > 0
    } catch {
      return false
    }
  }

  async fetchListings(source: JobBoardSourceRef): Promise<NormalizedJob[]> {
    const payload = (await fetchJson(this.listUrl(source.externalId))) as { result?: BambooJob[] }
    if (!Array.isArray(payload.result)) {
      throw new Error(`BambooHR site "${source.externalId}" returned no result array`)
    }
    return payload.result
      .map((job) => this.normalize(job, source))
      .filter((job): job is NormalizedJob => job !== null)
  }

  normalize(job: BambooJob, source: JobBoardSourceRef): NormalizedJob | null {
    if (job.id === undefined || job.id === null || !job.jobOpeningName) {
      return null
    }
    const location = joinLocation(job.atsLocation) ?? joinLocation(job.location)
    const workMode: WorkMode | null = job.isRemote
      ? 'Remote'
      : /\bremote\b/i.test(location ?? '')
        ? 'Remote'
        : null
    return {
      provider: this.provider,
      externalId: String(job.id),
      title: job.jobOpeningName.trim(),
      // The feed is single-tenant and carries no company name.
      companyName: source.companyName,
      location,
      locations: location ? [location] : [],
      workMode,
      url: `https://${source.externalId}.bamboohr.com/careers/${job.id}`,
      // BambooHR's list feed carries no posted date.
      postedAt: parseDate(undefined),
    }
  }
}
