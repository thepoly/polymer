import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import pg from 'pg'
import config from '@/payload.config'
import { findMatchRanges, type HighlightRange } from '@/lib/transcribe/highlight'

let pool: pg.Pool | null = null
function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

const STAFF_VIEW_ROLES = ['admin', 'eic', 'editor']

interface SearchRow {
  transcript_id: number
  audio_job_id: number
  title: string
  kind: string
  uploader_id: number
  searchable_text: string
  rank: number
}

interface SnippetResult {
  transcript_id: number
  audio_job_id: number
  title: string
  kind: string
  uploader_id: number
  snippet: string
  ranges: HighlightRange[]
  rank: number
}

const SNIPPET_MAX = 240

function buildSnippet(text: string, ranges: HighlightRange[]): { snippet: string; ranges: HighlightRange[] } {
  if (!ranges.length) return { snippet: text.slice(0, SNIPPET_MAX), ranges: [] }
  const first = ranges[0]
  const radius = Math.floor(SNIPPET_MAX / 2)
  let start = Math.max(0, first.start - radius)
  let end = Math.min(text.length, start + SNIPPET_MAX)
  // Trim to nearest word boundaries when possible.
  if (start > 0) {
    const ws = text.lastIndexOf(' ', start)
    if (ws > 0) start = ws + 1
  }
  if (end < text.length) {
    const ws = text.indexOf(' ', end)
    if (ws > 0 && ws - start <= SNIPPET_MAX + 40) end = ws
  }
  const snippet = (start > 0 ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '')
  const offset = start > 0 ? 2 : 0
  const adjustedRanges = ranges
    .map((r) => ({ start: r.start - start + offset, end: r.end - start + offset }))
    .filter((r) => r.end > 0 && r.start < snippet.length)
    .map((r) => ({ start: Math.max(0, r.start), end: Math.min(snippet.length, r.end) }))
  return { snippet, ranges: adjustedRanges }
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ results: [] })

  const u = user as unknown as { id: number; roles?: string[] }
  const isStaff = Boolean(u.roles?.some((r) => STAFF_VIEW_ROLES.includes(r)))

  const sqlBase = `
    SELECT t.id AS transcript_id,
           t.audio_job_id,
           j.title,
           j.kind,
           j.uploader_id,
           coalesce(t.searchable_text, '') AS searchable_text,
           ts_rank(to_tsvector('english', coalesce(t.searchable_text, '')),
                   websearch_to_tsquery('english', $1)) AS rank
      FROM transcripts t
      JOIN audio_jobs j ON j.id = t.audio_job_id
     WHERE to_tsvector('english', coalesce(t.searchable_text, '')) @@ websearch_to_tsquery('english', $1)
  `
  const sql = isStaff
    ? `${sqlBase} ORDER BY rank DESC LIMIT 50`
    : `${sqlBase} AND j.uploader_id = $2 ORDER BY rank DESC LIMIT 50`
  const args = isStaff ? [q] : [q, u.id]

  const { rows } = await getPool().query<SearchRow>(sql, args)
  const results: SnippetResult[] = rows.map((row) => {
    const ranges = findMatchRanges(row.searchable_text, q)
    const { snippet, ranges: snippetRanges } = buildSnippet(row.searchable_text, ranges)
    return {
      transcript_id: row.transcript_id,
      audio_job_id: row.audio_job_id,
      title: row.title,
      kind: row.kind,
      uploader_id: row.uploader_id,
      snippet,
      ranges: snippetRanges,
      rank: row.rank,
    }
  })
  return NextResponse.json({ results })
}
