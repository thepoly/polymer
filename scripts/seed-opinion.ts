/**
 * Seed placeholder opinion articles into the local dev DB, spread over the
 * last seven weeks, so every slot on /opinion has a story and each category
 * archive (Editorials, Opinions, Other) has more than one ten-story page.
 * Re-running is idempotent: columnists are matched by email, articles by slug.
 * Run `pnpm db:seed` first; it creates the EIC, the opinion editor and the
 * fixture photos this script reuses.
 *
 * Also creates six placeholder columnists (writers, password `devpassword`,
 * no headshot, so the spotlight shows their initial) and, when none exists
 * yet, the Opinion Layout: a few pinned column slots, three Opinion's Choice
 * picks and a spotlight of the columnists. An existing layout is left alone,
 * so editor changes aren't overwritten.
 *
 * Usage: pnpm db:seed:opinion
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { getArticleUrl } from '../utils/getArticleUrl'
import { OPINION_COLUMN_SLOTS, OPINION_LAYOUT_NAME, OPINION_LAYOUT_VERSION } from '../lib/opinionLayout'

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

const DEV_PASSWORD = 'devpassword'

const COLUMNISTS = [
  { email: 'columnist1@dev.local', firstName: 'Elena', lastName: 'Marsh' },
  { email: 'columnist2@dev.local', firstName: 'Owen', lastName: 'Delgado' },
  { email: 'columnist3@dev.local', firstName: 'Hana', lastName: 'Sato' },
  { email: 'columnist4@dev.local', firstName: 'Isaac', lastName: 'Brennan' },
  { email: 'columnist5@dev.local', firstName: 'Leah', lastName: 'Abrams' },
  { email: 'columnist6@dev.local', firstName: 'Devin', lastName: 'Okafor' },
] as const

/** Who the byline credits: a columnist (by index), the EIC, the opinion editor, or nobody */
type Byline = number | 'eic' | 'editor' | 'none'

type SeedOpinionArticle = {
  slug: string
  title: string
  kicker: string
  subdeck?: string
  by: Byline
  writeIn?: string
  /** false: no featured image (letters and short pieces) */
  image?: boolean
  paragraphs: string[]
  /** Pinned into the seeded layout */
  pin?: 'column1' | 'column2' | 'column3' | 'choice'
}

