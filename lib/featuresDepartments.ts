// Features sections and semesters: pure helpers shared by the server loader
// (lib/featuresIndex.ts) and the browser (components/Features/FeaturesBrowse).
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
  { key: 'campus', name: 'Around Campus', summary: 'Events, clubs and student life' },
  { key: 'arts', name: 'Arts & Troy', summary: 'EMPAC, the stage, food and downtown' },
  { key: 'people', name: 'People', summary: 'Profiles, interviews and alumni' },
  { key: 'photo', name: 'Photo Stories', summary: 'Galleries and photo essays' },
]

/** Lowercase letters only: "On-Campus Event" → "oncampusevent" */
export const normalizeKicker = (kicker: string | null | undefined): string =>
  (kicker ?? '').toLowerCase().replace(/[^a-z]/g, '')

const CAMPUS = new Set([
  'oncampus',
  'campus',
  'campuslife',
  'oncampusevent',
  'campusevent',
  'campusevents',
  'event',
  'events',
  'studentlife',
  'clubs',
  'greeklife',
  'tradition',
  'traditions',
])
/** Kickers that carry a year or a name after a fixed start ("GM Week 2026") */
const CAMPUS_PREFIXES = ['gmweek', 'grandmarshal', 'homecoming', 'winterweek', 'springfest']

const ARTS = new Set([
  'thearts',
  'arts',
  'art',
  'music',
  'theater',
  'theatre',
  'film',
  'dance',
  'empac',
  'foodreview',
  'food',
  'review',
  'troy',
  'downtowntroy',
  'collarcitycolumn',
  'concert',
  'exhibit',
  'exhibition',
])

const PEOPLE = new Set(['profile', 'profiles', 'interview', 'alumni', 'alumnus', 'qa', 'qanda'])

/** The section a kicker puts a story in, or null when it fits none */
export function departmentOf(kicker: string | null | undefined): FeaturesDepartmentKey | null {
  const n = normalizeKicker(kicker)
  if (!n) return null
  // A format label wins: "Photo Short Story", "Photo Essay", "Photos"
  if (n.includes('photo')) return 'photo'
  if (CAMPUS.has(n) || CAMPUS_PREFIXES.some((p) => n.startsWith(p))) return 'campus'
  if (ARTS.has(n)) return 'arts'
  if (PEOPLE.has(n)) return 'people'
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
