import { PrismaService } from '../database/prisma.service'
import { JobBoardsService } from './job-boards.service'
import { companyKey } from './normalized-job'

type Row = {
  listing: {
    id: string
    title: string
    companyName: string
    location: string | null
    workMode: string | null
    url: string
    postedAt: Date | null
    firstSeenAt: Date
    sources: Array<{ provider: string }>
  }
  matchedKeywords: string[]
  status: string
}

function row(
  id: string,
  companyName: string,
  dates: { postedAt?: string | null; firstSeenAt?: string } = {},
): Row {
  return {
    listing: {
      id,
      title: 'Senior Product Manager',
      companyName,
      location: 'Berlin, DE',
      workMode: 'Remote',
      url: `https://example.com/${id}`,
      postedAt: dates.postedAt ? new Date(dates.postedAt) : null,
      firstSeenAt: new Date(dates.firstSeenAt ?? '2026-07-01T00:00:00Z'),
      sources: [{ provider: 'arbeitnow' }],
    },
    matchedKeywords: ['Product Manager'],
    status: 'new',
  }
}

function makeService(options: {
  rows: Row[]
  watchlist?: string[]
  appliedListingIds?: string[]
}): JobBoardsService {
  const prisma = {
    userJobListing: { findMany: jest.fn().mockResolvedValue(options.rows) },
    watchlistCompany: {
      findMany: jest
        .fn()
        .mockResolvedValue((options.watchlist ?? []).map((name) => ({ nameKey: companyKey(name) }))),
    },
    application: {
      findMany: jest
        .fn()
        .mockResolvedValue((options.appliedListingIds ?? []).map((listingId) => ({ listingId }))),
    },
  } as unknown as PrismaService
  return new JobBoardsService(prisma)
}

describe('JobBoardsService.listForUser exclusions', () => {
  it('returns listings not on the watchlist or in applications', async () => {
    const service = makeService({ rows: [row('a', 'Acme'), row('b', 'Globex')] })
    const listings = await service.listForUser('u1')
    expect(listings.map((listing) => listing.id)).toEqual(['a', 'b'])
  })

  it('hides a listing whose company is on the watchlist (watchlist takes precedence)', async () => {
    const service = makeService({
      rows: [row('a', 'Resourcify'), row('b', 'Globex')],
      // Watchlist stores a different casing/spacing; matching is by companyKey.
      watchlist: ['  resourcify '],
    })
    const listings = await service.listForUser('u1')
    expect(listings.map((listing) => listing.id)).toEqual(['b'])
  })

  it('hides a listing the user has logged an application for', async () => {
    const service = makeService({
      rows: [row('a', 'Acme'), row('b', 'Globex')],
      appliedListingIds: ['b'],
    })
    const listings = await service.listForUser('u1')
    expect(listings.map((listing) => listing.id)).toEqual(['a'])
  })

  it('orders newest-first by posting date, undated listings falling back to first-seen', async () => {
    const service = makeService({
      rows: [
        row('old', 'Acme', { postedAt: '2026-06-01T00:00:00Z' }),
        row('new', 'Globex', { postedAt: '2026-07-05T00:00:00Z' }),
        // No posting date -> ranked by when we first saw it (2026-07-08).
        row('undated', 'Initech', { postedAt: null, firstSeenAt: '2026-07-08T00:00:00Z' }),
      ],
    })
    const listings = await service.listForUser('u1')
    expect(listings.map((listing) => listing.id)).toEqual(['undated', 'new', 'old'])
  })
})
