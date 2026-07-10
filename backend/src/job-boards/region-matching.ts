import { normalizeForIdentity } from './normalized-job'

// EU member states; "EU" as a hiring region accepts any of them plus the
// generic Europe/EMEA phrasings companies use on postings.
const EU_COUNTRIES = [
  'austria',
  'belgium',
  'bulgaria',
  'croatia',
  'cyprus',
  'czech republic',
  'czechia',
  'denmark',
  'estonia',
  'finland',
  'france',
  'germany',
  'greece',
  'hungary',
  'ireland',
  'italy',
  'latvia',
  'lithuania',
  'luxembourg',
  'malta',
  'netherlands',
  'poland',
  'portugal',
  'romania',
  'slovakia',
  'slovenia',
  'spain',
  'sweden',
]

// Cities matter because many postings only name a city ("Berlin Office").
const REGION_TOKENS: Record<string, string[]> = {
  eu: ['eu', 'european union', 'europe', 'emea', ...EU_COUNTRIES],
  germany: [
    'germany',
    'deutschland',
    'berlin',
    'munich',
    'munchen',
    'hamburg',
    'cologne',
    'koln',
    'frankfurt',
    'stuttgart',
    'dusseldorf',
    'leipzig',
    'dresden',
    'hannover',
    'nuremberg',
    'nurnberg',
    'karlsruhe',
  ],
  poland: [
    'poland',
    'polska',
    'warsaw',
    'warszawa',
    'krakow',
    'cracow',
    'wroclaw',
    'gdansk',
    'gdynia',
    'poznan',
    'lodz',
    'katowice',
    'szczecin',
    'bialystok',
    'lublin',
  ],
}

// A region the map does not know (say the user adds "Spain") still works as
// its own literal token.
function tokensForRegion(region: string): string[] {
  const key = normalizeForIdentity(region)
  return REGION_TOKENS[key] ?? (key ? [key] : [])
}

function containsToken(normalizedLocation: string, token: string): boolean {
  return ` ${normalizedLocation} `.includes(` ${token} `)
}

// A listing is region-eligible when one of its location strings names a
// selected region — this covers "Berlin", "Remote, Germany", and US-based
// postings that explicitly state EU hiring ("Remote (US) / Europe"). Postings
// whose locations carry no selected-region signal (e.g. plain "San Francisco"
// or a bare "Remote") are excluded: hiring elsewhere must be stated, not
// assumed. Listings with no location data at all are kept — unknown is not
// the same as elsewhere.
export function matchesHiringRegions(locations: string[], hiringRegions: string[]): boolean {
  if (!hiringRegions.length) {
    return true
  }
  const normalizedLocations = locations.map(normalizeForIdentity).filter(Boolean)
  if (!normalizedLocations.length) {
    return true
  }
  const tokens = hiringRegions.flatMap(tokensForRegion)
  return normalizedLocations.some((location) =>
    tokens.some((token) => containsToken(location, token)),
  )
}

// Unknown work mode is kept; a stated mode must be one the user selected.
export function matchesWorkModes(workMode: string | null, workModes: string[]): boolean {
  if (!workModes.length || !workMode) {
    return true
  }
  return workModes.some((mode) => normalizeForIdentity(mode) === normalizeForIdentity(workMode))
}
