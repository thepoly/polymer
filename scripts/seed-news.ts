/**
 * Seed placeholder news articles into the local dev DB, spread over the last
 * couple of months. Re-running is idempotent: articles are matched by slug.
 * Run `pnpm db:seed` first; it creates the news editor and fixture photos
 * this script reuses.
 *
 * Kickers are chosen to fill every column on the news section page
 * (see components/News/newsCategories.ts), with the rest landing in
 * "Other News".
 *
 * Usage: pnpm exec tsx --env-file=.env scripts/seed-news.ts
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

type SeedNewsArticle = {
  slug: string
  title: string
  kicker: string
  subdeck: string
  writeIn?: string
  paragraphs: string[]
}

const ARTICLES: SeedNewsArticle[] = [
  {
    slug: 'senate-passes-budget-for-spring-semester',
    title: 'Senate passes club budget for spring semester',
    kicker: 'Student Senate',
    subdeck: 'The vote came after two hours of debate over how much of the activity fee should go to new clubs.',
    paragraphs: [
      'The Student Senate approved the spring club budget on Monday night by a vote of 17-3, with two abstentions.',
      'Most of the debate centered on a proposed fund for newly recognized clubs, which senators eventually set at five percent of the total allocation.',
      'The budget now goes to the Executive Board for final approval before funds are released in January.',
    ],
  },
  {
    slug: 'senate-debates-late-night-shuttle-expansion',
    title: 'Senators push for later shuttle service on weekends',
    kicker: 'Student Senate',
    subdeck: 'A resolution asks the administration to extend the downtown route until 2 a.m. on Fridays and Saturdays.',
    writeIn: 'Nadia Hassan',
    paragraphs: [
      'The Student Senate passed a resolution on Monday asking the administration to run the downtown shuttle until 2 a.m. on weekends.',
      'Senators cited a survey in which more than 600 students said they had walked back to campus after dark because the shuttle had stopped running.',
      'The resolution is non-binding, but its sponsors said they plan to present it to the parking and transportation office next week.',
    ],
  },
  {
    slug: 'senate-approves-new-club-recognition-process',
    title: 'Senate streamlines how new clubs get recognized',
    kicker: 'Student Senate',
    subdeck: 'Clubs will now be able to apply on a rolling basis instead of waiting for two windows a year.',
    paragraphs: [
      'New student organizations will be able to apply for recognition at any point in the semester under a rule change passed by the Student Senate.',
      'Until now, clubs could only apply during two short windows, which senators said left some groups waiting months to book rooms or receive funding.',
      'The change takes effect at the start of next semester.',
    ],
  },
  {
    slug: 'senate-hears-concerns-over-printing-quotas',
    title: 'Students bring printing quota complaints to the Senate',
    kicker: 'Student Senate',
    subdeck: 'Several architecture students said the current quota runs out before midterms.',
    writeIn: 'Owen Gallagher',
    paragraphs: [
      'Students from several majors spoke during the open forum portion of Monday\'s Senate meeting about the per-semester printing quota.',
      'Architecture students said the quota does not account for large-format prints required in studio courses.',
      'The Senate\'s academic affairs committee agreed to gather data on printing use by major and report back before the end of the semester.',
    ],
  },
  {
    slug: 'executive-board-freezes-discretionary-spending',
    title: 'Executive Board freezes discretionary spending pending audit',
    kicker: 'Executive Board',
    subdeck: 'The freeze affects club requests above the standard allocation, not regular operating budgets.',
    paragraphs: [
      'The Executive Board voted on Thursday to pause approval of discretionary funding requests while it reviews last year\'s spending.',
      'Board members said the freeze is a precaution after the annual review found several reimbursements without matching receipts.',
      'Clubs can still spend their regular allocations, and the board expects to resume discretionary approvals within three weeks.',
    ],
  },
  {
    slug: 'executive-board-approves-union-game-room-renovation',
    title: 'Executive Board approves Union game room renovation',
    kicker: 'Executive Board',
    subdeck: 'New furniture, lighting and gaming stations are planned to be in place by the start of spring.',
    writeIn: 'Clara Whitfield',
    paragraphs: [
      'The Executive Board approved a plan to renovate the game room in the Rensselaer Union, funded from the Union\'s capital reserve.',
      'The project replaces worn furniture and outdated lighting and adds several console gaming stations requested in a student survey.',
      'Construction is planned for winter break so the room can stay open during the semester.',
    ],
  },
  {
    slug: 'library-renovation-closes-third-floor',
    title: 'Library renovation closes third floor through December',
    kicker: 'Campus Infrastructure',
    subdeck: 'Study space is being moved to the Union and two academic buildings while work continues.',
    paragraphs: [
      'The third floor of the Folsom Library will be closed through December while crews replace the heating and ventilation system.',
      'The library has opened overflow study rooms in the Rensselaer Union and two academic buildings, with extended hours during finals.',
      'Officials said the new system should fix the temperature swings that students have complained about for years.',
    ],
  },
  {
    slug: 'steam-line-repair-closes-sage-avenue',
    title: 'Steam line repair closes part of Sage Avenue',
    kicker: 'Campus Infrastructure',
    subdeck: 'Pedestrians are being detoured around the work zone for at least two weeks.',
    writeIn: 'Nadia Hassan',
    paragraphs: [
      'A section of Sage Avenue is closed to vehicles while crews repair a leaking steam line beneath the road.',
      'Pedestrian traffic is being routed around the site with temporary fencing and signs.',
      'Facilities staff said the repair should be finished within two weeks if the weather holds.',
    ],
  },
  {
    slug: 'new-bike-lanes-planned-for-campus-core',
    title: 'Protected bike lanes planned for the campus core',
    kicker: 'Campus Infrastructure',
    subdeck: 'The project is part of a longer-term plan to reduce car traffic between the academic buildings.',
    paragraphs: [
      'The university plans to add protected bike lanes along two of the busiest routes through the center of campus.',
      'The design separates bikes from both cars and pedestrians using curbs and planters, rather than painted lines.',
      'Construction is expected to begin over the summer, with the first lane open by next fall.',
    ],
  },
  {
    slug: 'residence-hall-wifi-upgrade-complete',
    title: 'Wi-Fi upgrade finished in freshman residence halls',
    kicker: 'Campus Infrastructure',
    subdeck: 'New access points roughly double the coverage in rooms that had dead zones.',
    writeIn: 'Devin Morales',
    paragraphs: [
      'The IT department has finished replacing wireless access points in all first-year residence halls.',
      'Each floor now has roughly twice as many access points as before, aimed at rooms that previously had weak or no signal.',
      'Students can report remaining dead spots through the IT service portal, and staff said they would follow up within a week.',
    ],
  },
  {
    slug: 'interview-grand-marshal-on-first-semester',
    title: 'Grand Marshal reflects on first semester in office',
    kicker: 'Interview',
    subdeck: 'In a conversation with The Poly, the GM talked about transportation, club funding and what is left on the agenda.',
    paragraphs: [
      'The Poly sat down with the Grand Marshal to talk about the first semester of their term.',
      'The GM said transportation had become a bigger issue than expected, and that the Senate would keep pressing for later shuttle hours.',
      'Asked about the spring, the GM said the priority is making sure students know how to bring issues to the Senate before they become crises.',
    ],
  },
  {
    slug: 'interview-dean-of-students-on-mental-health',
    title: 'Dean of students on expanding mental health services',
    kicker: 'Interview',
    subdeck: 'The dean outlined plans for more counselors and shorter wait times for first appointments.',
    writeIn: 'Clara Whitfield',
    paragraphs: [
      'The dean of students spoke with The Poly about the university\'s plans to expand counseling services.',
      'The dean said the counseling center will add two full-time clinicians next semester, with the goal of cutting wait times for a first appointment to under a week.',
      'Students will also be able to book same-day drop-in sessions starting in January.',
    ],
  },
  {
    slug: 'interview-dining-director-on-meal-plans',
    title: 'Dining director answers questions about meal plan changes',
    kicker: 'Interview',
    subdeck: 'Changes to dining dollars and late-night hours are coming next semester.',
    paragraphs: [
      'The director of dining services sat down with The Poly to explain the meal plan changes announced last week.',
      'The director said dining dollars will now roll over between fall and spring semesters, a frequent student request.',
      'Late-night hours at one dining hall will also be extended during exam weeks.',
    ],
  },
  {
    slug: 'town-hall-on-housing-costs',
    title: 'Town hall draws a full room over rising housing costs',
    kicker: 'Town Hall',
    subdeck: 'Students pressed administrators on next year\'s room rates and the availability of on-campus housing.',
    writeIn: 'Owen Gallagher',
    paragraphs: [
      'More than 200 students attended a town hall on housing costs in the Rensselaer Union on Wednesday evening.',
      'Administrators presented next year\'s proposed room rates and said rising utility and maintenance costs were the main factors.',
      'Students asked for more lower-cost options and for the university to publish a breakdown of what room fees pay for.',
    ],
  },
  {
    slug: 'town-hall-on-campus-safety',
    title: 'Safety town hall focuses on lighting and late-night walks',
    kicker: 'Town Hall',
    subdeck: 'Public Safety said it would add lighting along three paths students identified as dark.',
    paragraphs: [
      'Public Safety officials hosted a town hall on Tuesday to hear student concerns about safety on and around campus.',
      'Several students described paths between campus and downtown Troy that are poorly lit at night.',
      'Officials said three of those paths would get new lighting before the end of the semester, and that the escort service would be promoted more widely.',
    ],
  },
  {
    slug: 'press-release-new-research-center-announced',
    title: 'University announces new center for climate research',
    kicker: 'Press Release',
    subdeck: 'The center will bring together faculty from engineering, science and architecture.',
    paragraphs: [
      'The university has announced the creation of a new interdisciplinary center focused on climate research.',
      'According to the announcement, the center will support joint projects across engineering, science and architecture, and will offer seed grants to graduate students.',
      'The center is expected to open next fall in renovated space on the academic quad.',
    ],
  },
  {
    slug: 'press-release-commencement-speaker-named',
    title: 'Commencement speaker to be announced in February',
    kicker: 'Press Release',
    subdeck: 'The university said this year\'s ceremony will return to its traditional outdoor location.',
    paragraphs: [
      'The university said in a release that the spring commencement speaker will be announced in February.',
      'The ceremony will return to its traditional outdoor location, with a rain plan that moves it indoors.',
      'Graduating students will receive ticket information by email in March.',
    ],
  },
  {
    slug: 'press-release-tuition-set-for-next-year',
    title: 'Board of trustees sets tuition for next academic year',
    kicker: 'Press Release',
    subdeck: 'The increase is the smallest in five years, according to the university.',
    writeIn: 'Devin Morales',
    paragraphs: [
      'The board of trustees has approved tuition and fees for the next academic year, according to a university release.',
      'The release said the increase is the smallest in five years and that financial aid funding will grow by a larger percentage.',
      'Students can find a full breakdown of the changes on the bursar\'s website.',
    ],
  },
  {
    slug: 'researchers-win-federal-grant-for-battery-work',
    title: 'Researchers win federal grant for battery recycling work',
    kicker: 'Research',
    subdeck: 'The three-year grant will fund graduate students and new lab equipment.',
    paragraphs: [
      'A team of chemical and materials engineering researchers has received a three-year federal grant to study battery recycling.',
      'The project aims to recover more of the metals in used lithium-ion batteries at lower cost and with less waste.',
      'The grant will fund four graduate students and several undergraduate research positions.',
    ],
  },
  {
    slug: 'troy-city-council-approves-downtown-parking-changes',
    title: 'Troy City Council approves downtown parking changes',
    kicker: 'Troy',
    subdeck: 'Meters will run later on weekends, and a new permit option is aimed at students who live downtown.',
    writeIn: 'Nadia Hassan',
    paragraphs: [
      'The Troy City Council voted on Thursday to change how parking is managed downtown.',
      'Meters will run until 10 p.m. on Fridays and Saturdays, and residents will be able to buy a monthly permit for designated lots.',
      'Several students who live downtown spoke during public comment, saying the permit option would help those who commute to campus.',
    ],
  },
  {
    slug: 'public-safety-reports-rise-in-bike-thefts',
    title: 'Public Safety reports rise in bike thefts',
    kicker: 'Public Safety',
    subdeck: 'Most of the thefts involved cable locks, and officers recommend U-locks instead.',
    paragraphs: [
      'Public Safety has received more reports of stolen bikes this semester than in all of last year.',
      'Officers said most of the stolen bikes were secured with cable locks, which can be cut quickly.',
      'The department is offering free bike registration and discounted U-locks at its office through the end of the month.',
    ],
  },
  {
    slug: 'housing-lottery-dates-announced',
    title: 'Housing lottery dates announced for next year',
    kicker: 'Housing',
    subdeck: 'Students will get their lottery numbers in February, with room selection in March.',
    paragraphs: [
      'Residence life has announced the timeline for next year\'s housing lottery.',
      'Lottery numbers will be released in February, and room selection will take place over two weeks in March.',
      'Students who want to live off campus must submit a release form before the lottery opens.',
    ],
  },
  {
    slug: 'dining-hall-adds-allergen-free-station',
    title: 'Dining hall adds allergen-free station',
    kicker: 'Dining',
    subdeck: 'The station avoids the nine major allergens and has its own prep area.',
    writeIn: 'Clara Whitfield',
    paragraphs: [
      'One of the main dining halls has opened a station that serves meals free of the nine major food allergens.',
      'Food for the station is prepared in a separate area with its own equipment to prevent cross-contact.',
      'Dining services said it will add the station to a second dining hall if demand is high.',
    ],
  },
  {
    slug: 'registrar-moves-to-new-scheduling-system',
    title: 'Registrar moves course registration to a new system',
    kicker: 'Administration',
    subdeck: 'The switch is meant to end the site crashes that have marked registration week.',
    paragraphs: [
      'The registrar\'s office will use a new system for course registration starting next semester.',
      'The office said the new system can handle many more students at once, which should stop the crashes that have happened at the start of registration.',
      'Students will be able to build practice schedules in the new system two weeks before registration opens.',
    ],
  },
]

// Short Senate / Executive Board updates for the timeline pages. Dates are
// days ago, interleaved with the articles above.
const UPDATES: { body: 'senate' | 'eboard'; title: string; blurb: string; daysAgo: number }[] = [
  {
    body: 'senate',
    title: 'Senate meeting moved to Tuesday this week',
    blurb: 'Because of the holiday, this week\'s Senate meeting will be held Tuesday at 8 p.m. in the Shelnutt Gallery. The agenda is posted on the Union website.',
    daysAgo: 0,
  },
  {
    body: 'senate',
    title: 'Two new senators sworn in',
    blurb: 'The Senate swore in two senators elected in the fall special election, filling the last open class seats for the year.',
    daysAgo: 4,
  },
  {
    body: 'senate',
    title: 'Facilities committee opens survey on study spaces',
    blurb: 'The committee is collecting feedback on campus study spaces through the end of the month. Results will be presented at a December meeting.',
    daysAgo: 12,
  },
  {
    body: 'senate',
    title: 'Senate approves updated meeting rules',
    blurb: 'Senators approved changes to the meeting rules that cap open forum comments at three minutes per speaker.',
    daysAgo: 21,
  },
  {
    body: 'senate',
    title: 'Open forum added to every regular meeting',
    blurb: 'Any student may now speak during a fifteen-minute open forum at the start of each regular Senate meeting.',
    daysAgo: 38,
  },
  {
    body: 'eboard',
    title: 'Club budget hearings scheduled',
    blurb: 'Spring budget hearings run over the next two weekends. Clubs can sign up for a time slot through the Union\'s club portal.',
    daysAgo: 1,
  },
  {
    body: 'eboard',
    title: 'E-Board approves funding for winter break shuttle',
    blurb: 'The board approved funding for a shuttle to the Albany airport and train station on the last two days of finals week.',
    daysAgo: 6,
  },
  {
    body: 'eboard',
    title: 'New treasurer appointed',
    blurb: 'The Executive Board confirmed a new treasurer after the previous treasurer stepped down to study abroad.',
    daysAgo: 15,
  },
  {
    body: 'eboard',
    title: 'Union operating hours extended during finals',
    blurb: 'The Rensselaer Union will stay open until 2 a.m. for the two weeks of finals.',
    daysAgo: 27,
  },
  // Last school year, so the timeline pages have a previous year to explore
  {
    body: 'senate',
    title: 'Senate wraps up the spring term',
    blurb: 'The last meeting of the year passed the summer budget and thanked graduating senators.',
    daysAgo: 190,
  },
  {
    body: 'senate',
    title: 'Spring elections results certified',
    blurb: 'The Rules and Elections Committee certified this spring’s results after a recount in one class race.',
    daysAgo: 215,
  },
  {
    body: 'eboard',
    title: 'Executive Board approves summer club funding',
    blurb: 'Clubs that run summer programs can now apply for a share of the reserve fund.',
    daysAgo: 200,
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
        publishedDate: new Date(Date.now() - (i * 2 + 1) * DAY_MS).toISOString(),
        _status: 'published',
      },
    })
    created++
    console.log(`article created: ${a.slug}`)
  }

  let updatesCreated = 0
  for (const u of UPDATES) {
    const existing = await payload.find({
      collection: 'student-gov-updates',
      where: { and: [{ title: { equals: u.title } }, { body: { equals: u.body } }] },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length) {
      console.log(`update exists: ${u.title}`)
      continue
    }
    // Midday, so "days ago" lands on the expected calendar day
    const date = new Date(Date.now() - u.daysAgo * DAY_MS)
    date.setHours(12, 0, 0, 0)
    await payload.create({
      collection: 'student-gov-updates',
      data: { title: u.title, body: u.body, blurb: u.blurb, date: date.toISOString() },
    })
    updatesCreated++
    console.log(`update created: ${u.title}`)
  }

  console.log(`news seed complete: ${created} created, ${ARTICLES.length - created} already present.`)
  console.log(`student gov updates: ${updatesCreated} created, ${UPDATES.length - updatesCreated} already present.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('news seed failed:', err)
  process.exit(1)
})
