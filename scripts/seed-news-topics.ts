/**
 * Seed placeholder news articles for the topic row on /news (Administration,
 * Academia, Campus Infrastructure, Interview), seven per topic, so every
 * topic has six stories to show even after the stories placed higher up the
 * page are left out. Kickers come from each topic's list in
 * components/News/newsTopics.ts.
 *
 * Re-running is idempotent: articles are matched by slug. Run `pnpm db:seed`
 * first; it creates the news editor and fixture photos this script reuses.
 * Articles are backdated 3 to 15 weeks so they don't push this week's
 * stories off the top of the page.
 *
 * Usage: pnpm db:seed:news-topics
 */
import { getPayload } from 'payload'
import config from '../payload.config'

type RichTextNode = Record<string, unknown>

const richTextDoc = (paragraphs: string[]): RichTextNode => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [{ type: 'text', format: 0, mode: 'normal', style: '', text, version: 1 }],
    })),
  },
})

type SeedArticle = {
  slug: string
  title: string
  kicker: string
  subdeck: string
  writeIn?: string
  paragraphs: string[]
}

const ARTICLES: SeedArticle[] = [
  // ---- Administration ----
  {
    slug: 'topics-trustees-approve-tuition-increase',
    title: 'Trustees approve 3.5 percent tuition increase',
    kicker: 'Board of Trustees',
    subdeck: 'The increase is the smallest in five years, and financial aid will grow by the same percentage.',
    paragraphs: [
      'The Board of Trustees approved a 3.5 percent increase in tuition for next year at its fall meeting.',
      'Administrators said the institutional aid budget will grow by the same amount, so most students on aid should see little change.',
    ],
  },
  {
    slug: 'topics-housing-adds-gender-inclusive-floors',
    title: 'Housing adds two gender-inclusive floors for next year',
    kicker: 'Housing',
    subdeck: 'Students can request the floors during the spring housing lottery.',
    writeIn: 'Clara Whitfield',
    paragraphs: [
      'Residence Life will open two more gender-inclusive floors next year, bringing the total to six.',
      'The floors will be available to all class years through the regular housing lottery in February.',
    ],
  },
  {
    slug: 'topics-budget-office-explains-activity-fee',
    title: 'Where the student activity fee goes, line by line',
    kicker: 'Budget',
    subdeck: 'The budget office released its first itemized breakdown of the fee since 2019.',
    paragraphs: [
      'For the first time in several years, the budget office has published a line-by-line breakdown of the student activity fee.',
      'About 70 percent goes directly to clubs through the Executive Board; the rest covers Union operations and events.',
    ],
  },
  {
    slug: 'topics-public-safety-launches-escort-app',
    title: 'Public Safety launches app for late-night walking escorts',
    kicker: 'Public Safety',
    subdeck: 'Students can request an escort and track its arrival from their phones.',
    writeIn: 'Devin Morales',
    paragraphs: [
      'The Department of Public Safety has launched an app that lets students request a walking escort at night.',
      'Officers said response times averaged under eight minutes during a two-week trial in October.',
    ],
  },
  {
    slug: 'topics-dining-extends-weekend-hours',
    title: 'Dining extends weekend hours at two halls',
    kicker: 'Dining',
    subdeck: 'The change follows a semester of student complaints about early Sunday closings.',
    paragraphs: [
      'Two dining halls will stay open until 9 p.m. on weekends starting next month.',
      'Dining services said the extra hours are paid for by trimming underused weekday breakfast service.',
    ],
  },
  {
    slug: 'topics-finance-office-moves-refunds-online',
    title: 'Bursar moves refund requests online',
    kicker: 'Finance',
    subdeck: 'Paper forms will no longer be accepted after winter break.',
    paragraphs: [
      'Students will request tuition and fee refunds through the student portal starting in January.',
      'The bursar said online requests should cut processing time from three weeks to about five business days.',
    ],
  },
  {
    slug: 'topics-institute-names-new-provost',
    title: 'Institute names new provost after national search',
    kicker: 'Administration',
    subdeck: 'The new provost comes from a decade leading engineering programs at a large public university.',
    writeIn: 'Owen Gallagher',
    paragraphs: [
      'The Institute has named a new provost following a nine-month national search.',
      'The provost will start in July and said in a statement that undergraduate research will be an early priority.',
    ],
  },

  // ---- Academia ----
  {
    slug: 'topics-research-lab-wins-nsf-grant',
    title: 'Materials lab wins $2 million NSF grant',
    kicker: 'Research',
    subdeck: 'The grant funds five years of work on recyclable battery components.',
    paragraphs: [
      'A materials science lab has received a $2 million grant from the National Science Foundation.',
      'The project will fund graduate positions and summer research spots for undergraduates.',
    ],
  },
  {
    slug: 'topics-faculty-senate-pass-fail-policy',
    title: 'Faculty Senate expands pass/fail option for electives',
    kicker: 'Faculty Senate',
    subdeck: 'Students will be able to take two free electives pass/fail instead of one.',
    writeIn: 'Nadia Hassan',
    paragraphs: [
      'The Faculty Senate voted to let students take up to two free electives on a pass/fail basis.',
      'The change takes effect next fall and does not apply to courses required for a major.',
    ],
  },
  {
    slug: 'topics-curriculum-adds-ai-ethics-requirement',
    title: 'New curriculum adds an ethics course for computing majors',
    kicker: 'Curriculum',
    subdeck: 'The requirement applies to students entering in the fall.',
    paragraphs: [
      'Computing majors entering next fall will need to take a course on ethics and technology.',
      'Faculty said the course will be taught jointly by the computer science and philosophy departments.',
    ],
  },
  {
    slug: 'topics-library-launches-24-hour-study-room',
    title: 'Library opens a 24-hour study room',
    kicker: 'Library',
    subdeck: 'Card access will be required after midnight.',
    writeIn: 'Clara Whitfield',
    paragraphs: [
      'The library has converted a first-floor reading room into a study space open around the clock.',
      'Students will need to swipe their ID cards to enter between midnight and 7 a.m.',
    ],
  },
  {
    slug: 'topics-graduate-stipends-rise',
    title: 'Graduate stipends rise for the second year in a row',
    kicker: 'Graduate',
    subdeck: 'Doctoral students will see a 6 percent increase starting in January.',
    paragraphs: [
      'Doctoral stipends will rise by 6 percent in January, the graduate school announced.',
      'The increase follows a similar raise last year and a campaign by graduate students over housing costs.',
    ],
  },
  {
    slug: 'topics-faculty-hiring-cluster-climate',
    title: 'Institute plans faculty hiring cluster in climate science',
    kicker: 'Faculty',
    subdeck: 'Eight new positions will be spread across four schools.',
    paragraphs: [
      'The Institute will hire eight faculty members over three years in a cluster focused on climate science.',
      'Positions will be split across engineering, science, architecture and humanities.',
    ],
  },
  {
    slug: 'topics-academics-new-minor-in-data-journalism',
    title: 'New minor combines data science and journalism',
    kicker: 'Academics',
    subdeck: 'The minor opens to all majors next fall.',
    writeIn: 'Owen Gallagher',
    paragraphs: [
      'A new minor in data journalism will be offered starting next fall.',
      'Students will take courses in statistics, visualization and reporting, ending with a capstone project.',
    ],
  },

  // ---- Campus Infrastructure ----
  {
    slug: 'topics-construction-begins-on-new-dorm',
    title: 'Construction begins on new residence hall',
    kicker: 'Construction',
    subdeck: 'The 400-bed building is scheduled to open in fall 2028.',
    paragraphs: [
      'Crews broke ground this week on a 400-bed residence hall on the east side of campus.',
      'The building will include kitchens on every floor and a ground-floor study lounge.',
    ],
  },
  {
    slug: 'topics-parking-permit-prices-change',
    title: 'Parking permit prices to change next year',
    kicker: 'Parking',
    subdeck: 'Permits for lots closest to campus will cost more, while remote lots get cheaper.',
    writeIn: 'Devin Morales',
    paragraphs: [
      'Parking and Transportation will introduce tiered permit prices next year.',
      'The cheapest permits, for remote lots served by the shuttle, will drop by about 20 percent.',
    ],
  },
  {
    slug: 'topics-shuttle-adds-real-time-tracking',
    title: 'Campus shuttles get real-time tracking',
    kicker: 'Shuttle',
    subdeck: 'Riders can see where each bus is on a live map.',
    paragraphs: [
      'Every campus shuttle now reports its location to a live map on the transportation website.',
      'The office said the map should cut down on long waits at stops in the cold.',
    ],
  },
  {
    slug: 'topics-facilities-replaces-gym-roof',
    title: 'Facilities replaces leaking gym roof',
    kicker: 'Facilities',
    subdeck: 'Intramural games are moving to the field house until the work is done.',
    writeIn: 'Nadia Hassan',
    paragraphs: [
      'The roof over the main gym is being replaced after several leaks this fall.',
      'Facilities expects the work to take about six weeks, weather permitting.',
    ],
  },
  {
    slug: 'topics-transportation-bike-share-expands',
    title: 'Bike share adds four stations near residence halls',
    kicker: 'Transportation',
    subdeck: 'The expansion brings the system to 14 stations across campus.',
    paragraphs: [
      'The campus bike share program has added four stations near residence halls.',
      'Ridership doubled this semester, according to the transportation office.',
    ],
  },
  {
    slug: 'topics-infrastructure-solar-panels-on-union',
    title: 'Solar panels to cover the Union roof',
    kicker: 'Campus Infrastructure',
    subdeck: 'The array should supply about a fifth of the building\'s electricity.',
    paragraphs: [
      'Solar panels will be installed on the roof of the Rensselaer Union next summer.',
      'The project is paid for in part by a state clean energy grant.',
    ],
  },
  {
    slug: 'topics-infrastructure-accessible-entrances',
    title: 'Six academic buildings get accessible entrances',
    kicker: 'Campus Infrastructure',
    subdeck: 'Ramps and automatic doors are being added where entrances had only stairs.',
    writeIn: 'Clara Whitfield',
    paragraphs: [
      'Six academic buildings are getting new accessible entrances with ramps and automatic doors.',
      'The work is part of a multi-year plan to make every building on campus fully accessible.',
    ],
  },

  // ---- Interview ----
  {
    slug: 'topics-interview-president-of-the-union',
    title: 'President of the Union on the year ahead',
    kicker: 'Interview',
    subdeck: 'Club funding, the game room renovation and Union hours were all on the agenda.',
    paragraphs: [
      'The Poly spoke with the President of the Union about plans for the rest of the year.',
      'The PU said keeping the Union open later during exams is a top priority for the spring.',
    ],
  },
  {
    slug: 'topics-interview-head-of-it',
    title: 'Q&A: The head of IT on Wi-Fi, outages and passwords',
    kicker: 'Q&A',
    subdeck: 'The chief information officer answered student questions about last month\'s outage.',
    writeIn: 'Devin Morales',
    paragraphs: [
      'The chief information officer sat down with The Poly to talk about last month\'s campus-wide network outage.',
      'The CIO said a backup system is being added so a single failure can no longer take down the whole network.',
    ],
  },
  {
    slug: 'topics-interview-athletics-director',
    title: 'Athletics director on facilities and Title IX',
    kicker: 'Interview',
    subdeck: 'The director discussed plans for the field house and equal access to practice time.',
    paragraphs: [
      'The director of athletics spoke with The Poly about upcoming facility upgrades.',
      'The director said a new scheduling system is meant to give every team fair access to practice space.',
    ],
  },
  {
    slug: 'topics-interview-new-provost',
    title: 'Meet the new provost',
    kicker: 'Interview',
    subdeck: 'In their first interview with student media, the provost talked about research and teaching.',
    writeIn: 'Owen Gallagher',
    paragraphs: [
      'The incoming provost spoke with The Poly ahead of starting in July.',
      'The provost said expanding paid undergraduate research positions would be an early focus.',
    ],
  },
  {
    slug: 'topics-town-hall-on-parking',
    title: 'Parking town hall draws frustrated commuters',
    kicker: 'Town Hall',
    subdeck: 'Commuter students asked for more spaces and cheaper permits.',
    paragraphs: [
      'More than 100 students attended a town hall on parking in the Union ballroom.',
      'Officials said they would share a draft of the new permit structure before it is finalized.',
    ],
  },
  {
    slug: 'topics-interview-counseling-director',
    title: 'Counseling center director on shorter waits',
    kicker: 'Interviews',
    subdeck: 'Students should be able to see a counselor within a week by spring, the director said.',
    paragraphs: [
      'The director of the counseling center spoke with The Poly about wait times for appointments.',
      'New hires and a drop-in schedule should bring the wait for a first appointment under a week.',
    ],
  },
  {
    slug: 'topics-interview-sustainability-officer',
    title: 'Sustainability officer on the campus climate plan',
    kicker: 'Interview',
    subdeck: 'The Institute aims to cut building emissions in half by 2035.',
    writeIn: 'Nadia Hassan',
    paragraphs: [
      'The Institute\'s sustainability officer explained the new campus climate plan to The Poly.',
      'Most of the cuts will come from replacing the steam heating system over the next decade.',
    ],
  },
]

