import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { WatchlistCompany } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CompanyResolutionService } from '../job-boards/company-resolution.service'
import { JobIngestionService } from '../job-boards/job-ingestion.service'
import { JobMatchingService } from '../job-boards/job-matching.service'
import { companyKey } from '../job-boards/normalized-job'
import { foldOpenings } from '../job-boards/opening-folding'

export type WatchlistRole = {
  id: string
  title: string
  url: string
  // Primary location — the one the link points at (best match for the user's
  // selected regions).
  location: string | null
  // Every location this opening is available in, primary first. The same role
  // posted across cities is folded into one row here so the client can show
  // "Berlin +2".
  locations: string[]
  workMode: string | null
  contentLanguage: string | null
  postedAt: Date | null
  firstSeenAt: Date
  matchedKeywords: string[]
}

// One matched posting before same-opening rows are folded together. Matches
// the shared FoldableOpening shape consumed by foldOpenings.
type RawRole = WatchlistRole & { companyName: string }

export type WatchlistCompanyView = {
  id: string
  name: string
  careersUrl: string | null
  alertsOn: boolean
  // resolved: found on an ATS and being polled; pending: still resolving;
  // unresolved: not on any ATS (would need scraping — see docs).
  resolutionStatus: string
  // Where the user is on building referral contacts here (none/active/warm)
  // and any freeform notes (names, LinkedIn links, conversation history).
  networkingStage: string
  networkingNotes: string | null
  roles: WatchlistRole[]
}