// Newest first; each one is published about a day and a quarter before the last.
const ARTICLES: SeedOpinionArticle[] = [
  {
    slug: 'editorial-finals-week-dining-hours',
    title: 'Keep the dining halls open later during finals',
    kicker: 'Staff Editorial',
    subdeck: 'Students studying until 2 a.m. shouldn’t have to choose between a meal and their notes.',
    by: 'eic',
    paragraphs: [
      'Every December, the dining halls close at their usual hours while the library stays open all night.',
      'The result is a campus full of students eating vending-machine dinners at midnight.',
      'Extending hours for two weeks a year is a small cost for a real improvement in students’ health.',
    ],
    pin: 'column1',
  },
  {
    slug: 'column-in-defense-of-the-8am',
    title: 'In defense of the 8 a.m. lecture',
    kicker: 'Column',
    subdeck: 'An early start is the only thing keeping my schedule honest.',
    by: 0,
    paragraphs: [
      'Nobody likes the 8 a.m. slot, and I have taken one every semester on purpose.',
      'It forces a bedtime, a breakfast and a morning that starts before my email does.',
      'I am not asking anyone to enjoy it. I am asking them to try it once.',
    ],
    pin: 'column2',
  },
  {
    slug: 'letter-shuttle-schedule',
    title: 'The new shuttle schedule leaves night students stranded',
    kicker: 'Letter to the Editor',
    by: 'none',
    writeIn: 'Gabriel Moreno',
    image: false,
    paragraphs: [
      'To the editor: since the schedule changed, the last shuttle from campus leaves before my evening lab ends.',
      'I am one of dozens of students in the same position, and walking home in December is not a plan.',
      'I ask Parking and Transportation to restore the 11 p.m. run.',
    ],
    pin: 'column3',
  },
  {
    slug: 'opinion-grade-deflation-myth',
    title: 'Grade deflation is a story we tell ourselves',
    kicker: 'Opinion',
    subdeck: 'The numbers show averages rising, not falling. Our anxiety has a different cause.',
    by: 1,
    paragraphs: [
      'Ask any student and they will tell you that grades here are harder to earn than anywhere else.',
      'The registrar’s own reports show average GPAs rising slowly for a decade.',
      'What has changed is how much each grade seems to matter, and that is worth talking about.',
    ],
    pin: 'choice',
  },
  {
    slug: 'top-hat-union-budget-transparency',
    title: 'Top Hat: The Union budget belongs to students',
    kicker: 'Top Hat',
    subdeck: 'The Grand Marshal on publishing every club’s allocation before the spring vote.',
    by: 'none',
    writeIn: 'Grand Marshal',
    paragraphs: [
      'Every student pays the activity fee. Every student should be able to see where it goes.',
      'This spring, the Executive Board will publish each club’s allocation before the budget vote.',
      'Questions and objections are welcome at any open meeting.',
    ],
  },
  {
    slug: 'column-the-quad-at-dusk',
    title: 'What I learned walking the quad at dusk',
    kicker: 'Column',
    subdeck: 'Twenty minutes a day without headphones changed how I see campus.',
    by: 2,
    paragraphs: [
      'I started leaving my headphones in my bag on the walk home in September.',
      'I now know which windows stay lit late and which benches catch the last of the sun.',
      'It is a small habit, and I recommend it to anyone who feels like campus is a blur.',
    ],
  },
  {
    slug: 'editorial-notebook-covering-the-senate',
    title: 'Editorial Notebook: Why we cover every Senate meeting',
    kicker: 'Editorial Notebook',
    subdeck: 'Most meetings are routine. That is exactly why someone should be in the room.',
    by: 'eic',
    paragraphs: [
      'Some weeks the Senate passes nothing of note, and we send a reporter anyway.',
      'The routine weeks are when the record matters most, because nobody else keeps it.',
      'Readers who want to see that record can find every meeting summary on our news page.',
    ],
  },
  {
    slug: 'opinion-club-fair-overwhelming',
    title: 'The club fair is too big to be useful',
    kicker: 'Opinion',
    subdeck: 'Two hundred tables in one gym is a crowd, not an introduction.',
    by: 3,
    paragraphs: [
      'First-year students walk into the club fair with a free tote bag and no plan.',
      'Most leave with a dozen email sign-ups and no real idea of what any club does.',
      'Splitting the fair over several themed evenings would serve students and clubs better.',
    ],
  },
  {
    slug: 'staff-editorial-mental-health-wait-times',
    title: 'Counseling wait times are still too long',
    kicker: 'Staff Editorial',
    subdeck: 'Hiring has helped, but three weeks for a first appointment is not good enough.',
    by: 'eic',
    paragraphs: [
      'The counseling center added staff this year, and the wait for a first appointment has fallen.',
      'Three weeks is still too long for a student in crisis during midterms.',
      'We urge the Institute to publish wait times each month so progress can be measured.',
    ],
    pin: 'choice',
  },
  {
    slug: 'letter-library-quiet-floors',
    title: 'Bring back the silent floor',
    kicker: 'Letter to the Editor',
    by: 'none',
    writeIn: 'Ava Lindqvist',
    image: false,
    paragraphs: [
      'To the editor: the third floor used to be silent. Now it is a group study room with better chairs.',
      'Please mark one floor for quiet work and enforce it, at least during finals.',
    ],
  },
  {
    slug: 'column-cooking-for-one',
    title: 'Cooking for one is a skill worth learning',
    kicker: 'Column',
    subdeck: 'Notes from a semester of learning to feed myself on a student budget.',
    by: 0,
    paragraphs: [
      'I moved off campus in August and ate cereal for dinner for most of September.',
      'By November I had five meals I could make without looking anything up.',
      'None of them are impressive. All of them are better than cereal.',
    ],
  },
  {
    slug: 'endorsement-grand-marshal',
    title: 'Our endorsement for Grand Marshal',
    kicker: 'Endorsement',
    subdeck: 'The editorial board explains its choice after interviewing every candidate.',
    by: 'eic',
    paragraphs: [
      'The board interviewed each candidate for an hour and read every platform in full.',
      'We were looking for a clear plan, a record of follow-through and a willingness to say no.',
      'Our reasoning, and our reservations, are below.',
    ],
  },
  {
    slug: 'opinion-spring-break-timing',
    title: 'Move spring break to the middle of the semester',
    kicker: 'Opinion',
    subdeck: 'A break in late March arrives after most students have already burned out.',
    by: 4,
    paragraphs: [
      'Spring break falls three weeks after midterms, when most students are already exhausted.',
      'Several peer schools schedule their break at the true midpoint of the term.',
      'The calendar committee meets in January, and students should make their case before then.',
    ],
    pin: 'choice',
  },
  {
    slug: 'candidate-profile-senate-at-large',
    title: 'Candidate profile: Senate at-large seats',
    kicker: 'Candidate Profile',
    subdeck: 'In their own words, the four students running for two open seats.',
    by: 'editor',
    paragraphs: [
      'Four students are running for two at-large seats on the Student Senate.',
      'We asked each of them the same three questions. Their answers are printed in full.',
    ],
  },
  {
    slug: 'column-study-abroad-regret',
    title: 'I almost didn’t study abroad',
    kicker: 'Column',
    subdeck: 'The scheduling headaches were real, and so was the semester that followed.',
    by: 2,
    paragraphs: [
      'For two years I told myself my major made studying abroad impossible.',
      'It took one advisor meeting and a summer course to make it work.',
      'If you are on the fence, ask the question before you decide the answer.',
    ],
  },
  {
    slug: 'staff-editorial-housing-lottery',
    title: 'The housing lottery needs a clearer process',
    kicker: 'Staff Editorial',
    subdeck: 'Students deserve to know how their numbers are assigned before they are.',
    by: 'eic',
    paragraphs: [
      'Every spring, students receive a lottery number and very little explanation of how it was chosen.',
      'Publishing the rules in advance would cost nothing and end most of the rumors.',
    ],
  },
  {
    slug: 'opinion-textbook-costs',
    title: 'Professors should list textbook costs before registration',
    kicker: 'Opinion',
    subdeck: 'A $300 required book is part of a course’s price, and students should see it.',
    by: 5,
    paragraphs: [
      'Students pick courses months before they learn which books are required.',
      'By then it is too late to choose a section with a cheaper or open textbook.',
      'Listing required materials at registration is a simple fix that some departments already use.',
    ],
  },
  {
    slug: 'letter-bike-racks',
    title: 'We need more bike racks by the academic buildings',
    kicker: 'Letter to the Editor',
    by: 'none',
    writeIn: 'Tomas Reyes',
    image: false,
    paragraphs: [
      'To the editor: on a clear morning, every rack outside the academic buildings is full by 9 a.m.',
      'Students are locking bikes to railings and trees. A few more racks would solve it.',
    ],
  },
  {
    slug: 'polys-recommendations-winter-break',
    title: 'The Poly’s Recommendations: Winter break reading',
    kicker: 'The Poly’s Recommendations',
    subdeck: 'Books, podcasts and one very long video game, picked by our staff.',
    by: 'eic',
    paragraphs: [
      'We asked everyone on staff for one thing they would recommend over break.',
      'The list runs from a 900-page novel to a podcast about bridges.',
    ],
  },
  {
    slug: 'column-group-projects',
    title: 'Group projects teach the wrong lesson',
    kicker: 'Column',
    subdeck: 'Grading teams together rewards whoever is willing to do everyone’s work.',
    by: 3,
    paragraphs: [
      'Every group project I have done has had one student carrying the rest.',
      'Peer evaluations exist, but most students are reluctant to use them honestly.',
      'Grading individual contributions, even roughly, would make the lesson about teamwork again.',
    ],
  },
  {
    slug: 'opinion-campus-wifi',
    title: 'The campus Wi-Fi is a teaching problem',
    kicker: 'Opinion',
    subdeck: 'When the network drops during an online quiz, it is not an IT ticket. It is a grade.',
    by: 1,
    paragraphs: [
      'Twice this semester, the network went down during a timed online quiz in my lecture hall.',
      'Both times, the professor had to decide on the spot how to handle it.',
      'Reliable Wi-Fi in teaching spaces should be treated as part of the classroom, not an amenity.',
    ],
  },
  {
    slug: 'editors-notebook-corrections',
    title: 'Editor’s Notebook: How we handle corrections',
    kicker: 'Editor’s Notebook',
    subdeck: 'When we get something wrong, here is what happens next.',
    by: 'eic',
    paragraphs: [
      'Every correction we run starts with a reader, a source or one of our own reporters.',
      'We fix the story, note the change at the bottom and keep a record of what was wrong.',
    ],
  },
  {
    slug: 'top-hat-gm-week-reflections',
    title: 'Top Hat: Reflections after GM Week',
    kicker: 'Top Hat',
    subdeck: 'What the campaign taught the candidates, and what it should teach the rest of us.',
    by: 'none',
    writeIn: 'Grand Marshal',
    paragraphs: [
      'GM Week is loud, busy and over quickly.',
      'This year’s turnout was higher than the last three, and that matters more than any single result.',
    ],
  },
  {
    slug: 'column-commuting-from-albany',
    title: 'Notes from a commuter',
    kicker: 'Column',
    subdeck: 'Forty minutes each way, and the case for making campus friendlier to students who don’t live here.',
    by: 4,
    paragraphs: [
      'I drive in from Albany four days a week.',
      'There is nowhere to leave a coat, heat up lunch or nap between classes.',
      'A commuter lounge would cost little and help a lot of students who rarely speak up.',
    ],
  },
  {
    slug: 'staff-editorial-open-course-evaluations',
    title: 'Publish course evaluations',
    kicker: 'Staff Editorial',
    subdeck: 'Students fill them out every term. They should be able to read the results.',
    by: 'eic',
    paragraphs: [
      'Students complete course evaluations every semester and never see what anyone else wrote.',
      'Many schools publish summary results, and their instructors have survived.',
    ],
  },
  {
    slug: 'opinion-sustainability-pledges',
    title: 'Sustainability pledges need deadlines',
    kicker: 'Opinion',
    subdeck: 'A goal with no date is a slogan.',
    by: 5,
    paragraphs: [
      'The Institute has made several sustainability commitments in the past decade.',
      'Few of them came with dates, and fewer still with progress reports.',
      'Students should ask for both before the next pledge is announced.',
    ],
  },
  {
    slug: 'letter-hockey-tickets',
    title: 'Student hockey tickets sell out too fast',
    kicker: 'Letter to the Editor',
    by: 'none',
    writeIn: 'Marisol Vance',
    image: false,
    paragraphs: [
      'To the editor: student tickets for the big games are gone within minutes of release.',
      'A lottery would be fairer than rewarding whoever refreshes the page fastest.',
    ],
  },
  {
    slug: 'letter-laundry-machines',
    title: 'Fix the laundry machines before adding new ones',
    kicker: 'Letter to the Editor',
    by: 'none',
    writeIn: 'Priyanka Iyer',
    image: false,
    paragraphs: [
      'To the editor: half the machines in my building have shown an out-of-order sign since October.',
      'Repairing what we have would help more than the new app that tells us they are broken.',
    ],
  },
  {
    slug: 'derby-dorm-food-rankings',
    title: 'Derby: Ranking every late-night snack on campus',
    kicker: 'Derby',
    subdeck: 'Our staff tasted, argued and reached no consensus.',
    by: 'editor',
    paragraphs: [
      'Six staff members tried every late-night snack available on campus in one evening.',
      'The rankings below are final, and also wrong according to at least two of us.',
    ],
  },
  {
    slug: 'staff-editorial-office-hours',
    title: 'Office hours should fit students’ schedules',
    kicker: 'Staff Editorial',
    subdeck: 'Two hours on a Tuesday afternoon don’t serve a class of three hundred.',
    by: 'eic',
    paragraphs: [
      'Large courses often offer office hours at a single time that conflicts with other required classes.',
      'Spreading hours across the week, or adding an evening slot, would reach far more students.',
    ],
  },
  {
    slug: 'opinion-first-year-advising',
    title: 'First-year advising starts too late',
    kicker: 'Opinion',
    subdeck: 'By the time most students meet their advisor, they have already registered.',
    by: 0,
    paragraphs: [
      'My first meeting with my advisor came after I had already chosen my spring courses.',
      'An advising session during orientation would catch mistakes before they become semesters.',
    ],
  },
  {
    slug: 'letter-response-housing-editorial',
    title: 'A response to “The housing lottery needs a clearer process”',
    kicker: 'Letter to the Editor',
    by: 'none',
    writeIn: 'A residence hall director',
    image: false,
    paragraphs: [
      'To the editor: the lottery rules are posted each January, but I agree they are hard to find.',
      'We will link them from the housing portal this year.',
    ],
  },
  {
    slug: 'staff-editorial-snow-days',
    title: 'Clear the paths before the first class',
    kicker: 'Staff Editorial',
    subdeck: 'An icy hill is a safety problem, not a winter tradition.',
    by: 'eic',
    paragraphs: [
      'On the first snowy morning last winter, several students fell on the walk up the hill.',
      'Clearing the main paths before 8 a.m. should be the standard, not the exception.',
    ],
  },
  {
    slug: 'column-last-semester',
    title: 'Notes from my last semester',
    kicker: 'Column',
    subdeck: 'Doing everything for the last time is stranger than doing it for the first.',
    by: 5,
    paragraphs: [
      'This is my last semester, and every routine now comes with a countdown.',
      'I have started saying yes to more things, including this column.',
    ],
  },
]

