import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './style.css'
import {
  articleHref,
  getPolytechnicOnlineByYear,
  issueHref,
  type IssueWithArticles,
  type PoArticle,
} from '@/lib/polytechnicOnlineManifest'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Polytechnic Online Archive (2001–2009) — The Polytechnic',
  description:
    'A complete index of every issue of The Polytechnic published online between 2001 and 2009, drawn from the original poly.rpi.edu archive.',
  alternates: { canonical: '/archive/polytechnic-online' },
  openGraph: {
    title: 'Polytechnic Online Archive (2001–2009)',
    description:
      'A complete index of every issue of The Polytechnic published online between 2001 and 2009.',
    type: 'website',
    url: '/archive/polytechnic-online',
  },
}

type SearchParams = { year?: string; issue?: string }

export default async function PolytechnicOnlineArchivePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const groups = await getPolytechnicOnlineByYear()
  const totalIssues = groups.reduce((n, g) => n + g.issues.length, 0)
  const totalArticles = groups.reduce(
    (n, g) => n + g.issues.reduce((m, i) => m + i.articles.length, 0),
    0,
  )

  const selectedYear = params.year && groups.some((g) => g.year === params.year) ? params.year : null
  const selectedIssueId = params.issue ? Number(params.issue) : null

  return (
    <main className="min-h-screen bg-bg-main text-text-main">
      <Header />
      <div className="archive-paper border-t border-rule">
        <div className="mx-auto max-w-[1080px] px-5 pt-12 pb-24 sm:px-8">
          <header className="archive-masthead mb-10 border-b-2 border-rule-strong pb-8">
            <p className="font-meta mb-3 text-[11px] uppercase tracking-[0.32em] text-text-muted">
              The Polytechnic — Online Archive
            </p>
            <h1 className="font-copy text-4xl font-semibold leading-tight sm:text-5xl">
              Polytechnic Online, 2001 – 2009
            </h1>
            <p className="font-copy mt-4 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
              The first online editions of The Polytechnic, restored from the original{' '}
              <span className="italic">poly.rpi.edu</span> archive. Browse {totalIssues} issues and{' '}
              {totalArticles.toLocaleString()} articles by year and edition. Each headline links to
              the page as it appeared at the time.
            </p>
            <p className="font-meta mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
              <span>{groups.length} years</span>
              <span aria-hidden="true">·</span>
              <span>{totalIssues} issues</span>
              <span aria-hidden="true">·</span>
              <span>{totalArticles.toLocaleString()} articles</span>
              <span aria-hidden="true">·</span>
              <Link href="/archive" className="underline-offset-4 hover:underline">
                ← Newer archive
              </Link>
            </p>
          </header>

          <YearIndex groups={groups} selectedYear={selectedYear} />

          {selectedYear ? (
            <YearDetail
              groups={groups}
              year={selectedYear}
              selectedIssueId={selectedIssueId}
            />
          ) : (
            <PreviewAllYears groups={groups} />
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}

function YearIndex({
  groups,
  selectedYear,
}: {
  groups: { year: string; issues: IssueWithArticles[] }[]
  selectedYear: string | null
}) {
  return (
    <nav aria-label="Years" className="archive-year-rail mb-12">
      <ol className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/archive/polytechnic-online"
            className={`archive-year-chip ${selectedYear == null ? 'is-active' : ''}`}
          >
            All
          </Link>
        </li>
        {groups.map((g) => (
          <li key={g.year}>
            <Link
              href={`/archive/polytechnic-online?year=${g.year}`}
              className={`archive-year-chip ${g.year === selectedYear ? 'is-active' : ''}`}
            >
              <span className="archive-year-chip__year">{g.year}</span>
              <span className="archive-year-chip__count">{g.issues.length}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function PreviewAllYears({
  groups,
}: {
  groups: { year: string; issues: IssueWithArticles[] }[]
}) {
  return (
    <div className="space-y-12">
      {groups.map((g) => (
        <section key={g.year} aria-labelledby={`year-${g.year}`}>
          <header className="mb-4 flex items-baseline justify-between border-b border-rule pb-2">
            <h2
              id={`year-${g.year}`}
              className="font-display-news text-3xl tracking-wide sm:text-4xl"
            >
              {g.year}
            </h2>
            <Link
              href={`/archive/polytechnic-online?year=${g.year}`}
              className="font-meta text-[11px] uppercase tracking-[0.18em] text-text-muted hover:text-accent"
            >
              {g.issues.length} issues →
            </Link>
          </header>
          <ul className="archive-issue-grid">
            {g.issues.map((issue) => (
              <li key={issue.IssueID}>
                <Link
                  href={`/archive/polytechnic-online?year=${g.year}&issue=${issue.IssueID}`}
                  className="archive-issue-card"
                >
                  <span className="archive-issue-card__date">
                    {formatDate(issue.date_iso, issue.date)}
                  </span>
                  <span className="archive-issue-card__volnum">
                    Vol. {issue.volume ?? '?'} · No. {issue.number ?? '?'}
                  </span>
                  <span className="archive-issue-card__count">
                    {issue.articles.length} {issue.articles.length === 1 ? 'article' : 'articles'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function YearDetail({
  groups,
  year,
  selectedIssueId,
}: {
  groups: { year: string; issues: IssueWithArticles[] }[]
  year: string
  selectedIssueId: number | null
}) {
  const group = groups.find((g) => g.year === year)
  if (!group) return null
  return (
    <section aria-labelledby={`year-${year}`} className="space-y-8">
      <h2 id={`year-${year}`} className="font-display-news text-4xl tracking-wide sm:text-5xl">
        {year}
      </h2>
      <ol className="space-y-8">
        {group.issues.map((issue) => (
          <IssueRow
            key={issue.IssueID}
            year={year}
            issue={issue}
            expanded={selectedIssueId === issue.IssueID}
          />
        ))}
      </ol>
    </section>
  )
}

function IssueRow({
  year,
  issue,
  expanded,
}: {
  year: string
  issue: IssueWithArticles
  expanded: boolean
}) {
  return (
    <li className="archive-issue-row border-b border-rule pb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <Link
            href={issueHref(issue)}
            className="font-copy text-2xl font-semibold underline-offset-4 hover:underline"
          >
            {formatDate(issue.date_iso, issue.date)}
          </Link>
          <p className="font-meta mt-1 text-[11px] uppercase tracking-[0.18em] text-text-muted">
            Vol. {issue.volume ?? '?'} · No. {issue.number ?? '?'}
            {issue.db_issue_type && issue.db_issue_type !== 'Regular' ? (
              <span className="ml-3 italic normal-case tracking-normal">
                ({issue.db_issue_type})
              </span>
            ) : null}
          </p>
        </div>
        {!expanded ? (
          <Link
            href={`/archive/polytechnic-online?year=${year}&issue=${issue.IssueID}#issue-${issue.IssueID}`}
            className="font-meta text-[11px] uppercase tracking-[0.18em] text-text-muted hover:text-accent"
          >
            {issue.articles.length} {issue.articles.length === 1 ? 'article' : 'articles'} →
          </Link>
        ) : null}
      </div>

      {expanded ? <IssueArticles issue={issue} /> : null}

      {!expanded && issue.articles.length > 0 ? (
        <ul className="archive-issue-row__teaser mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {issue.articles.slice(0, 4).map((a) => (
            <li key={`${a.view}-${a.part}`} className="font-copy text-[15px] truncate">
              <span className="font-meta mr-2 text-[10px] uppercase tracking-[0.2em] text-text-muted">
                {a.section ?? ''}
              </span>
              {a.headline ?? '(untitled)'}
            </li>
          ))}
          {issue.articles.length > 4 ? (
            <li className="font-meta text-[10px] uppercase tracking-[0.2em] text-text-muted">
              +{issue.articles.length - 4} more
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  )
}

function IssueArticles({ issue }: { issue: IssueWithArticles }) {
  const sections = new Map<string, PoArticle[]>()
  for (const a of issue.articles) {
    const sec = a.section ?? 'Other'
    const arr = sections.get(sec) ?? []
    arr.push(a)
    sections.set(sec, arr)
  }
  return (
    <div id={`issue-${issue.IssueID}`} className="mt-5 space-y-6">
      {Array.from(sections.entries()).map(([sec, arts]) => (
        <div key={sec}>
          <h3 className="font-meta mb-2 text-[11px] uppercase tracking-[0.24em] text-text-muted">
            {sec}
          </h3>
          <ul className="space-y-1.5">
            {arts.map((a) => (
              <li key={`${a.view}-${a.part}`}>
                <a
                  href={articleHref(a)}
                  className="font-copy text-[17px] leading-snug underline-offset-[3px] hover:underline"
                >
                  {a.headline ?? '(untitled)'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function formatDate(iso: string | null, fallback: string | null): string {
  if (!iso) return fallback ?? '—'
  // iso is YYYY-MM-DD
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return fallback ?? iso
  const date = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return fallback ?? iso
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
