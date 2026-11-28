/**
 * Puts the vetted Student Senate (and Executive Board) stories that were
 * filed under other kickers or sections on their timelines, the same as
 * pressing Add in the page editor's Archive finder: their ids are added to
 * `news-page-layout` → `layout.timelinePages[body].included`.
 *
 * The list lives in scripts/data/student-gov-archive.json, reviewed by hand
 * from the live archive. Stories are matched by slug and publish date (Troy),
 * so a database without them (local dev) just skips them.
 *
 * Safe to re-run: ids already added are kept and nothing is removed. Run it
 * once; after that, editors manage additions in the page editors (a story
 * they Remove would come back if this ran again).
 *
 * Usage: pnpm db:seed:student-gov-archive
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '../payload.config'
import { normalizeTimelinePages } from '../components/News/timelinePage'
import { troyDayKey } from '../components/News/studentGovTerms'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.resolve(__dirname, 'data', 'student-gov-archive.json')

type ArchiveStory = { slug: string; date: string; title: string }
type ArchiveData = { senate: ArchiveStory[]; eboard: ArchiveStory[] }

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as ArchiveData
  const payload = await getPayload({ config })

  // The one News Layout document (created if this database has none yet)
  const found = await payload.find({ collection: 'news-page-layout', limit: 1, depth: 0 })
  const doc = found.docs[0] ?? (await payload.create({ collection: 'news-page-layout', data: { name: 'News Layout' } }))
  const layout = (doc.layout ?? {}) as Record<string, unknown>
  const pages = normalizeTimelinePages(layout.timelinePages)

  for (const body of ['senate', 'eboard'] as const) {
    const included = new Set(pages[body].included)
    const before = included.size
    const missing: string[] = []
    for (const story of data[body]) {
      const res = await payload.find({
        collection: 'articles',
        where: { and: [{ slug: { equals: story.slug } }, { _status: { equals: 'published' } }] },
        limit: 5,
        depth: 0,
        select: { slug: true, publishedDate: true, createdAt: true },
      })
      const match = res.docs.find((a) => troyDayKey(a.publishedDate || a.createdAt) === story.date)
      if (match) included.add(match.id)
      else missing.push(`${story.date} ${story.slug}`)
    }
    pages[body] = { ...pages[body], included: [...included] }
    console.log(
      `${body}: ${included.size - before} added, ${data[body].length - missing.length - (included.size - before)} already there, ${missing.length} not in this database`,
    )
  }

  await payload.update({
    collection: 'news-page-layout',
    id: doc.id,
    data: { layout: { ...layout, timelinePages: pages } },
  })
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
