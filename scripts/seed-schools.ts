/**
 * Seed the `schools` collection: every opponent on RPI Athletics schedules
 * (all sports, four seasons), each with the logo RPI Athletics shows for it.
 * The list lives in scripts/data/schools.json; logos are downloaded from the
 * listed URL (rpiathletics.com, or the conference site where RPI shows none).
 *
 * Re-running is idempotent: schools that already exist (matched by name) are
 * left alone, so editors' logo swaps and edits are never overwritten. The
 * exceptions only fill gaps: an existing school with no athletics website or
 * no logo gets the listed one.
 *
 * Usage: pnpm db:seed:schools
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '../payload.config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.resolve(__dirname, 'data', 'schools.json')

type SeedSchool = {
  name: string
  shortName: string
  conference: string | null
  logoUrl: string | null
  athleticsUrl: string | null
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function downloadLogo(school: SeedSchool) {
  if (!school.logoUrl) return null
  try {
    const res = await fetch(school.logoUrl, {
      headers: { 'User-Agent': 'The Polytechnic (poly.rpi.edu) sports desk' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const mimetype = (res.headers.get('content-type') || '').split(';')[0].trim()
    const ext = EXTENSIONS[mimetype]
    if (!ext) throw new Error(`unexpected content type "${mimetype}"`)
    const data = Buffer.from(await res.arrayBuffer())
    return { data, mimetype, name: `school-${slugify(school.name)}.${ext}`, size: data.length }
  } catch (err) {
    console.warn(`  ! logo download failed for ${school.name}: ${(err as Error).message}`)
    return null
  }
}

async function main() {
  const schools = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as SeedSchool[]
  const payload = await getPayload({ config })

  let created = 0
  let skipped = 0
  let linked = 0
  let logosAdded = 0
  let withoutLogo = 0

  for (const school of schools) {
    const existing = await payload.find({
      collection: 'schools',
      where: { name: { equals: school.name } },
      limit: 1,
      depth: 0,
    })
    const current = existing.docs[0]
    if (current) {
      if (!current.athleticsUrl && school.athleticsUrl) {
        await payload.update({
          collection: 'schools',
          id: current.id,
          data: { athleticsUrl: school.athleticsUrl },
        })
        linked++
      }
      if (!current.filename && school.logoUrl) {
        const file = await downloadLogo(school)
        if (file) {
          await payload.update({ collection: 'schools', id: current.id, data: {}, file })
          logosAdded++
          console.log(`  + logo for ${school.name}`)
        }
      }
      skipped++
      continue
    }

    const file = await downloadLogo(school)
    if (!file) withoutLogo++

    await payload.create({
      collection: 'schools',
      data: {
        name: school.name,
        shortName: school.shortName,
        conference: school.conference,
        athleticsUrl: school.athleticsUrl,
      },
      ...(file && { file }),
    })
    created++
    console.log(`  + ${school.name}${file ? '' : ' (no logo)'}`)

    // Go easy on rpiathletics.com
    if (file) await sleep(250)
  }

  console.log(
    `Schools: ${created} created, ${skipped} already present (${linked} given an athletics link, ${logosAdded} given a logo), ${withoutLogo} new without a logo.`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