// Fixture photos uploaded by `pnpm db:seed`; alternated across articles.
const PHOTO_FILENAMES = ['campus-life.webp', 'schmidt.webp', 'swe-day.webp', 'winter-carnival.webp']

const DAY_MS = 24 * 60 * 60 * 1000

async function main() {
  const payload = await getPayload({ config })

  const newsEditor = await payload.find({
    collection: 'users',
    where: { email: { equals: 'news@dev.local' } },
    limit: 1,
    depth: 0,
  })
  const authorId = newsEditor.docs[0]?.id as number | undefined
  if (!authorId) {
    throw new Error('news@dev.local not found. Run `pnpm db:seed` first.')
  }

  const photoIds: number[] = []
  for (const filename of PHOTO_FILENAMES) {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    if (found.docs.length) photoIds.push(found.docs[0].id as number)
  }
  if (!photoIds.length) {
    throw new Error('No news fixture photos found. Run `pnpm db:seed` first.')
  }

  let created = 0
  for (const [i, a] of ARTICLES.entries()) {
    const existing = await payload.find({
      collection: 'articles',
      where: { slug: { equals: a.slug } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length) {
      console.log(`article exists: ${a.slug}`)
      continue
    }
    await payload.create({
      collection: 'articles',
      // legacyImport keeps the backdated publishedDate (the publish hook would
      // otherwise stamp now) and skips PostHog events and breaking-news pushes.
      context: { legacyImport: true },
      data: {
        section: 'news',
        // @ts-expect-error richText jsonb accepted directly by local API
        title: richTextDoc([a.title]),
        slug: a.slug,
        kicker: a.kicker,
        subdeck: a.subdeck,
        authors: [authorId],
        ...(a.writeIn ? { writeInAuthors: [{ name: a.writeIn }] } : {}),
        featuredImage: photoIds[i % photoIds.length],
        // @ts-expect-error richText jsonb accepted directly by local API
        content: richTextDoc(a.paragraphs),
        // 3 to 15 weeks back, spread so each topic's stories have different dates
        publishedDate: new Date(Date.now() - (21 + i * 3) * DAY_MS).toISOString(),
        _status: 'published',
      },
    })
    created++
    console.log(`article created: ${a.slug}`)
  }

  console.log(`news topics seed complete: ${created} created, ${ARTICLES.length - created} already present.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('news topics seed failed:', err)
  process.exit(1)
})
