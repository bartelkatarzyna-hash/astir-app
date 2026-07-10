import { PrismaService } from '../database/prisma.service'
import { JobMatchingService } from './job-matching.service'
import { matchesHiringRegions, matchesWorkModes } from './region-matching'

describe('matchesHiringRegions', () => {
  const regions = ['Poland', 'Germany', 'EU']

  it('accepts postings located in a selected region', () => {
    expect(matchesHiringRegions(['Berlin Office'], regions)).toBe(true)
    expect(matchesHiringRegions(['Warsaw, Poland'], regions)).toBe(true)
    expect(matchesHiringRegions(['Remote, Italy'], regions)).toBe(true)
    expect(matchesHiringRegions(['Remote - EMEA'], regions)).toBe(true)
  })

  it('accepts US-based postings only when EU hiring is stated', () => {
    expect(matchesHiringRegions(['Remote (US)', 'Europe'], regions)).toBe(true)
    expect(matchesHiringRegions(['San Francisco'], regions)).toBe(false)
    expect(matchesHiringRegions(['Remote (US)', 'New York, NY'], regions)).toBe(false)
  })

  it('excludes a bare Remote with no stated region', () => {
    expect(matchesHiringRegions(['Remote'], regions)).toBe(false)
  })

  it('keeps postings with no location data and users with no regions', () => {
    expect(matchesHiringRegions([], regions)).toBe(true)
    expect(matchesHiringRegions(['San Francisco'], [])).toBe(true)
  })

  it('treats an unknown region name as a literal token', () => {
    expect(matchesHiringRegions(['Zurich, Switzerland'], ['Switzerland'])).toBe(true)
  })
})

describe('matchesWorkModes', () => {
  it('respects a deselected mode and keeps unknown modes', () => {
    expect(matchesWorkModes('Hybrid', ['Remote', 'On-Site'])).toBe(false)
    expect(matchesWorkModes('Remote', ['Remote', 'On-Site'])).toBe(true)
    expect(matchesWorkModes(null, ['Remote'])).toBe(true)
    expect(matchesWorkModes('Hybrid', [])).toBe(true)
  })
})

describe('JobMatchingService.computeMatches', () => {
  const service = new JobMatchingService(undefined as unknown as PrismaService)
  const preferences = {
    keywords: ['Product Manager'],
    workModes: ['Remote', 'On-Site'],
    hiringRegions: ['Poland', 'Germany', 'EU'],
  }
  const listing = {
    id: 'l1',
    title: 'Senior Product Manager, Growth',
    location: 'Berlin',
    locations: ['Berlin'],
    workMode: 'Remote' as string | null,
  }

  it('matches on keyword, work mode, and region together', () => {
    expect(service.computeMatches(preferences, [listing])).toEqual([
      { listingId: 'l1', matchedKeywords: ['Product Manager'] },
    ])
  })

  it('rejects a keyword hit in a deselected work mode', () => {
    expect(service.computeMatches(preferences, [{ ...listing, workMode: 'Hybrid' }])).toEqual([])
  })

  it('rejects a keyword hit outside the hiring regions', () => {
    expect(
      service.computeMatches(preferences, [
        { ...listing, location: 'San Francisco', locations: ['San Francisco'] },
      ]),
    ).toEqual([])
  })

  it('rejects title words that only partially overlap a keyword', () => {
    expect(
      service.computeMatches(preferences, [{ ...listing, title: 'Product Management Intern' }]),
    ).toEqual([])
  })
})
