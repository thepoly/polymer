import { cache } from 'react'

export type PoIssue = {
  IssueID: number
  volume: number | null
  number: number | null
  date: string | null
  date_iso: string | null
  local_path: string
  db_issue_type: string | null
}

export type PoArticle = {
  view: number
  part: number
  headline: string | null
  section: string | null
  posted_iso: string | null
  local_path: string
  IssueID: number | null
  articleID: number | null
}

export type PoManifest = {
  generated_at: string
  stats: Record<string, number>
  issues: PoIssue[]
  articles: PoArticle[]
}

const MANIFEST_URL =
  process.env.POLYTECHNIC_ONLINE_MANIFEST_URL
  ?? 'http://127.0.0.1:8080/archive/polytechnic-online/manifest.json'

export const getPolytechnicOnlineManifest = cache(async (): Promise<PoManifest> => {
  const res = await fetch(MANIFEST_URL, { next: { revalidate: 3600 } })
  if (!res.ok) {
    throw new Error(`polytechnic-online manifest fetch ${res.status}: ${MANIFEST_URL}`)
  }
  return res.json() as Promise<PoManifest>
})

export type IssueWithArticles = PoIssue & { articles: PoArticle[] }
export type YearGroup = { year: string; issues: IssueWithArticles[] }

export const getPolytechnicOnlineByYear = cache(async (): Promise<YearGroup[]> => {
  const m = await getPolytechnicOnlineManifest()
  const byIssue = new Map<number, PoArticle[]>()
  for (const a of m.articles) {
    if (a.IssueID == null) continue
    const arr = byIssue.get(a.IssueID) ?? []
    arr.push(a)
    byIssue.set(a.IssueID, arr)
  }
  const issues = m.issues
    .map((i) => ({
      ...i,
      articles: (byIssue.get(i.IssueID) ?? []).sort(sortArticlesBySection),
    }))
    .sort((a, b) => (a.date_iso ?? '').localeCompare(b.date_iso ?? ''))
  const years = new Map<string, IssueWithArticles[]>()
  for (const issue of issues) {
    const y = issue.date_iso?.slice(0, 4) ?? 'unknown'
    const arr = years.get(y) ?? []
    arr.push(issue)
    years.set(y, arr)
  }
  return Array.from(years.entries())
    .map(([year, issues]) => ({ year, issues }))
    .sort((a, b) => b.year.localeCompare(a.year))
})

const SECTION_ORDER: Record<string, number> = {
  'News': 1,
  'Editorial/Opinion': 2,
  'Editorial': 2,
  'Opinion': 2,
  'Features': 3,
  'Sports': 4,
  'Photos': 5,
}

function sortArticlesBySection(a: PoArticle, b: PoArticle): number {
  const sa = SECTION_ORDER[a.section ?? ''] ?? 99
  const sb = SECTION_ORDER[b.section ?? ''] ?? 99
  if (sa !== sb) return sa - sb
  return (a.headline ?? '').localeCompare(b.headline ?? '')
}

export function articleHref(a: PoArticle): string {
  return `/archive/polytechnic-online/${encodeArchivePath(a.local_path)}`
}

export function issueHref(i: PoIssue): string {
  return `/archive/polytechnic-online/${encodeArchivePath(i.local_path)}`
}

function encodeArchivePath(p: string): string {
  return p.split('/').map((seg) => encodeURIComponent(seg)).join('/')
}
