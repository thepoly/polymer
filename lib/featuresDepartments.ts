// Features sections and semesters: pure helpers for the Features page
// (components/Features/FeaturesFront) and the archive filter.
//
// Features kickers are free text and messy ("On-Campus Event", "EMPAC",
// "GM Week 2026", "Photo Short Story"), so a story's section comes from its
// kicker. A story whose kicker matches no section is never shown under a
// section's name; it still appears in the cover and under "All" in the index.
import { TROY_TIME_ZONE } from './troyTime'

export type FeaturesDepartmentKey = 'campus' | 'arts' | 'people' | 'photo'

export type FeaturesDepartment = {
  key: FeaturesDepartmentKey
  name: string
  /** One line beside the name in the section list */
  summary: string
}

export const FEATURES_DEPARTMENTS: readonly FeaturesDepartment[] = [
  { key: 'campus', name: 'Campus Life', summary: 'Events, clubs and student life' },
  { key: 'arts', name: 'Arts & Culture', summary: 'EMPAC, reviews, food and downtown Troy' },
  { key: 'people', name: 'People', summary: 'Profiles, interviews and spotlights' },
  { key: 'photo', name: 'Photo Short Stories', summary: 'Stories told in photos' },
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
  parts: ['spotlight', 'highlight', 'interview', 'profile', 'entrepren', 'entrepen', 'enterpren', 'guestspeaker'],
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

const monthYear = new Intl.DateTimeFormat('en-US', { timeZone: TROY_TIME_ZONE, year: 'numeric', month: 'numeric' })

/**
 * The semester a date falls in, in Troy: August to December is Fall,
 * January to July is Spring (the summer folds into the spring before it,
 * since Features runs almost nothing then). Keys sort newest first as strings.
 */
export function semesterOf(iso: string | null | undefined): { key: string; label: string } | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = monthYear.formatToParts(date)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  if (!year || !month) return null
  const fall = month >= 8
  return { key: `${year}-${fall ? 2 : 1}`, label: `${fall ? 'Fall' : 'Spring'} ${year}` }
}
