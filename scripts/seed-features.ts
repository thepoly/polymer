/**
 * Seed placeholder features articles into the local dev DB, spread over the
 * last six weeks, so every slot on /features has a story and the archive has
 * more than one page. Re-running is idempotent: articles are matched by slug.
 * Run `pnpm db:seed` first; it creates the features editor and the fixture
 * photos this script reuses (the same four the news seed uses).
 *
 * Also creates a Features layout (four photos in The Lens, every story slot
 * left to fill automatically) when none exists yet. An existing layout is left alone, so editor changes aren't
 * overwritten.
 *
 * Usage: pnpm db:seed:features
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { getArticleUrl } from '../utils/getArticleUrl'
import { EMPTY_FEATURES_LAYOUT } from '../lib/featuresLayout'

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

type SeedFeaturesArticle = {
  slug: string
  title: string
  kicker: string
  subdeck: string
  writeIn?: string
  paragraphs: string[]
}

const ARTS = 'The Arts'
const TROY = 'Troy'

// Newest first; each one is published a day and a half before the last.
const ARTICLES: SeedFeaturesArticle[] = [
  {
    slug: 'union-late-night-cafe',
    title: 'Behind the counter at the Union’s late-night café',
    kicker: 'On Campus',
    subdeck: 'The student workers who keep coffee flowing until 2 a.m. have seen every kind of finals-week crisis.',
    writeIn: 'Maya Richardson',
    paragraphs: [
      'By midnight, the line at the Union café is mostly people holding laptops.',
      'The students who staff the late shift say they can tell which exams are coming by what people order.',
      'Most of them took the job for the hours. Several say they stayed for the regulars.',
    ],
  },
  {
    slug: 'playhouse-winter-production-rehearsals',
    title: 'The Playhouse rehearses its winter show in a borrowed room',
    kicker: ARTS,
    subdeck: 'With the main stage under repair, the cast has spent six weeks rehearsing in a lecture hall.',
    paragraphs: [
      'The set pieces live in a hallway. The blocking is marked out in painter’s tape on a lecture hall floor.',
      'The director says the cramped space has pushed the cast to rely on each other more than the scenery.',
      'The production opens in the renovated theater the second weekend of December.',
    ],
  },
  {
    slug: 'observatory-clear-night-volunteers',
    title: 'The students who open the observatory on clear nights',
    kicker: 'On Campus',
    subdeck: 'A volunteer crew checks the forecast every afternoon and opens the dome to anyone who shows up.',
    writeIn: 'Liam Kowalski',
    paragraphs: [
      'When the sky is clear, a message goes out to a group chat of about forty students by 5 p.m.',
      'By 8, the dome is open and a short line has formed at the telescope.',
      'Volunteers say the best nights are the ones when someone sees Saturn’s rings for the first time.',
    ],
  },
  {
    slug: 'troy-farmers-market-saturday',
    title: 'A Saturday morning at the Troy Waterfront Farmers Market',
    kicker: TROY,
    subdeck: 'Students are a growing share of the crowd, and some vendors have changed what they sell because of it.',
    writeIn: 'Priya Nair',
    paragraphs: [
      'The market moves indoors for the winter, but the crowd barely shrinks.',
      'Several vendors say students now make up a noticeable share of their Saturday customers.',
      'One baker added smaller loaves after hearing the same request from students every week.',
    ],
  },
  {
    slug: 'first-year-ra-semester',
    title: 'A semester in the life of a first-year RA',
    kicker: 'Student Life',
    subdeck: 'Lockouts, roommate disputes and a fire alarm at 4 a.m.: one resident assistant kept a diary of the fall.',
    paragraphs: [
      'The first week brought eleven lockouts and one very loud argument about a mini-fridge.',
      'By October, the calls had shifted to homesickness and midterms.',
      'The RA says the job is less about rules than about being the person who answers the door.',
    ],
  },
  {
    slug: 'competition-robotics-machine-shop',
    title: 'Inside the machine shop where student teams build their robots',
    kicker: 'On Campus',
    subdeck: 'Four competition teams share one shop, one set of tools and a sign-up sheet that is always full.',
    writeIn: 'Ethan Gallagher',
    paragraphs: [
      'The shop opens at 8 a.m. and the sign-up sheet is usually full by 8:15.',
      'Four teams share the space, and they have worked out an informal system for borrowing each other’s parts.',
      'Team leads say the shared shop has made the teams more collaborative than competitive.',
    ],
  },
  {
    slug: 'a-cappella-fall-showcase',
    title: 'Campus a cappella groups get ready for the fall showcase',
    kicker: ARTS,
    subdeck: 'Six groups, one stage and a rehearsal schedule that runs past midnight.',
    writeIn: 'Dani Ostrowski',
    paragraphs: [
      'Six groups will share the stage at this year’s showcase, the largest lineup in recent memory.',
      'Rehearsals happen wherever there is a free room, including a stairwell with good acoustics.',
      'Organizers expect a full house and have added a second performance.',
    ],
  },
  {
    slug: 'hackathon-48-hours',
    title: 'What it takes to run a 48-hour hackathon',
    kicker: 'Events',
    subdeck: 'Organizers plan meals, mentors and sleeping space for hundreds of participants months in advance.',
    paragraphs: [
      'Planning starts in the spring, almost a full year before the event.',
      'Organizers coordinate sponsors, mentors, meals and quiet rooms for hundreds of participants.',
      'The hardest part, they say, is the last six hours, when everyone is tired and nothing compiles.',
    ],
  },
  {
    slug: 'downtown-independent-bookstore',
    title: 'Downtown’s independent bookstore is looking for new readers',
    kicker: TROY,
    subdeck: 'As rent rises, a group of student volunteers is helping the shop add events and workshops.',
    writeIn: 'Caleb Morrison',
    paragraphs: [
      'The shop has been on the same block for fifteen years.',
      'A group of student volunteers now runs a weekly reading night and helps with the shop’s online orders.',
      'The owner says the events have brought in customers who had never been downtown before.',
    ],
  },
  {
    slug: 'calculus-professor-thirty-years',
    title: 'Meet the professor who has taught intro calculus for 30 years',
    kicker: 'Profile',
    subdeck: 'Chalkboards gave way to tablets, but she says the way students learn hasn’t changed much.',
    paragraphs: [
      'She has taught the same course to more than ten thousand students.',
      'The technology in the room has changed several times. Her office hours have not.',
      'Asked about retirement, she said she would think about it once she gets the lecture on limits right.',
    ],
  },
  {
    slug: 'lounge-turned-makerspace',
    title: 'How students turned an empty lounge into a makerspace',
    kicker: 'On Campus',
    subdeck: 'A 3D printer, a sewing machine and a soldering station now fill a room that sat empty for years.',
    writeIn: 'Jasmine Herrera',
    paragraphs: [
      'The room on the second floor sat unused for years before a group of residents asked to borrow it.',
      'It now holds a 3D printer, a sewing machine and a soldering station, all donated or bought with a small grant.',
      'Residents keep a waitlist on the door and a box of spare parts under the table.',
    ],
  },
  {
    slug: 'recycled-lab-equipment-exhibition',
    title: 'An art exhibition made from retired lab equipment',
    kicker: ARTS,
    subdeck: 'Glassware, circuit boards and old centrifuges become sculpture in a student show.',
    paragraphs: [
      'The pieces in the gallery started out in research labs across campus.',
      'Students collected retired glassware, circuit boards and parts from broken instruments over a semester.',
      'The show runs through the end of the month and is free to visit.',
    ],
  },
  {
    slug: 'residence-hall-kitchen-cooking',
    title: 'Learning to cook in a residence hall kitchen',
    kicker: 'Student Life',
    subdeck: 'One shared stove, forty residents and a growing collection of recipes taped to the wall.',
    writeIn: 'Robin Akhtar',
    paragraphs: [
      'The kitchen has one working stove and a schedule taped to the fridge.',
      'Residents have started leaving their best recipes on the wall next to it.',
      'Sunday nights have turned into an informal potluck for whoever is around.',
    ],
  },
  {
    slug: 'warehouse-music-scene',
    title: 'Music in the old warehouses along the Hudson',
    kicker: TROY,
    subdeck: 'Pop-up shows in former industrial buildings are drawing students and locals to the same rooms.',
    writeIn: 'Julian Reese',
    paragraphs: [
      'The shows are announced a few days ahead, usually by word of mouth.',
      'Most take place in buildings that once housed factories along the river.',
      'Organizers say the crowds are about half students and half people who grew up in Troy.',
    ],
  },
  {
    slug: 'alum-engineering-to-bakery',
    title: 'From reactor simulations to sourdough: an alum’s second career',
    kicker: 'Alumni',
    subdeck: 'She spent three years at a national lab before opening a bakery. She says the skills carry over.',
    writeIn: 'Nora Fitzgerald',
    paragraphs: [
      'After graduating, she spent three years running simulations at a national lab.',
      'She now runs a small bakery and still keeps a spreadsheet of every batch of dough.',
      'Her advice to students: the career you plan is rarely the one you end up loving.',
    ],
  },
  {
    slug: 'orchestra-new-conductor',
    title: 'The orchestra’s new conductor on choosing a season',
    kicker: ARTS,
    subdeck: 'A mix of familiar works and pieces by living composers, picked with the players’ input.',
    paragraphs: [
      'The new conductor asked every section for suggestions before planning the season.',
      'The result mixes well-known symphonies with two pieces by living composers.',
      'The first concert is next month in the chapel.',
    ],
  },
  {
    slug: 'low-cost-prosthetic-hands-lab',
    title: 'Inside the lab building low-cost prosthetic hands',
    kicker: 'Research',
    subdeck: 'A student team is combining 3D printing and simple sensors to bring the cost under a few hundred dollars.',
    writeIn: 'Aiden Park',
    paragraphs: [
      'The team’s latest prototype costs less to make than a textbook.',
      'It uses 3D-printed parts and inexpensive muscle sensors to open and close the hand.',
      'The students hope to test it with volunteers next semester.',
    ],
  },
  {
    slug: 'campus-radio-overnight-djs',
    title: 'The campus radio DJs who broadcast at 3 a.m.',
    kicker: 'Student Media',
    subdeck: 'The overnight shift has a small audience, and the DJs say that is part of the appeal.',
    paragraphs: [
      'The overnight shift is the hardest to fill and the easiest to love, according to the station’s schedulers.',
      'DJs play whatever they want and take requests from a handful of regular callers.',
      'One says the 3 a.m. slot is the only time she can play an entire album without interruption.',
    ],
  },
  {
    slug: 'downtown-diner-regulars',
    title: 'The downtown diner where students and regulars share the counter',
    kicker: TROY,
    subdeck: 'Open early and late, it has been feeding the neighborhood and the campus for decades.',
    paragraphs: [
      'The counter seats twelve, and on weekend mornings every stool is taken.',
      'The owner knows most of the regulars by order rather than by name.',
      'Students have started showing up after late nights, and the kitchen now opens an hour earlier.',
    ],
  },
  {
    slug: 'dining-hall-leftover-food',
    title: 'Where the dining hall’s leftover food goes',
    kicker: 'Sustainability',
    subdeck: 'Composting, donations and a student group trying to waste less after every service.',
    writeIn: 'Zara Okonkwo',
    paragraphs: [
      'Every evening, staff sort leftover food into what can be donated, composted or thrown away.',
      'A student group now picks up donations twice a week and brings them to a local pantry.',
      'They want the dining halls to publish how much food is wasted each semester.',
    ],
  },
  {
    slug: 'chronic-illness-engineering-courseload',
    title: 'Keeping up with an engineering course load while chronically ill',
    kicker: 'Wellness',
    subdeck: 'Three students on accommodations, flare-ups during midterms and finding people who understand.',
    paragraphs: [
      'Three students shared how they manage a chronic illness alongside a full schedule.',
      'All three said asking for accommodations was harder than the paperwork itself.',
      'They have started a small support group that meets every other week.',
    ],
  },
  {
    slug: 'graduate-students-community',
    title: 'Graduate students on building community far from home',
    kicker: 'Student Life',
    subdeck: 'Weekly dinners, a soccer league and a group chat that never sleeps.',
    writeIn: 'Kira Yamamoto',
    paragraphs: [
      'Many graduate students arrive knowing no one in the area.',
      'Some of the strongest communities started with a weekly dinner or a pickup soccer game.',
      'Newer students say those groups made the first winter much easier.',
    ],
  },
  {
    slug: 'finals-week-startup',
    title: 'The startup two juniors built during finals week',
    kicker: 'Entrepreneurship',
    subdeck: 'It started as a joke study tool. A year later, they have a team and their first customers.',
    paragraphs: [
      'The first version was built in a weekend to help them study for one exam.',
      'Friends asked to use it, then friends of friends.',
      'The founders now split their time between classes and a small office downtown.',
    ],
  },
  {
    slug: 'affordable-housing-architecture-studio',
    title: 'An architecture studio takes on affordable housing',
    kicker: 'Design',
    subdeck: 'Students are designing modular homes for upstate winters with a strict budget.',
    writeIn: 'Sophia Tran',
    paragraphs: [
      'The brief is simple to say and hard to meet: a warm, durable home on a tight budget.',
      'Students are working with local materials and designs that hold heat through long winters.',
      'Final models go on display in the studio at the end of the semester.',
    ],
  },
  {
    slug: 'semester-abroad-two-years',
    title: 'A semester abroad that turned into two years of travel',
    kicker: 'Travel',
    subdeck: 'One senior on deciding to stay, and how it changed what she wants to study.',
    paragraphs: [
      'She planned to be gone for four months. She came back two years later.',
      'Along the way she worked, studied and switched her major.',
      'She says the hardest part of coming back was explaining it in one sentence.',
    ],
  },
  {
    slug: 'students-take-up-rock-climbing',
    title: 'Why more students are taking up rock climbing',
    kicker: 'Recreation',
    subdeck: 'The climbing club’s membership has doubled, and the gym is adding beginner nights.',
    writeIn: 'Marcus Webb',
    paragraphs: [
      'The climbing club’s membership has doubled in two years.',
      'Members say the sport is social in a way the weight room is not.',
      'The gym is adding beginner nights to keep up with demand.',
    ],
  },
]

// Fixture photos uploaded by `pnpm db:seed`, the same ones the news seed
// alternates across its articles.
const PHOTO_FILENAMES = ['campus-life.webp', 'schmidt.webp', 'swe-day.webp', 'winter-carnival.webp']

const DAY_MS = 24 * 60 * 60 * 1000

async function main() {
  const payload = await getPayload({ config })

  const featuresEditor = await payload.find({
    collection: 'users',
    where: { email: { equals: 'features@dev.local' } },
    limit: 1,
    depth: 0,
  })
  const editor = featuresEditor.docs[0]
  if (!editor) {
    throw new Error('features@dev.local not found. Run `pnpm db:seed` first.')
  }

  const photos: { id: number; url: string; alt: string }[] = []
  for (const filename of PHOTO_FILENAMES) {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const doc = found.docs[0]
    if (doc?.url) photos.push({ id: doc.id, url: doc.url, alt: doc.alt || '' })
  }
  if (!photos.length) {
    throw new Error('No fixture photos found. Run `pnpm db:seed` first.')
  }

  // ---- Articles ----
  const articleIds = new Map<string, number>()
  let created = 0
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
    const doc = await payload.create({
      collection: 'articles',
      // legacyImport keeps the backdated publishedDate (the publish hook would
      // otherwise stamp now) and skips PostHog events and breaking-news pushes.
      context: { legacyImport: true },
      data: {
        section: 'features',
        // @ts-expect-error richText jsonb accepted directly by local API
        title: richTextDoc([a.title]),
        slug: a.slug,
        kicker: a.kicker,
        subdeck: a.subdeck,
        authors: [editor.id],
        ...(a.writeIn ? { writeInAuthors: [{ name: a.writeIn }] } : {}),
        featuredImage: photos[i % photos.length].id,
        // @ts-expect-error richText jsonb accepted directly by local API
        content: richTextDoc(a.paragraphs),
        publishedDate: new Date(Date.now() - (i * 1.5 + 0.5) * DAY_MS).toISOString(),
        _status: 'published',
      },
    })
    articleIds.set(a.slug, doc.id)
    created++
    console.log(`article created: ${a.slug}`)
  }
  console.log(`features seed: ${created} created, ${ARTICLES.length - created} already present.`)

  // ---- Layout ----
  const existingLayout = await payload.find({
    collection: 'features-page-layout',
    limit: 1,
    depth: 0,
  })
  if (existingLayout.docs.length) {
    console.log('features layout exists; left unchanged.')
    process.exit(0)
  }

  // One spotlight photo per fixture, credited to the editor and linked to the
  // newest seeded article that uses it
  const spotlight = await Promise.all(
    photos.map(async (photo, p) => {
      const slug = ARTICLES[p].slug
      const article = await payload.findByID({
        collection: 'articles',
        id: articleIds.get(slug)!,
        depth: 0,
        select: { section: true, slug: true, publishedDate: true, createdAt: true },
      })
      return {
        url: photo.url,
        caption: photo.alt,
        articleTitle: ARTICLES[p].title,
        articleUrl: getArticleUrl(article),
        photographerName: `${editor.firstName} ${editor.lastName}`,
        photographerUrl: `/staff/${editor.slug || editor.id}`,
        addedAt: new Date().toISOString(),
      }
    }),
  )

  await payload.create({
    collection: 'features-page-layout',
    data: {
      name: 'Features Layout',
      layout: { ...EMPTY_FEATURES_LAYOUT, lens: spotlight },
    },
  })
  console.log('features layout created (4 photos in The Lens).')
  process.exit(0)
}

main().catch((err) => {
  console.error('features seed failed:', err)
  process.exit(1)
})
