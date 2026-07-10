import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { companyKey } from './normalized-job'

export type JobBoardListing = {
  id: string
  title: string
  companyName: string
  location: string | null
  workMode: string | null
  url: string
  postedAt: Date | null
  firstSeenAt: Date
  providers: string[]
  matchedKeywords: string[]
  status: string
}

// Postings older than this drop off the board: aggregators keep echoing
// long-open reqs (a still-listed role posted over a year ago), and those read
// as stale noise next to fresh openings. A posting with no known date is kept
// — several ATS providers (Personio, Workday, the JobPosting reader) expose no
// posting date, and "unknown age" is not the same as "old".
const MAX_LISTING_AGE_DAYS = 90

@Injectable()
export class JobBoardsService {
  constructor(private readonly prisma: PrismaService) {}

  // The Watchlist takes precedence over the Job Board: a listing drops off the
  // board once its company is on the user's watchlist (its openings show there
  // instead) or the user has logged an application for it (it lives on Pipeline
  // / All applications now). Mirrors how WatchlistView hides applied roles.
  async listForUser(userId: string): Promise<JobBoardListing[]> {
    const cutoff = new Date(Date.now() - MAX_LISTING_AGE_DAYS * 24 * 60 * 60 * 1000)
    const [rows, watchlistKeys, appliedListingIds] = await Promise.all([
      this.prisma.userJobListing.findMany({
        where: {
          userId,
          status: { not: 'dismissed' },
          // Keep fresh postings and undated ones; drop anything demonstrably old.
          listing: { OR: [{ postedAt: null }, { postedAt: { gte: cutoff } }] },
        },
        include: {
          listing: {
            include: { sources: { select: { provider: true } } },
          },
        },
      }),
      this.watchlistCompanyKeys(userId),
      this.appliedListingIds(userId),
    ])
    return rows
      .filter(
        (row) =>
          !appliedListingIds.has(row.listing.id) &&
          !watchlistKeys.has(companyKey(row.listing.companyName)),
      )
      .map((row) => ({
        id: row.listing.id,
        title: row.listing.title,
        companyName: row.listing.companyName,
        location: row.listing.location,
        workMode: row.listing.workMode,
        url: row.listing.url,
        postedAt: row.listing.postedAt,
        firstSeenAt: row.listing.firstSeenAt,
        providers: [...new Set(row.listing.sources.map((source) => source.provider))],
        matchedKeywords: row.matchedKeywords,
        status: row.status,
      }))
      // Newest first by real posting date; undated postings fall back to when
      // we first saw them, so a just-ingested but ancient aggregator req can't
      // masquerade as fresh at the top of the feed.
      .sort((a, b) => this.effectiveDate(b) - this.effectiveDate(a))
  }

  private effectiveDate(listing: JobBoardListing): number {
    return (listing.postedAt ?? listing.firstSeenAt).getTime()
  }

  // Normalized company keys of everything on the user's watchlist, so their
  // openings surface on the Watchlist rather than the Job Board.
  private async watchlistCompanyKeys(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.watchlistCompany.findMany({
      where: { userId },
      select: { nameKey: true },
    })
    return new Set(rows.map((row) => row.nameKey))
  }

  // Listing ids the user has already logged an application for, so those drop
  // off the Job Board (they live on Pipeline / All applications now).
  private async appliedListingIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.application.findMany({
      where: { userId, listingId: { not: null } },
      select: { listingId: true },
    })
    return new Set(rows.map((row) => row.listingId).filter((id): id is string => id !== null))
  }
}