// Fixture photos uploaded by `pnpm db:seed`, alternated across the articles
// that have a featured image
const PHOTO_FILENAMES = ['campus-life.webp', 'schmidt.webp', 'swe-day.webp', 'winter-carnival.webp', 'playhouse.webp', 'bsa-fashion.webp']

const DAY_MS = 24 * 60 * 60 * 1000

async function main() {
  const payload = await getPayload({ config })

  const findUser = async (email: string) =>
    (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })).docs[0]

  const eic = await findUser('eic@dev.local')
  const opinionEditor = await findUser('opinion@dev.local')
  if (!eic || !opinionEditor) {
    throw new Error('eic@dev.local or opinion@dev.local not found. Run `pnpm db:seed` first.')
  }

  // ---- Columnists ----
  const columnistIds: number[] = []
  for (const c of COLUMNISTS) {
    const existing = await findUser(c.email)
    if (existing) {
      columnistIds.push(existing.id)
      console.log(`columnist exists: ${c.email}`)
      continue
    }
    const created = await payload.create({
      collection: 'users',
      data: { email: c.email, password: DEV_PASSWORD, firstName: c.firstName, lastName: c.lastName, roles: ['writer'] },
    })
    columnistIds.push(created.id)
    console.log(`columnist created: ${c.email}`)
  }

  const photos: number[] = []
  for (const filename of PHOTO_FILENAMES) {
    const found = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, depth: 0 })
    if (found.docs[0]) photos.push(found.docs[0].id)
  }
  if (!photos.length) {
    throw new Error('No fixture photos found. Run `pnpm db:seed` first.')
  }

  const authorsFor = (by: Byline): number[] =>
    by === 'eic' ? [eic.id] : by === 'editor' ? [opinionEditor.id] : by === 'none' ? [] : [columnistIds[by]]

  // ---- Articles ----
  const articleIds = new Map<string, number>()
  let created = 0
  let photoIndex = 0
  for (const [i, a] of ARTICLES.entries()) {
    const existing = await payload.find({
      collection: 'articles',
      where: { slug: { equals: a.slug } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length) {
      articleIds.set(a.slug, existing.docs[0].id)
      console.log(`article exists: ${a.slug}`)
      continue
    }
    const featuredImage = a.image === false ? undefined : photos[photoIndex++ % photos.length]
    const doc = await payload.create({
      collection: 'articles',
      // legacyImport keeps the backdated publishedDate (the publish hook would
      // otherwise stamp now) and skips PostHog events and breaking-news pushes.
      context: { legacyImport: true },
      data: {
        section: 'opinion',
        // @ts-expect-error richText jsonb accepted directly by local API
        title: richTextDoc([a.title]),
        slug: a.slug,
        kicker: a.kicker,
        ...(a.subdeck ? { subdeck: a.subdeck } : {}),
        authors: authorsFor(a.by),
        ...(a.writeIn ? { writeInAuthors: [{ name: a.writeIn }] } : {}),
        ...(featuredImage ? { featuredImage } : {}),
        // @ts-expect-error richText jsonb accepted directly by local API
        content: richTextDoc(a.paragraphs),
        publishedDate: new Date(Date.now() - (i * 1.25 + 0.5) * DAY_MS).toISOString(),
        _status: 'published',
      },
    })
    articleIds.set(a.slug, doc.id)
    created++
    console.log(`article created: ${a.slug}`)
  }
  console.log(`opinion seed: ${created} created, ${ARTICLES.length - created} already present.`)

  // ---- Layout ----
  const existingLayout = await payload.find({
    collection: 'opinion-page-layout',
    where: { name: { equals: OPINION_LAYOUT_NAME } },
    limit: 1,
    depth: 0,
  })
  if (existingLayout.docs.length) {
    console.log('opinion layout exists; left unchanged.')
    process.exit(0)
  }

  const pinFor = (pin: SeedOpinionArticle['pin']) =>
    ARTICLES.filter((a) => a.pin === pin).map((a) => articleIds.get(a.slug) ?? null)

  // Each column's first slot is pinned; the rest fill automatically, newest first
  const column = (pin: 'column1' | 'column2' | 'column3', length: number) => {
    const pins = pinFor(pin)
    return Array.from({ length }, (_, i) => pins[i] ?? null)
  }

  // Spotlight: each columnist, linked to their newest seeded piece
  const spotlight = []
  for (const [index, userId] of columnistIds.entries()) {
    const latest = ARTICLES.find((a) => a.by === index)
    const id = latest && articleIds.get(latest.slug)
    if (!latest || !id) continue
    const article = await payload.findByID({
      collection: 'articles',
      id,
      depth: 0,
      select: { section: true, slug: true, publishedDate: true, createdAt: true },
    })
    spotlight.push({ userId, articleTitle: latest.title, articleUrl: getArticleUrl(article) })
  }

  await payload.create({
    collection: 'opinion-page-layout',
    data: {
      name: OPINION_LAYOUT_NAME,
      layout: {
        version: OPINION_LAYOUT_VERSION,
        column1: column('column1', OPINION_COLUMN_SLOTS),
        column1Images: [true, false],
        column2: column('column2', OPINION_COLUMN_SLOTS),
        column2Images: [false, true],
        column3: column('column3', OPINION_COLUMN_SLOTS),
        column3Images: [false, true],
        editorsChoice: pinFor('choice').slice(0, 3),
        editorsChoiceLabel: 'Opinion’s Choice',
        spotlight,
      },
    },
  })
  console.log(`opinion layout created (3 column pins, 3 Opinion’s Choice picks, ${spotlight.length} spotlight authors).`)
  process.exit(0)
}

main().catch((err) => {
  console.error('opinion seed failed:', err)
  process.exit(1)
})
