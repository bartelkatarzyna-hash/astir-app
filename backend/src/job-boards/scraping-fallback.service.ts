import { Injectable } from '@nestjs/common'
import { WatchlistCompany } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

// ─────────────────────────────────────────────────────────────────────────
// STUB — NOT YET IMPLEMENTED. Extension point for companies a user watches
// that resolve to no ATS board (resolutionStatus === 'unresolved').
//
// Intended approach, cheapest first:
//   1. Fetch the company's careers URL and sniff for an embedded ATS we
//      already support (Greenhouse/Ashby/Workable iframes and script tags
//      expose the board token) — if found, this is really a resolution win,
//      not a scrape, and should feed back into CompanyResolutionService.
//   2. Detect other known ATS embeds we don't yet have a provider for
//      (Lever, Workday, SmartRecruiters, Personio) and add providers for them
//      — most expose a JSON endpoint, so they become ATS providers, not
//      scrapes.
//   3. Only when none of the above match, fall back to HTML scraping of the
//      careers page (headless browser + per-site parsers). This is the
//      expensive, brittle path and is deliberately last.
//
// Whatever a scrape yields must be mapped to NormalizedJob and go through the
// same upsert + matching pipeline as every provider, so the rest of the
// system does not need to know a listing came from a scrape.
// ─────────────────────────────────────────────────────────────────────────
@Injectable()
export class ScrapingFallbackService {
  constructor(private readonly prisma: PrismaService) {}

  // The work list for the above: companies on someone's watchlist that no ATS
  // could resolve. Exposed now so the tracking is real even though the
  // scraper is not built yet.
  listUnresolvedCompanies(): Promise<WatchlistCompany[]> {
    return this.prisma.watchlistCompany.findMany({
      where: { resolutionStatus: 'unresolved' },
    })
  }
}