type CreateInput = { name: string; careersUrl?: string; alertsOn?: boolean }
type UpdateInput = {
  name?: string
  careersUrl?: string
  alertsOn?: boolean
  networkingStage?: string
  networkingNotes?: string
}

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolution: CompanyResolutionService,
    private readonly ingestion: JobIngestionService,
    private readonly matching: JobMatchingService,
  ) {}

  async list(userId: string): Promise<WatchlistCompanyView[]> {
    const [companies, rolesByCompany] = await Promise.all([
      this.prisma.watchlistCompany.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.rolesByCompanyKey(userId),
    ])
    return companies.map((company) => this.toView(company, rolesByCompany))
  }

  private async hiringRegions(userId: string): Promise<string[]> {
    const preferences = await this.prisma.watchlistPreferences.findUnique({
      where: { userId },
      select: { hiringRegions: true },
    })
    return preferences?.hiringRegions ?? []
  }

  async add(userId: string, input: CreateInput): Promise<WatchlistCompanyView> {
    const nameKey = companyKey(input.name)
    if (!nameKey) {
      throw new ConflictException('Company name is empty')
    }
    const existing = await this.prisma.watchlistCompany.findUnique({
      where: { userId_nameKey: { userId, nameKey } },
    })
    if (existing) {
      throw new ConflictException('This company is already on your watchlist')
    }
    const company = await this.prisma.watchlistCompany.create({
      data: {
        userId,
        name: input.name.trim(),
        nameKey,
        careersUrl: input.careersUrl?.trim() || null,
        alertsOn: input.alertsOn ?? true,
        resolutionStatus: 'pending',
      },
    })
    await this.resolveAndBackfill(userId, company)
    return this.getView(userId, company.id)
  }

  async update(userId: string, id: string, input: UpdateInput): Promise<WatchlistCompanyView> {
    const company = await this.ownedCompany(userId, id)
    const nextName = input.name?.trim()
    const nameChanged = nextName !== undefined && nextName !== company.name
    const urlChanged = input.careersUrl !== undefined && input.careersUrl.trim() !== company.careersUrl

    if (nameChanged) {
      const nextKey = companyKey(nextName)
      const clash = await this.prisma.watchlistCompany.findUnique({
        where: { userId_nameKey: { userId, nameKey: nextKey } },
      })
      if (clash && clash.id !== id) {
        throw new ConflictException('This company is already on your watchlist')
      }
    }

    const updated = await this.prisma.watchlistCompany.update({
      where: { id },
      data: {
        ...(nextName !== undefined ? { name: nextName, nameKey: companyKey(nextName) } : {}),
        ...(input.careersUrl !== undefined ? { careersUrl: input.careersUrl.trim() || null } : {}),
        ...(input.alertsOn !== undefined ? { alertsOn: input.alertsOn } : {}),
        ...(input.networkingStage !== undefined ? { networkingStage: input.networkingStage } : {}),
        ...(input.networkingNotes !== undefined
          ? { networkingNotes: input.networkingNotes.trim() || null }
          : {}),
      },
    })

    // A changed identity (or a company we never resolved) is worth another
    // resolution attempt.
    if ((nameChanged || urlChanged) && updated.resolutionStatus !== 'resolved') {
      await this.resolveAndBackfill(userId, updated)
    }
    return this.getView(userId, id)
  }

  // Re-attempt resolution on demand (e.g. after a new ATS provider ships, a
  // company that was "unresolved" may now be found). No-op for a company that
  // already resolved — its jobs are already flowing.
  async resolve(userId: string, id: string): Promise<WatchlistCompanyView> {
    const company = await this.ownedCompany(userId, id)
    if (company.resolutionStatus !== 'resolved') {
      await this.resolveAndBackfill(userId, company)
    }
    return this.getView(userId, id)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ownedCompany(userId, id)
    await this.prisma.watchlistCompany.delete({ where: { id } })
    // Listings and the job-board feed are intentionally left untouched: the
    // source simply stops being polled once nobody watches it.
  }

  // Resolve to an ATS board, pull it now so roles show immediately, and attach
  // matches to this user. Failures downgrade the company to "unresolved"
  // rather than failing the request.
  private async resolveAndBackfill(userId: string, company: WatchlistCompany): Promise<void> {
    let source
    try {
      source = await this.resolution.resolveToSource(company.name, company.careersUrl)
    } catch (error) {
      this.logger.warn(`Resolve failed for "${company.name}": ${String(error)}`)
      await this.prisma.watchlistCompany.update({
        where: { id: company.id },
        data: { jobSourceId: null, resolutionStatus: 'unresolved' },
      })
      return
    }
    if (!source) {
      await this.prisma.watchlistCompany.update({
        where: { id: company.id },
        data: { jobSourceId: null, resolutionStatus: 'unresolved' },
      })
      return
    }
    await this.prisma.watchlistCompany.update({
      where: { id: company.id },
      data: { jobSourceId: source.id, resolutionStatus: 'resolved' },
    })
    // Resolved once the source is linked. A failure pulling jobs or rematching
    // now (rate limit, transient upstream error) must NOT downgrade it back to
    // "unresolved" — the hourly cron will retry the pull.
    try {
      await this.ingestion.syncOneSource(source)
      await this.matching.rematchUser(userId)
    } catch (error) {
      this.logger.warn(
        `Initial backfill failed for "${company.name}" (will retry on next poll): ${String(error)}`,
      )
    }
  }

  private async getView(userId: string, id: string): Promise<WatchlistCompanyView> {
    const [company, rolesByCompany] = await Promise.all([
      this.prisma.watchlistCompany.findFirst({ where: { id, userId } }),
      this.rolesByCompanyKey(userId),
    ])
    if (!company) {
      throw new NotFoundException('Watchlist company not found')
    }
    return this.toView(company, rolesByCompany)
  }

  private async ownedCompany(userId: string, id: string): Promise<WatchlistCompany> {
    const company = await this.prisma.watchlistCompany.findFirst({ where: { id, userId } })
    if (!company) {
      throw new NotFoundException('Watchlist company not found')
    }
    return company
  }

  // The live matched roles the user has, bucketed by company key, so each
  // watchlist company can show its own openings. Same-opening postings (one
  // role listed in several countries) are folded into a single row; openings
  // the user has already logged an application for drop off entirely (they
  // live on Pipeline / All applications now).
  private async rolesByCompanyKey(userId: string): Promise<Map<string, WatchlistRole[]>> {
    const [rows, appliedListingIds, hiringRegions] = await Promise.all([
      this.prisma.userJobListing.findMany({
        where: { userId, status: { not: 'dismissed' } },
        include: { listing: true },
        orderBy: { listing: { firstSeenAt: 'desc' } },
      }),
      this.appliedListingIds(userId),
      this.hiringRegions(userId),
    ])

    const byKey = new Map<string, RawRole[]>()
    for (const row of rows) {
      const key = companyKey(row.listing.companyName)
      const role: RawRole = {
        id: row.listing.id,
        title: row.listing.title,
        url: row.listing.url,
        location: row.listing.location,
        locations: row.listing.locations,
        workMode: row.listing.workMode,
        contentLanguage: row.listing.contentLanguage,
        postedAt: row.listing.postedAt,
        firstSeenAt: row.listing.firstSeenAt,
        matchedKeywords: row.matchedKeywords,
        companyName: row.listing.companyName,
      }
      const bucket = byKey.get(key)
      if (bucket) bucket.push(role)
      else byKey.set(key, [role])
    }

    const result = new Map<string, WatchlistRole[]>()
    for (const [key, raws] of byKey) {
      result.set(key, foldOpenings(raws, hiringRegions, appliedListingIds))
    }
    return result
  }

  // Listing ids the user has already logged an application for, so those
  // postings stop showing as open roles on the watchlist.
  private async appliedListingIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.application.findMany({
      where: { userId, listingId: { not: null } },
      select: { listingId: true },
    })
    return new Set(rows.map((row) => row.listingId).filter((id): id is string => id !== null))
  }

  private toView(
    company: WatchlistCompany,
    rolesByCompany: Map<string, WatchlistRole[]>,
  ): WatchlistCompanyView {
    return {
      id: company.id,
      name: company.name,
      careersUrl: company.careersUrl,
      alertsOn: company.alertsOn,
      resolutionStatus: company.resolutionStatus,
      networkingStage: company.networkingStage,
      networkingNotes: company.networkingNotes,
      roles: rolesByCompany.get(company.nameKey) ?? [],
    }
  }
}
