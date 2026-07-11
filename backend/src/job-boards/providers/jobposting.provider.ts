import { Injectable } from '@nestjs/common'
import { NormalizedJob, WorkMode, parseDate } from '../normalized-job'
import { AtsProvider, JobBoardSourceRef } from './job-board-provider'

const FETCH_TIMEOUT_MS = 15_000
// Careers pages block obvious bots; present a browser-ish UA.
const USER_AGENT =
  'Mozilla/5.0 (compatible; JobBoardBot/1.0; +https://example.com/bot)'

// Generic last-resort provider: any careers page that embeds schema.org
// JobPosting structured data (<script type="application/ld+json">) can be read
// without a per-vendor integration. The "handle" is the careers URL itself.
// It never guesses a URL from a name and never claims a known ATS host, so it
// only runs as an explicit fallback once the real ATS providers come up empty
// (see CompanyResolutionService and GENERIC_JOBPOSTING_PROVIDER).

// The subset of schema.org JobPosting we map. Fields are loosely typed because
// sites vary wildly in how completely they fill the schema.
type SchemaOrgAddress = {
  addressLocality?: string
  addressRegion?: string
  addressCountry?: string | { name?: string }
}

type SchemaOrgPlace = {
  address?: SchemaOrgAddress | string
}

type SchemaOrgJobPosting = {
  '@type'?: string | string[]
  title?: string
  url?: string
  datePosted?: string
  jobLocation?: SchemaOrgPlace | SchemaOrgPlace[]
  jobLocationType?: string
  hiringOrganization?: { name?: string } | string
  identifier?: { value?: string | number } | string | number
  // schema.org allows a BCP-47 string ('en', 'en-US') or a Language object.
  inLanguage?: string | { name?: string; alternateName?: string }
}

function hasType(node: { '@type'?: string | string[] }, type: string): boolean {
  const raw = node['@type']
  return Array.isArray(raw) ? raw.includes(type) : raw === type
}

// Depth-first collection of every JobPosting reachable through the common
// wrappers: @graph, ItemList.itemListElement, and {item: ...} elements.
function collectJobPostings(node: unknown, out: SchemaOrgJobPosting[]): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectJobPostings(child, out)
    }
    return
  }
  if (!node || typeof node !== 'object') {
    return
  }
  const record = node as Record<string, unknown> & { '@type'?: string | string[] }
  if (hasType(record, 'JobPosting')) {
    out.push(record as SchemaOrgJobPosting)
  }
  collectJobPostings(record['@graph'], out)
  collectJobPostings(record['itemListElement'], out)
  collectJobPostings(record['item'], out)
}

function jobPostingsFromHtml(html: string): SchemaOrgJobPosting[] {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  const postings: SchemaOrgJobPosting[] = []
  for (const block of blocks) {
    try {
      collectJobPostings(JSON.parse(block[1].trim()), postings)
    } catch {
      // A malformed or non-JSON block is simply skipped.
    }
  }
  return postings
}

function stringFrom(value: string | { name?: string } | undefined): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }
  return value?.name?.trim() || null
}

function placeFromAddress(address: SchemaOrgAddress | string | undefined): string | null {
  if (!address) {
    return null
  }
  if (typeof address === 'string') {
    return address.trim() || null
  }
  const parts = [
    address.addressLocality,
    address.addressRegion,
    stringFrom(address.addressCountry),
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : part))
    .filter((part): part is string => !!part)
  return parts.length ? parts.join(', ') : null
}

function locationsFromJobPosting(posting: SchemaOrgJobPosting): string[] {
  const raw = posting.jobLocation
  const places = Array.isArray(raw) ? raw : raw ? [raw] : []
  return [
    ...new Set(
      places
        .map((place) => placeFromAddress(place.address))
        .filter((place): place is string => !!place),
    ),
  ]
}

// Reduce schema.org inLanguage to an ISO 639-1 primary subtag ('en-US' ->
// 'en'). Only accepts BCP-47-style codes; a full language name ("German")
// yields null rather than guessing a code.
function languageFrom(posting: SchemaOrgJobPosting): string | null {
  const raw = posting.inLanguage
  const value = typeof raw === 'string' ? raw : raw?.alternateName || raw?.name
  const subtag = value?.trim().split(/[-_]/)[0].toLowerCase()
  return subtag && /^[a-z]{2,3}$/.test(subtag) ? subtag : null
}

function identifierFrom(posting: SchemaOrgJobPosting): string | null {
  const id = posting.identifier
  if (id === undefined || id === null) {
    return null
  }
  if (typeof id === 'object') {
    return id.value !== undefined ? String(id.value) : null
  }
  return String(id)
}

@Injectable()
export class JobPostingProvider implements AtsProvider {
  readonly provider = 'jobposting'
  readonly kind = 'ats' as const

  // Not tied to any host, and a page URL can't be inferred from a name.
  handleFromUrl(): string | null {
    return null
  }

  candidateHandles(): string[] {
    return []
  }

  async verifyHandle(handle: string): Promise<boolean> {
    try {
      return (await this.fetchJobPostings(handle)).length > 0
    } catch {
      return false
    }
  }

  private async fetchJobPostings(careersUrl: string): Promise<SchemaOrgJobPosting[]> {
    const response = await fetch(careersUrl, {
      headers: { accept: 'text/html', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`GET ${careersUrl} responded ${response.status}`)
    }
    return jobPostingsFromHtml(await response.text())
  }

  async fetchListings(source: JobBoardSourceRef): Promise<NormalizedJob[]> {
    const postings = await this.fetchJobPostings(source.externalId)
    const seen = new Set<string>()
    const jobs: NormalizedJob[] = []
    for (const posting of postings) {
      const job = this.normalize(posting, source)
      // The same posting can appear in more than one JSON-LD block on a page.
      if (job && !seen.has(job.externalId)) {
        seen.add(job.externalId)
        jobs.push(job)
      }
    }
    return jobs
  }

  normalize(posting: SchemaOrgJobPosting, source: JobBoardSourceRef): NormalizedJob | null {
    const url = posting.url?.trim() || source.externalId
    if (!posting.title || !url) {
      return null
    }
    const locations = locationsFromJobPosting(posting)
    return {
      provider: this.provider,
      // No stable id on many pages; fall back to the posting URL.
      externalId: identifierFrom(posting) ?? url,
      title: posting.title.trim(),
      companyName: stringFrom(posting.hiringOrganization) ?? source.companyName,
      location: locations[0] ?? null,
      locations,
      workMode: this.workMode(posting),
      url,
      postedAt: parseDate(posting.datePosted),
      contentLanguage: languageFrom(posting),
    }
  }

  private workMode(posting: SchemaOrgJobPosting): WorkMode | null {
    return posting.jobLocationType === 'TELECOMMUTE' ? 'Remote' : null
  }
}
