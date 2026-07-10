import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import {
  AtsProvider,
  JobBoardSourceRef,
  companyHandleCandidates,
  fetchJson,
} from './job-board-provider'

const PROBE_TIMEOUT_MS = 6_000

// Subset of https://apply.workable.com/api/v1/widget/accounts/{subdomain}.
type WorkableJob = {
  title?: string
  shortcode?: string
  url?: string
  telecommuting?: boolean
  city?: string
  country?: string
  locations?: Array<{ city?: string; region?: string; country?: string }>
  published_on?: string
  created_at?: string
}

function joinPlace(parts: Array<string | undefined>): string | null {
  const cleaned = parts.map((part) => part?.trim()).filter(Boolean)
  return cleaned.length ? cleaned.join(', ') : null
}

function locationFromWorkable(job: WorkableJob): string | null {
  return joinPlace([job.city, job.country])
}

function locationsFromWorkable(job: WorkableJob): string[] {
  const places = [
    locationFromWorkable(job),
    ...(job.locations ?? []).map((place) => joinPlace([place.city, place.region, place.country])),
  ]
  return [...new Set(places.filter((place): place is string => !!place))]
}

function workModeFromWorkable(job: WorkableJob): WorkMode | null {
  return job.telecommuting ? 'Remote' : null
}

@Injectable()
export class WorkableProvider implements AtsProvider {
  readonly provider = 'workable'
  readonly kind = 'ats' as const

  private accountUrl(handle: string): string {
    return `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(handle)}`
  }

  handleFromUrl(url: string): string | null {
    // Workable careers pages look like https://apply.workable.com/{account}/
    // or https://{account}.workable.com/. Per-job /j/{code} links carry no
    // account slug, so they are intentionally not matched here.
    const applyMatch = url.match(/apply\.workable\.com\/([a-z0-9-]+)(?:\/|$)/i)
    if (applyMatch && applyMatch[1] !== 'j') {
      return applyMatch[1].toLowerCase()
    }
    const subdomainMatch = url.match(/([a-z0-9-]+)\.workable\.com/i)
    return subdomainMatch && subdomainMatch[1] !== 'apply'
      ? subdomainMatch[1].toLowerCase()
      : null
  }

  candidateHandles(companyName: string): string[] {
    return companyHandleCandidates(companyName)
  }

  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const payload = (await fetchJson(this.accountUrl(handle), PROBE_TIMEOUT_MS)) as {
        jobs?: unknown[]
      }
      return Array.isArray(payload.jobs) && payload.jobs.length > 0
    } catch {
      return false
    }
  }

  async fetchListings(source: JobBoardSourceRef): Promise<NormalizedJob[]> {
    const payload = (await fetchJson(this.accountUrl(source.externalId))) as {
      name?: string
      jobs?: WorkableJob[]
    }
    if (!Array.isArray(payload.jobs)) {
      throw new Error(`Workable account "${source.externalId}" returned no jobs array`)
    }
    const companyName = payload.name?.trim() || source.companyName
    return payload.jobs
      .map((job) => this.normalize(job, companyName))
      .filter((job): job is NormalizedJob => job !== null)
  }

  normalize(job: WorkableJob, companyName: string): NormalizedJob | null {
    if (!job.shortcode || !job.title || !job.url) {
      return null
    }
    return {
      provider: this.provider,
      externalId: job.shortcode,
      title: job.title.trim(),
      companyName,
      location: locationFromWorkable(job),
      locations: locationsFromWorkable(job),
      workMode: workModeFromWorkable(job),
      url: job.url,
      postedAt: parseDate(job.published_on) ?? parseDate(job.created_at),
    }
  }
}
