/**
 * Seed the local dev DB with users, media, articles, and a homepage layout.
 * Re-running is idempotent: existing records (matched by slug or email) are
 * left alone.
 *
 * Usage: pnpm db:seed
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '../payload.config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = path.resolve(__dirname, '..', 'seed', 'fixtures')

const DEV_PASSWORD = 'devpassword'

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

const richTextTitle = (text: string): RichTextNode => richTextDoc([text])

type UserRole = 'admin' | 'editor' | 'eic' | 'writer'
type SeedUser = {
  email: string
  firstName: string
  lastName: string
  roles: UserRole[]
  section?: 'news' | 'sports' | 'opinion' | 'features'
}

const USERS: SeedUser[] = [
  { email: 'admin@dev.local', firstName: 'Dev', lastName: 'Admin', roles: ['admin'] },
  { email: 'eic@dev.local', firstName: 'Sam', lastName: 'Carter', roles: ['eic'] },
  { email: 'news@dev.local', firstName: 'Jamie', lastName: 'Liu', roles: ['editor'], section: 'news' },
  { email: 'sports@dev.local', firstName: 'Avery', lastName: 'Rao', roles: ['editor'], section: 'sports' },
  { email: 'opinion@dev.local', firstName: 'Riley', lastName: 'Chen', roles: ['editor'], section: 'opinion' },
  { email: 'features@dev.local', firstName: 'Morgan', lastName: 'Patel', roles: ['editor'], section: 'features' },
  { email: 'writer@dev.local', firstName: 'Taylor', lastName: 'Nguyen', roles: ['writer'] },
]

type FixtureMedia = {
  filename: string
  title: string
  alt: string
}

const MEDIA: FixtureMedia[] = [
  { filename: 'schmidt.webp', title: 'Schmidt portrait', alt: 'A staff portrait used as a placeholder hero.' },
  { filename: 'freakout-fans.webp', title: 'Freakout crowd', alt: 'Hockey fans cheering at the Houston Field House.' },
  { filename: 'winter-carnival.webp', title: 'Winter carnival', alt: 'Students gathered on the campus quad in winter.' },
  { filename: 'bsa-fashion.webp', title: 'BSA fashion show', alt: 'Models walking the runway at the BSA fashion show.' },
  { filename: 'swe-day.webp', title: 'SWE day', alt: 'Society of Women Engineers event on campus.' },
  { filename: 'playhouse.webp', title: 'Playhouse rehearsal', alt: 'A rehearsal scene at the Rensselaer Playhouse.' },
  { filename: 'campus-life.webp', title: 'Campus life', alt: 'Students walking between classes on the academic quad.' },
  { filename: 'sports-action.webp', title: 'Sports action', alt: 'A game-action shot from a recent RPI matchup.' },
]

type SeedArticle = {
  section: 'news' | 'sports' | 'opinion' | 'features'
  title: string
  slug: string
  kicker?: string
  subdeck?: string
  heroFixture: string
  authorIndex: number
  paragraphs: string[]
  isPhotofeature?: boolean
}

const ARTICLES: SeedArticle[] = [
  {
    section: 'news',
    title: 'Senate approves new sustainability initiative',
    slug: 'senate-sustainability-initiative',
    kicker: 'Student Senate',
    subdeck: 'Funding will support compost bins and solar lighting on the academic quad.',
    heroFixture: 'campus-life.webp',
    authorIndex: 2,
    paragraphs: [
      'In a near-unanimous vote, the Student Senate approved a $42,000 sustainability initiative this week, channeling funds toward compost infrastructure and solar-powered walkway lights.',
      'Senators framed the package as a step toward Rensselaer\'s broader carbon-reduction commitments. The proposal originated in the Senate\'s Facilities and Services Committee.',
      'Implementation begins this spring, with the first compost bins set to appear behind Russell Sage Dining Hall by April.',
    ],
  },
  {
    section: 'news',
    title: 'Library announces extended exam-week hours',
    slug: 'library-extended-hours',
    kicker: 'Folsom Library',
    heroFixture: 'schmidt.webp',
    authorIndex: 2,
    paragraphs: [
      'Folsom Library will remain open 24 hours daily during finals week, the first such expansion in three years.',
      'Library staff cited rising demand from graduate cohorts and a successful overnight pilot during the fall midterm period.',
    ],
  },
  {
    section: 'sports',
    title: 'Engineers split weekend hockey series at Houston Field House',
    slug: 'engineers-split-hockey-weekend',
    kicker: 'Men\'s Hockey',
    subdeck: 'A 4-2 win Friday was followed by a 3-1 loss Saturday in front of a sold-out crowd.',
    heroFixture: 'freakout-fans.webp',
    authorIndex: 3,
    paragraphs: [
      'Rensselaer\'s men\'s hockey team split a weekend home series, capturing a decisive 4-2 victory Friday before falling 3-1 the following night.',
      'Friday\'s win was driven by a hat trick from senior forward Casey Walsh, who broke a tie midway through the second period and never looked back.',
      'Saturday\'s game was tighter — a third-period power play sealed the contest for the visiting Bobcats.',
    ],
  },
  {
    section: 'sports',
    title: 'Women\'s lacrosse opens spring with home win',
    slug: 'womens-lacrosse-opens-spring',
    kicker: 'Women\'s Lacrosse',
    heroFixture: 'sports-action.webp',
    authorIndex: 3,
    paragraphs: [
      'The women\'s lacrosse team opened the spring slate with a 12-7 victory over visiting Hartwick on Saturday afternoon.',
      'Junior midfielder Priya Desai led all scorers with four goals and two assists.',
    ],
  },
  {
    section: 'opinion',
    title: 'A case for keeping the academic quad open at night',
    slug: 'academic-quad-open-at-night',
    kicker: 'Opinion',
    heroFixture: 'winter-carnival.webp',
    authorIndex: 4,
    paragraphs: [
      'The academic quad has long been a quiet refuge — for late-night walks, low-stakes conversation, and the occasional midnight skateboard run.',
      'Recent rumblings about overnight closures threaten that. Restricting access would do little for safety while removing one of the few unstructured social spaces on campus.',
    ],
  },
  {
    section: 'opinion',
    title: 'Editorial: The administration owes students a better dining plan',
    slug: 'better-dining-plan',
    kicker: 'Staff Editorial',
    heroFixture: 'bsa-fashion.webp',
    authorIndex: 1,
    paragraphs: [
      'Three semesters of incremental dining-plan changes have left students paying more for fewer choices and shorter hours.',
      'It is time for the administration to publish a real, transparent breakdown of where dining dollars go and why service has contracted.',
    ],
  },
  {
    section: 'features',
    title: 'Inside the Playhouse: a season-end profile',
    slug: 'inside-playhouse-season-end',
    kicker: 'Features',
    heroFixture: 'playhouse.webp',
    authorIndex: 5,
    paragraphs: [
      'The Rensselaer Playhouse closes its season this month with a one-night cabaret. Behind the curtain, an all-student production team has spent the last six weeks rebuilding the lighting rig.',
      'Director Mira Aldana described the cabaret as a love letter to the company\'s seniors — six performers who joined as freshmen during the pandemic and stayed.',
    ],
  },
  {
    section: 'features',
    title: 'Photo: SWE day on the academic quad',
    slug: 'swe-day-photo',
    kicker: 'Photo',
    heroFixture: 'swe-day.webp',
    authorIndex: 5,
    paragraphs: [
      '#photofeature# The Society of Women Engineers hosted its annual SWE day on the academic quad Saturday, drawing more than 200 students.',
    ],
    isPhotofeature: true,
  },
]

async function main() {
  if (!fs.existsSync(FIXTURE_DIR)) {
    console.error(`Fixture dir not found: ${FIXTURE_DIR}`)
    process.exit(1)
  }

  const payload = await getPayload({ config })

  // ===== Users =====
  const userIdByEmail = new Map<string, number>()
  for (const u of USERS) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: u.email } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length) {
      userIdByEmail.set(u.email, existing.docs[0].id as number)
      console.log(`user exists: ${u.email}`)
      continue
    }
    const created = await payload.create({
      collection: 'users',
      data: {
        email: u.email,
        password: DEV_PASSWORD,
        firstName: u.firstName,
        lastName: u.lastName,
        roles: u.roles,
        ...(u.section ? { section: u.section } : {}),
      },
    })
    userIdByEmail.set(u.email, created.id as number)
    console.log(`user created: ${u.email}`)
  }

  // ===== Media =====
  const mediaIdByFilename = new Map<string, number>()
  for (const m of MEDIA) {
    const sourcePath = path.join(FIXTURE_DIR, m.filename)
    if (!fs.existsSync(sourcePath)) {
      console.warn(`fixture missing: ${sourcePath} (skip)`)
      continue
    }
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: m.filename } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length) {
      mediaIdByFilename.set(m.filename, existing.docs[0].id as number)
      console.log(`media exists: ${m.filename}`)
      continue
    }
    const buffer = fs.readFileSync(sourcePath)
    const created = await payload.create({
      collection: 'media',
      data: { title: m.title, alt: m.alt },
      file: {
        data: buffer,
        mimetype: 'image/webp',
        name: m.filename,
        size: buffer.length,
      },
    })
    mediaIdByFilename.set(m.filename, created.id as number)
    console.log(`media uploaded: ${m.filename}`)
  }

  // ===== Articles =====
  const eicId = userIdByEmail.get('eic@dev.local')
  for (const a of ARTICLES) {
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
    const author = USERS[a.authorIndex]
    const authorId = userIdByEmail.get(author.email) ?? eicId
    if (!authorId) {
      console.warn(`no author available for ${a.slug}, skipping`)
      continue
    }
    const heroId = mediaIdByFilename.get(a.heroFixture)
    if (!heroId) {
      console.warn(`hero ${a.heroFixture} missing for ${a.slug}, skipping`)
      continue
    }
    await payload.create({
      collection: 'articles',
      data: {
        section: a.section,
        // @ts-expect-error richText jsonb accepted directly by local API
        title: richTextTitle(a.title),
        slug: a.slug,
        kicker: a.kicker,
        subdeck: a.subdeck,
        authors: [authorId],
        featuredImage: heroId,
        // @ts-expect-error richText jsonb accepted directly by local API
        content: richTextDoc(a.paragraphs),
        ...(a.isPhotofeature ? { isPhotofeature: true } : {}),
        _status: 'published',
      },
    })
    console.log(`article created: ${a.slug}`)
  }

  // ===== Layout =====
  // The legacy main_article_id column is NOT NULL on a fresh DB built from
  // migrations, even though the modern Payload field is optional. Pull a
  // recently-seeded article and pin it so the create succeeds.
  const layoutDocs = await payload.find({ collection: 'layout', limit: 1, sort: '-updatedAt', depth: 0 })
  if (layoutDocs.docs.length === 0) {
    const newsArticle = await payload.find({
      collection: 'articles',
      where: { section: { equals: 'news' } },
      limit: 1,
      sort: '-createdAt',
      depth: 0,
    })
    const opinionArticle = await payload.find({
      collection: 'articles',
      where: { section: { equals: 'opinion' } },
      limit: 1,
      sort: '-createdAt',
      depth: 0,
    })
    if (!newsArticle.docs.length) {
      console.warn('no seeded news article available; skipping layout creation')
    } else {
      await payload.create({
        collection: 'layout',
        data: {
          name: 'Dev homepage',
          skeleton: 'aries',
          mainArticle: newsArticle.docs[0].id as number,
          ...(opinionArticle.docs.length ? { op1: opinionArticle.docs[0].id as number } : {}),
        },
      })
      console.log('layout created')
    }
  } else {
    console.log('layout exists')
  }

  console.log('\nseed complete.')
  console.log(`  log in at http://localhost:3000/admin with admin@dev.local / ${DEV_PASSWORD}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('seed failed:', err)
  process.exit(1)
})
