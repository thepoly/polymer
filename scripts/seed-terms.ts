/**
 * Seed Student Senate and Executive Board terms (GM Week to GM Week) with
 * the leaders verified so far. Safe to re-run: terms are matched by slug, and
 * existing ones only get blanks filled in (leaders when there are none, a
 * leader's number when it's missing), so edits made in the admin are kept.
 *
 * First-meeting dates are placeholders (April 1) except where a source gives
 * the date; correct them in the admin (Student Gov Terms) as the archive's
 * "first meeting" stories turn up.
 *
 * Usage: pnpm db:seed:terms
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { termSlug } from '../components/News/studentGovTerms'

type Leader = {
  name: string
  ordinal?: number
  how?: 'elected' | 'runoff' | 'appointed'
  startedOn?: string
}

type SeedTerm = {
  body: 'senate' | 'eboard'
  startYear: number
  number?: number
  /** First meeting; April 1 when unknown */
  startsOn?: string
  gmWeekOn?: string
  leaders?: Leader[]
}

const SENATE: SeedTerm[] = [
  {
    body: 'senate',
    startYear: 2026,
    number: 57,
    // GM Week 2026 results: poly.rpi.edu/news/2026/03/gm-week-2026-election-results
    gmWeekOn: '2026-03-27',
    leaders: [{ name: 'Jordan Krishnayah', ordinal: 160 }],
  },
  { body: 'senate', startYear: 2025, number: 56, leaders: [{ name: 'Tiburon Benavides', ordinal: 159 }] },
  // 2024: first GM tie in RPI history, decided in a runoff
  { body: 'senate', startYear: 2024, number: 55, leaders: [{ name: 'Vivian Rost-Nasshan', how: 'runoff' }] },
  { body: 'senate', startYear: 2023, number: 54 },
  { body: 'senate', startYear: 2022, number: 53 },
  { body: 'senate', startYear: 2021, number: 52 },
  { body: 'senate', startYear: 2020, number: 51 },
  { body: 'senate', startYear: 2019, number: 50 },
  { body: 'senate', startYear: 2018, number: 49 },
  { body: 'senate', startYear: 2017, number: 48 },
  {
    body: 'senate',
    startYear: 2016,
    number: 47,
    // poly.rpi.edu/news/2016/05/2016-05-04-new-leaders-voted-in-e-board-bylaws-reviewed
    startsOn: '2016-04-28',
    leaders: [{ name: 'Paul Ilori', ordinal: 151 }],
  },
  // Fifteen terms back, to the 43rd (2012–13). Numbers follow the same count
  // as the archive's "44th Student Senate" (April 2014). Before 2014–15 Senate
  // stories rarely carry the kicker; `pnpm db:seed:student-gov-archive` adds
  // the vetted ones filed elsewhere. Leads for leaders: "147th Grand Marshal
  // Dai bids farewell" (April 2013, the 43rd) and "Meet RPI's 149th Grand
  // Marshal" (August 2014, the 45th); first names still to find.
  { body: 'senate', startYear: 2015, number: 46 },
  { body: 'senate', startYear: 2014, number: 45 },
  { body: 'senate', startYear: 2013, number: 44 },
  { body: 'senate', startYear: 2012, number: 43 },
]

