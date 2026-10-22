/**
 * Seed placeholder sports articles into the local dev DB, spread over the last
 * couple of months. Re-running is idempotent: articles are matched by slug.
 * Run `pnpm db:seed` first; it creates the sports editor and fixture photos
 * this script reuses.
 *
 * Usage: pnpm exec tsx --env-file=.env scripts/seed-sports.ts
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

type SeedSportsArticle = {
  slug: string
  title: string
  kicker: string
  subdeck: string
  writeIn?: string
  paragraphs: string[]
}

const ARTICLES: SeedSportsArticle[] = [
  {
    slug: 'hockey-sweeps-union-in-rivalry-weekend',
    title: 'Engineers sweep Union in rivalry weekend',
    kicker: "Men's Hockey",
    subdeck: 'A third-period power-play goal on Saturday capped a four-point weekend and moved RPI into the top half of the ECAC standings.',
    paragraphs: [
      'Rensselaer completed a sweep of Union with a 3-2 win at Houston Field House on Saturday, one night after a 4-1 victory in Schenectady.',
      'The winner came with 6:41 left in regulation, when a point shot was redirected past the Union goaltender during a five-on-four.',
      'Head coach praised the penalty kill, which went eight-for-eight over the two games, and said the team is finally playing the structured game it practiced all fall.',
    ],
  },
  {
    slug: 'womens-hockey-falls-in-overtime-at-clarkson',
    title: "Women's hockey falls in overtime at Clarkson",
    kicker: "Women's Hockey",
    subdeck: 'RPI erased a two-goal deficit in the third period before a turnover in the extra frame decided it.',
    writeIn: 'Priya Desai',
    paragraphs: [
      'Clarkson scored 2:13 into overtime to edge Rensselaer 3-2 in Potsdam on Friday night.',
      'The Engineers trailed 2-0 after two periods but got goals from both of their top-line forwards within four minutes of each other to force the extra session.',
      'Goaltending kept RPI in the game throughout: the Engineers were outshot 41-24 and still had chances to win it late in regulation.',
    ],
  },
  {
    slug: 'basketball-opens-season-with-road-win',
    title: 'Basketball opens season with road win at Skidmore',
    kicker: "Men's Basketball",
    subdeck: 'Four players finished in double figures as the Engineers pulled away in the second half.',
    paragraphs: [
      'Rensselaer opened its season with an 81-68 win at Skidmore, outscoring the Thoroughbreds 45-31 after halftime.',
      'The Engineers shot 48 percent from the field and committed only nine turnovers, a point of emphasis during the preseason.',
      'RPI returns home next week for its first Liberty League game of the year.',
    ],
  },
  {
    slug: 'womens-basketball-guard-sets-program-assist-record',
    title: 'Senior guard sets program assist record',
    kicker: "Women's Basketball",
    subdeck: 'A ten-assist night against Vassar pushed her past a mark that had stood since 2009.',
    writeIn: 'Marcus Bell',
    paragraphs: [
      'A senior point guard broke the Rensselaer career assist record on Saturday, dishing out ten in a 72-59 win over Vassar.',
      'The record-breaking pass came midway through the third quarter, and the bench briefly stopped play to recognize the moment.',
      'She said afterward that the record belongs to the shooters around her, and that she cares more about the team\'s three-game win streak.',
    ],
  },
  {
    slug: 'football-clinches-liberty-league-title',
    title: 'Football clinches share of Liberty League title',
    kicker: 'Football',
    subdeck: 'A late interception sealed a 24-17 win over Hobart and secured at least a share of the conference crown.',
    paragraphs: [
      'Rensselaer clinched at least a share of the Liberty League championship with a 24-17 win over Hobart at ECAV Stadium.',
      'The defense held Hobart scoreless in the fourth quarter, and a diving interception at the RPI 12-yard line ended the final drive.',
      'The Engineers will learn their postseason path when the NCAA bracket is announced Sunday.',
    ],
  },
  {
    slug: 'football-quarterback-named-player-of-the-week',
    title: 'Quarterback named Liberty League offensive player of the week',
    kicker: 'Football',
    subdeck: 'Three touchdown passes and no turnovers earned the junior his second weekly honor of the season.',
    writeIn: 'Hannah Brooks',
    paragraphs: [
      'The junior quarterback threw for 287 yards and three touchdowns in Saturday\'s win, earning conference offensive player of the week honors.',
      'He has not thrown an interception in his last four games, a stretch in which RPI has averaged more than 30 points.',
      'Coaches credited the offensive line, which has allowed only two sacks during the same span.',
    ],
  },
  {
    slug: 'mens-soccer-advances-in-conference-tournament',
    title: "Men's soccer advances on penalty kicks",
    kicker: "Men's Soccer",
    subdeck: 'The Engineers converted all five attempts in the shootout after a scoreless 110 minutes.',
    paragraphs: [
      'Rensselaer advanced to the Liberty League semifinals after a 0-0 draw with St. Lawrence was decided 5-3 on penalty kicks.',
      'The RPI goalkeeper saved the third St. Lawrence attempt, and the Engineers made every one of theirs.',
      'RPI travels to the top seed for the semifinal on Friday.',
    ],
  },
  {
    slug: 'womens-soccer-ends-season-in-semifinal',
    title: "Women's soccer season ends in conference semifinal",
    kicker: "Women's Soccer",
    subdeck: 'A first-half goal held up for the hosts, but the Engineers finished with their most wins in five years.',
    writeIn: 'Elena Varga',
    paragraphs: [
      'Rensselaer\'s season ended with a 1-0 loss at William Smith in the Liberty League semifinals.',
      'The only goal came in the 31st minute, and RPI pushed numbers forward for most of the second half without finding an equalizer.',
      'The Engineers finish the year 11-5-2, their best record since 2020, and return most of their starting lineup.',
    ],
  },
  {
    slug: 'mens-lacrosse-wins-home-opener',
    title: "Men's lacrosse wins home opener in front of record crowd",
    kicker: "Men's Lacrosse",
    subdeck: 'A six-goal second quarter turned a tight game into a 15-8 win.',
    paragraphs: [
      'Rensselaer opened its home schedule with a 15-8 win over Union in front of the largest crowd in program history.',
      'The Engineers scored six unanswered goals in the second quarter to take control after the first period ended tied.',
      'Five different players scored at least twice, and the faceoff unit won 19 of 27 draws.',
    ],
  },
  {
    slug: 'womens-lacrosse-goalie-makes-career-high-saves',
    title: 'Goalie makes career-high 18 saves in upset of ranked opponent',
    kicker: "Women's Lacrosse",
    subdeck: 'RPI held a nationally ranked team to its lowest scoring output of the season.',
    writeIn: 'Jordan Ellis',
    paragraphs: [
      'The Rensselaer goalkeeper stopped 18 shots, a career high, as the Engineers upset a ranked opponent 9-7.',
      'RPI led for all but two minutes and closed the game by holding possession for most of the final four minutes.',
      'It is the program\'s first win over a ranked team in three seasons.',
    ],
  },
  {
    slug: 'swimming-breaks-two-school-records',
    title: 'Swimming and diving breaks two school records at invitational',
    kicker: 'Swimming & Diving',
    subdeck: 'Records fell in the 200 medley relay and the 100 butterfly over a three-day meet.',
    paragraphs: [
      'Rensselaer swimmers set two school records at a three-day invitational, in the 200-yard medley relay and the 100-yard butterfly.',
      'The relay team broke a record that had stood for eleven years, finishing third in a field of fourteen teams.',
      'The team now has a month of training before the conference championships.',
    ],
  },
  {
    slug: 'track-sprinter-qualifies-for-nationals',
    title: 'Sprinter qualifies for national championships in the 60 meters',
    kicker: 'Track & Field',
    subdeck: 'A personal best at the final qualifying meet put her inside the national cutoff.',
    writeIn: 'Samuel Ortiz',
    paragraphs: [
      'A Rensselaer sophomore qualified for the NCAA indoor championships in the 60-meter dash after running a personal best at the last qualifying meet of the season.',
      'Her time ranks among the top fifteen in Division III this winter.',
      'She is the first RPI woman to qualify for indoor nationals in a sprint event in more than a decade.',
    ],
  },
  {
    slug: 'cross-country-places-fourth-at-regionals',
    title: 'Cross country places fourth at regional championship',
    kicker: 'Cross Country',
    subdeck: 'Two runners earned all-region honors as the men narrowly missed a team bid to nationals.',
    paragraphs: [
      'The Rensselaer men\'s cross country team finished fourth at the regional championship, two places short of an automatic national bid.',
      'Two Engineers placed in the top 35 to earn all-region honors on a muddy course.',
      'Coaches said the team will learn on Sunday whether it receives an at-large selection.',
    ],
  },
  {
    slug: 'volleyball-wins-five-set-thriller',
    title: 'Volleyball rallies from two sets down to beat Bard',
    kicker: 'Volleyball',
    subdeck: 'The Engineers won the deciding set 15-12 behind a late serving run.',
    writeIn: 'Grace Kim',
    paragraphs: [
      'Rensselaer came back from a two-set deficit to beat Bard 3-2 at the East Campus Arena.',
      'Down 10-9 in the fifth set, RPI scored four straight points behind a run of tough serves to take control.',
      'The win clinches a home match in the first round of the conference tournament.',
    ],
  },
  {
    slug: 'baseball-spring-trip-recap',
    title: 'Baseball returns from spring trip at 6-4',
    kicker: 'Baseball',
    subdeck: 'Pitching depth carried the Engineers through ten games in eight days.',
    paragraphs: [
      'Rensselaer went 6-4 on its spring trip, playing ten games in eight days against teams from across the Northeast and Mid-Atlantic.',
      'The pitching staff posted a team ERA under three, and nine different pitchers made at least one appearance.',
      'The Engineers open their home schedule next weekend with a doubleheader.',
    ],
  },
  {
    slug: 'softball-walk-off-win-over-skidmore',
    title: 'Softball wins on walk-off single in extra innings',
    kicker: 'Softball',
    subdeck: 'A two-out hit in the ninth gave RPI a split of the Saturday doubleheader.',
    writeIn: 'Olivia Brennan',
    paragraphs: [
      'Rensselaer split a doubleheader with Skidmore, winning the second game 4-3 on a two-out walk-off single in the ninth inning.',
      'The Engineers dropped the opener 6-2 before their starting pitcher threw seven strong innings in the nightcap.',
      'RPI is 3-1 in conference play.',
    ],
  },
  {
    slug: 'field-hockey-senior-day-shutout',
    title: 'Field hockey celebrates senior day with shutout',
    kicker: 'Field Hockey',
    subdeck: 'Seven seniors were honored before a 3-0 win over Vassar.',
    paragraphs: [
      'Rensselaer honored seven seniors before blanking Vassar 3-0 in its regular-season home finale.',
      'Two of the goals came from seniors, and the defense allowed only four shots all game.',
      'The win keeps RPI in contention for a conference tournament berth heading into the final weekend.',
    ],
  },
  {
    slug: 'hockey-recruiting-class-announced',
    title: 'Hockey announces eight-player recruiting class',
    kicker: "Men's Hockey",
    subdeck: 'The class includes three defensemen and two goaltenders, positions the program flagged as priorities.',
    writeIn: 'Priya Desai',
    paragraphs: [
      'Rensselaer announced an eight-player recruiting class for next season, including three defensemen and two goaltenders.',
      'Coaches said the class was built to replace a large senior group that will graduate in the spring.',
      'Several of the incoming players are coming from junior leagues in the United States and Canada.',
    ],
  },
  {
    slug: 'big-red-freakout-preview',
    title: 'What to know before Big Red Freakout',
    kicker: "Men's Hockey",
    subdeck: 'Tickets, timing and traditions for the biggest hockey game of the year at Houston Field House.',
    paragraphs: [
      'Big Red Freakout returns to Houston Field House this weekend, with student tickets released through the athletics website on Monday morning.',
      'Doors open ninety minutes before puck drop, and the first students through the gate receive commemorative shirts.',
      'The game will also be streamed for fans who cannot get into the building.',
    ],
  },
  {
    slug: 'golf-finishes-second-at-fall-invitational',
    title: 'Golf finishes second at fall invitational',
    kicker: 'Golf',
    subdeck: 'A final-round 289 moved the Engineers up three places on the leaderboard.',
    writeIn: 'Theo Nakamura',
    paragraphs: [
      'Rensselaer finished second at its fall invitational after shooting a team score of 289 in the final round.',
      'The Engineers started the day fifth and moved up with three players breaking 75.',
      'The result ends the fall season on a high note before the team resumes play in the spring.',
    ],
  },
  {
    slug: 'tennis-sweeps-doubles-in-conference-opener',
    title: 'Tennis sweeps doubles in conference opener',
    kicker: 'Tennis',
    subdeck: 'An early 3-0 lead in doubles set up a 7-2 win over Hobart.',
    paragraphs: [
      'Rensselaer won all three doubles matches on the way to a 7-2 win over Hobart in its conference opener.',
      'The top doubles pair, playing together for the first time this season, won its match 8-3.',
      'RPI plays three more conference matches over the next two weeks.',
    ],
  },
  {
    slug: 'athletic-trainers-behind-the-scenes',
    title: 'The athletic trainers who keep 23 teams on the field',
    kicker: 'Sports Feature',
    subdeck: 'A small staff covers practices, games and rehab across every season, often starting before sunrise.',
    writeIn: 'Hannah Brooks',
    paragraphs: [
      'Rensselaer\'s athletic training staff covers 23 varsity teams, from early-morning hockey practices to late-night basketball games.',
      'Trainers said the busiest weeks are when fall and winter seasons overlap and both rehab and game coverage peak at the same time.',
      'Several athletes credited the staff with getting them back on the field after injuries they feared would end their seasons.',
    ],
  },
  {
    slug: 'club-sports-ultimate-frisbee-regionals',
    title: 'Ultimate frisbee club qualifies for regionals',
    kicker: 'Club Sports',
    subdeck: 'The team went unbeaten on day two of its sectional tournament.',
    paragraphs: [
      'Rensselaer\'s ultimate frisbee club qualified for regionals after going unbeaten on the second day of its sectional tournament.',
      'The team won its final game on universe point after trailing for most of the second half.',
      'Regionals will be held in two weeks, and the club is fundraising to cover travel costs.',
    ],
  },
  {
    slug: 'mens-basketball-falls-to-rochester',
    title: "Men's basketball falls to Rochester despite late run",
    kicker: "Men's Basketball",
    subdeck: 'RPI cut a 17-point deficit to three in the final minute but could not complete the comeback.',
    writeIn: 'Marcus Bell',
    paragraphs: [
      'Rensselaer lost 74-69 to Rochester after cutting a 17-point second-half deficit to three in the final minute.',
      'The Engineers forced four turnovers during a full-court press late in the game but missed two open threes that would have tied it.',
      'RPI is 2-2 in conference play with a home game against Vassar on Saturday.',
    ],
  },
]

// Fixture photos uploaded by `pnpm db:seed`; alternated across articles.
const PHOTO_FILENAMES = ['sports-action.webp', 'freakout-fans.webp']

const DAY_MS = 24 * 60 * 60 * 1000

async function main() {
  const payload = await getPayload({ config })

  const sportsEditor = await payload.find({
    collection: 'users',
    where: { email: { equals: 'sports@dev.local' } },
    limit: 1,
    depth: 0,
  })
  const authorId = sportsEditor.docs[0]?.id as number | undefined
  if (!authorId) {
    throw new Error('sports@dev.local not found. Run `pnpm db:seed` first.')
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
    throw new Error('No sports fixture photos found. Run `pnpm db:seed` first.')
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
        section: 'sports',
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

  console.log(`sports seed complete: ${created} created, ${ARTICLES.length - created} already present.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('sports seed failed:', err)
  process.exit(1)
})
