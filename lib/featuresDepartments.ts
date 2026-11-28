// Features sections: which section a story's kicker puts it in, for the
// Features page (lib/featuresFront, components/Features/FeaturesFront), the
// archive filter and the layout editor.
//
// Features kickers are free text and messy ("On-Campus Event", "EMPAC",
// "GM Week 2026", "Photo Short Story"), so a story's section comes from its
// kicker. A story whose kicker matches no section is never shown under a
// section's name; it still appears in the cover and under "All" in the index.
export type FeaturesDepartmentKey = 'campus' | 'arts' | 'people' | 'photo'

export type FeaturesDepartment = {
  key: FeaturesDepartmentKey
  name: string
}

export const FEATURES_DEPARTMENTS: readonly FeaturesDepartment[] = [
  { key: 'campus', name: 'Campus Life' },
  { key: 'arts', name: 'Arts & Culture' },
  { key: 'people', name: 'People' },
  { key: 'photo', name: 'Photo Short Stories' },
]

/** Lowercase letters only: "On-Campus Event" → "oncampusevent" */
export const normalizeKicker = (kicker: string | null | undefined): string =>
  (kicker ?? '').toLowerCase().replace(/[^a-z]/g, '')

/*
 * Each section is a list of whole kickers plus parts a kicker may contain, so
 * the variants staff actually type sort without listing each one: "ALBUM
 * REVIEW", "Empac Event", "Club Spotlight", "Entrepeneurship". Checked in the
 * order of `departmentOf`: Arts before People before Campus Life, so
 * "Empac Event" and "Off-Campus Event" are Arts and "Club Spotlight" is
 * People, though they also contain "event" or "club". Short words are whole
 * kickers only, so "art" can't match "party".
 */
type Rules = { whole: ReadonlySet<string>; parts: readonly string[] }

const ARTS: Rules = {
  whole: new Set([
    'art', 'arts', 'thearts', 'music', 'film', 'dance', 'food', 'troy', 'beer', 'culture',
    'concert', 'theater', 'theatre', 'exhibit', 'exhibition', 'podcast', 'tvshow', 'tvseries', 'local',
  ]),
  parts: [
    'review', // album, movie, game, TV, book, restaurant, concert, event…
    'recommendation',
    'empac',
    'restaurant',
    'downtowntroy',
    'offcampus',
    'locale', // Lesser-Known Locales
    'collarcity',
    'wordsto', // Words to Eat By, Words to Drink By
    'literary',
    'cultural',
    'performance',
    'fashion',
    'comics',
  ],
}

const PEOPLE: Rules = {
  whole: new Set(['profile', 'profiles', 'interview', 'interviews', 'alumni', 'alumnus', 'qa', 'qanda', 'rcos']),
  parts: ['spotlight', 'interview', 'profile', 'entrepren', 'entrepen', 'enterpren', 'guestspeaker'],
}

const CAMPUS: Rules = {
  whole: new Set(['oncampus', 'campus', 'tradition', 'traditions', 'holiday', 'springbreak', 'studenttips']),
  parts: ['event', 'campus', 'club', 'studentlife', 'greeklife', 'union'],
}
/** Kickers that carry a year or a name after a fixed start ("GM Week 2026") */
const CAMPUS_PREFIXES = ['gmweek', 'grandmarshal', 'homecoming', 'winterweek', 'springfest']

const matches = (n: string, rules: Rules) => rules.whole.has(n) || rules.parts.some((p) => n.includes(p))

/** The section a kicker puts a story in, or null when it fits none */
export function departmentOf(kicker: string | null | undefined): FeaturesDepartmentKey | null {
  const n = normalizeKicker(kicker)
  if (!n) return null
  // A format label wins: "Photo Short Story", "Photo Essay", "Photos"
  if (n.includes('photo')) return 'photo'
  if (matches(n, ARTS)) return 'arts'
  if (matches(n, PEOPLE)) return 'people'
  if (matches(n, CAMPUS) || CAMPUS_PREFIXES.some((p) => n.startsWith(p))) return 'campus'
  return null
}
