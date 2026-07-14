import { companyHandleCandidates } from './job-board-provider'
import { AshbyProvider } from './ashby.provider'
import { GreenhouseProvider } from './greenhouse.provider'
import { JobPostingProvider } from './jobposting.provider'
import { JoinProvider } from './join.provider'
import { LeverProvider } from './lever.provider'
import { PersonioProvider } from './personio.provider'
import { RecruiteeProvider } from './recruitee.provider'
import { SmartRecruitersProvider } from './smartrecruiters.provider'
import { TeamtailorProvider } from './teamtailor.provider'
import { TraffitProvider } from './traffit.provider'
import { WorkableProvider } from './workable.provider'
import { WorkdayProvider } from './workday.provider'

describe('companyHandleCandidates', () => {
  it('leads with the collapsed lowercase name', () => {
    expect(companyHandleCandidates('HelloFresh')[0]).toBe('hellofresh')
    expect(companyHandleCandidates('N26')[0]).toBe('n26')
  })

  it('offers hyphenated and first-word forms for multi-word names', () => {
    expect(companyHandleCandidates('Get Your Guide')).toEqual([
      'getyourguide',
      'get-your-guide',
      'get',
    ])
  })

  it('strips legal/entity suffixes', () => {
    expect(companyHandleCandidates('Acme GmbH')).toEqual(['acme'])
    expect(companyHandleCandidates('Foo Labs')).toEqual(['foo'])
  })

  it('returns nothing for a nameless string', () => {
    expect(companyHandleCandidates('   ')).toEqual([])
  })
})

describe('handleFromUrl', () => {
  const greenhouse = new GreenhouseProvider()
  const ashby = new AshbyProvider()
  const workable = new WorkableProvider()
  const lever = new LeverProvider()
  const smartRecruiters = new SmartRecruitersProvider()
  const recruitee = new RecruiteeProvider()
  const teamtailor = new TeamtailorProvider()
  const personio = new PersonioProvider()
  const join = new JoinProvider()
  const workday = new WorkdayProvider()
  const traffit = new TraffitProvider()
  const jobPosting = new JobPostingProvider()

  it('extracts a Greenhouse board token from its URLs', () => {
    expect(greenhouse.handleFromUrl('https://boards.greenhouse.io/gitlab')).toBe('gitlab')
    expect(greenhouse.handleFromUrl('https://job-boards.greenhouse.io/gitlab/jobs/123')).toBe(
      'gitlab',
    )
    expect(greenhouse.handleFromUrl('https://gitlab.com/careers')).toBeNull()
  })

  it('extracts an Ashby job-board name', () => {
    expect(ashby.handleFromUrl('https://jobs.ashbyhq.com/linear/some-id')).toBe('linear')
    expect(ashby.handleFromUrl('https://api.ashbyhq.com/posting-api/job-board/ramp')).toBe('ramp')
  })

  it('extracts a Workable account but not a per-job link', () => {
    expect(workable.handleFromUrl('https://apply.workable.com/blueground/')).toBe('blueground')
    expect(workable.handleFromUrl('https://blueground.workable.com')).toBe('blueground')
    // Per-job links (/j/{code}) carry no account slug.
    expect(workable.handleFromUrl('https://apply.workable.com/j/38ABFA8E0D')).toBeNull()
  })

  it('extracts a Lever account from careers and per-job links', () => {
    expect(lever.handleFromUrl('https://jobs.lever.co/ro')).toBe('ro')
    expect(lever.handleFromUrl('https://jobs.lever.co/ro/bde27362-0652')).toBe('ro')
    expect(lever.handleFromUrl('https://ro.com/careers')).toBeNull()
  })

  it('extracts a SmartRecruiters company identifier', () => {
    expect(smartRecruiters.handleFromUrl('https://jobs.smartrecruiters.com/McDonaldsCorporation/744')).toBe(
      'mcdonaldscorporation',
    )
    expect(smartRecruiters.handleFromUrl('https://careers.smartrecruiters.com/Bosch')).toBe('bosch')
  })

  it('extracts a Recruitee subdomain but not www', () => {
    expect(recruitee.handleFromUrl('https://vacancies.recruitee.com/o/hseq-lead')).toBe('vacancies')
    expect(recruitee.handleFromUrl('https://www.recruitee.com/pricing')).toBeNull()
  })

  it('extracts a Teamtailor subdomain but not www', () => {
    expect(teamtailor.handleFromUrl('https://life.teamtailor.com/jobs/7969476-butikschef')).toBe('life')
    expect(teamtailor.handleFromUrl('https://www.teamtailor.com/pricing')).toBeNull()
  })

  it('extracts a Personio subdomain on either TLD but not www', () => {
    expect(personio.handleFromUrl('https://hometogo.jobs.personio.com/job/123')).toBe('hometogo')
    expect(personio.handleFromUrl('https://acme.jobs.personio.de/search')).toBe('acme')
    expect(personio.handleFromUrl('https://www.personio.com/pricing')).toBeNull()
  })

  it('extracts a Join board slug from careers and per-job links', () => {
    expect(join.handleFromUrl('https://join.com/companies/hellofresh')).toBe('hellofresh')
    expect(join.handleFromUrl('https://join.com/companies/join/16425272-vp-revenue')).toBe('join')
    expect(join.handleFromUrl('https://join.com/careers')).toBeNull()
  })

  it('packs a Workday careers URL into tenant:dc:site, dropping the locale', () => {
    expect(
      workday.handleFromUrl('https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/x'),
    ).toBe('nvidia:wd5:NVIDIAExternalCareerSite')
    // Without a locale segment the first path segment is the site.
    expect(workday.handleFromUrl('https://acme.wd3.myworkdayjobs.com/Careers')).toBe(
      'acme:wd3:Careers',
    )
    expect(workday.handleFromUrl('https://nvidia.wd5.myworkdayjobs.com')).toBeNull()
  })

  it('extracts a Traffit account subdomain but not the platform hosts', () => {
    expect(traffit.handleFromUrl('https://infer.traffit.com/public/an/abc?source=career_page')).toBe(
      'infer',
    )
    expect(traffit.handleFromUrl('https://infer.traffit.com/career')).toBe('infer')
    expect(traffit.handleFromUrl('https://www.traffit.com/pricing')).toBeNull()
    expect(traffit.handleFromUrl('https://api.traffit.com/')).toBeNull()
  })

  it('never claims a URL for the generic JobPosting reader', () => {
    expect(jobPosting.handleFromUrl()).toBeNull()
    expect(jobPosting.candidateHandles()).toEqual([])
  })

  it('does not cross-match another ATS host', () => {
    expect(greenhouse.handleFromUrl('https://jobs.ashbyhq.com/linear')).toBeNull()
    expect(ashby.handleFromUrl('https://boards.greenhouse.io/gitlab')).toBeNull()
    expect(lever.handleFromUrl('https://boards.greenhouse.io/gitlab')).toBeNull()
    expect(smartRecruiters.handleFromUrl('https://jobs.lever.co/ro')).toBeNull()
    expect(teamtailor.handleFromUrl('https://jobs.lever.co/ro')).toBeNull()
    expect(personio.handleFromUrl('https://jobs.lever.co/ro')).toBeNull()
    expect(join.handleFromUrl('https://jobs.lever.co/ro')).toBeNull()
    expect(workday.handleFromUrl('https://jobs.lever.co/ro')).toBeNull()
    expect(traffit.handleFromUrl('https://jobs.lever.co/ro')).toBeNull()
  })
})