const EBOARD: SeedTerm[] = [
  {
    body: 'eboard',
    startYear: 2026,
    gmWeekOn: '2026-03-27',
    leaders: [{ name: 'Kate Goldstein', ordinal: 137 }],
  },
  // 136th by count between Philipps (135th) and Goldstein (137th)
  { body: 'eboard', startYear: 2025, leaders: [{ name: 'Isabele Lieber', ordinal: 136 }] },
  { body: 'eboard', startYear: 2024, leaders: [{ name: 'Catherine Philipps', ordinal: 135 }] },
  {
    body: 'eboard',
    startYear: 2023,
    // Gallagher resigned; Philipps appointed 135th PU (February 2024 archive;
    // the exact day is a placeholder)
    leaders: [
      { name: 'Ava Gallagher', ordinal: 134 },
      { name: 'Catherine Philipps', ordinal: 135, how: 'appointed', startedOn: '2024-02-01' },
    ],
  },
  // Fifteen years back (2012–13), like the Senate. Before 2014–15 nothing is
  // filed under the E-Board kicker; `pnpm db:seed:student-gov-archive` adds
  // the vetted stories filed elsewhere (mostly the PU's "Derby" column).
  //
  // Names from the RPI Archives' Grand Marshal and President of the Union list
  // (archives.rpi.edu/institute-history/grand-marshal-and-president-of-union-historical-list),
  // one PU a year. The list doesn't number them; these are stated in print:
  // Rand 128th (his 2017 column), Etzine 129th (signed so in 2018), Kennedy
  // 130th (sg.rpi.edu), Philipps 135th. The rest are by count between them,
  // which fits exactly from Kennedy to Philipps (Gallagher 134th), and back
  // from Rand. Sileo's first name per the Poly's April 2013 election photo
  // (the Archives list has "Gretchin").
  ...(
    [
      [2022, 'Colleen Corrigan', 133],
      [2021, 'Yaseen Mahmoud', 132],
      [2020, 'Anissa Choiniere', 131],
      [2019, 'Caitlin Kennedy', 130],
      [2018, 'Justin Etzine', 129],
      [2017, 'Matthew Rand', 128],
      [2016, 'Chip Kirchner', 127],
      [2015, 'Nick Dvorak', 126],
      [2014, 'Erin Amarello', 125],
      [2013, 'Gretchen Sileo', 124],
      [2012, 'John Stack', 123],
    ] as const
  ).map(
    ([startYear, name, ordinal]): SeedTerm => ({ body: 'eboard', startYear, leaders: [{ name, ordinal }] }),
  ),
]

const day = (d: string) => `${d}T12:00:00.000Z`

async function main() {
  const payload = await getPayload({ config })
  let created = 0
  let skipped = 0
  let filled = 0
  const placeholders: string[] = []

  for (const term of [...SENATE, ...EBOARD]) {
    const slug = termSlug(term.body, term.number ?? null, term.startYear)
    const existing = await payload.find({
      collection: 'student-gov-terms',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    const doc = existing.docs[0]
    if (doc) {
      // Already there: only fill in blanks (no leaders yet, or a leader of
      // the same name without a number); anything entered in the admin stays
      const seeded = term.leaders ?? []
      const current = doc.leaders ?? []
      let leaders: typeof current | null = null
      if (current.length === 0 && seeded.length > 0) {
        leaders = seeded.map((l) => ({
          name: l.name,
          ordinal: l.ordinal ?? null,
          how: l.how ?? 'elected',
          startedOn: l.startedOn ? day(l.startedOn) : null,
        }))
      } else if (current.some((l) => !l.ordinal && seeded.find((s) => s.name === l.name)?.ordinal)) {
        leaders = current.map((l) => ({
          ...l,
          ordinal: l.ordinal || seeded.find((s) => s.name === l.name)?.ordinal || null,
        }))
      }
      if (leaders) {
        await payload.update({ collection: 'student-gov-terms', id: doc.id, data: { leaders } })
        filled += 1
      } else {
        skipped += 1
      }
      continue
    }
    if (!term.startsOn) placeholders.push(slug)
    await payload.create({
      collection: 'student-gov-terms',
      data: {
        body: term.body,
        number: term.number ?? null,
        startsOn: day(term.startsOn ?? `${term.startYear}-04-01`),
        gmWeekOn: term.gmWeekOn ? day(term.gmWeekOn) : null,
        hasCoverage: true,
        leaders: (term.leaders ?? []).map((l) => ({
          name: l.name,
          ordinal: l.ordinal ?? null,
          how: l.how ?? 'elected',
          startedOn: l.startedOn ? day(l.startedOn) : null,
        })),
      },
    })
    created += 1
  }

  console.log(`Terms: ${created} created, ${filled} filled in, ${skipped} already there.`)
  if (placeholders.length > 0) {
    console.log(`First meeting set to April 1 (placeholder) for: ${placeholders.join(', ')}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
