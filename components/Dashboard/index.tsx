import React, { Suspense } from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { Greeting } from './Greeting.tsx'
import { NewsroomMovedNotice } from './NewsroomMovedNotice.tsx'
import { SidebarNewArticle } from '@/components/Dashboard/SidebarNewArticle.tsx'
import { SearchBar } from './SearchBar.tsx'
import { Todos } from './Todos/index.tsx'
import './styles.css' // We will add a simple CSS file for layout
import { User, Media, JobTitle } from '@/payload-types'

const VERSION_CHART_COLORS = ['#0f62fe', '#16a34a', '#f97316', '#d6001c', '#7c3aed', '#0891b2', '#eab308', '#ec4899']

const buildVersionChartGradient = (
  items: { version: string; count: number; color: string }[],
  totalUsers: number,
) => {
  if (totalUsers <= 0 || items.length === 0) {
    return 'conic-gradient(#d1e6f7 0deg 360deg)'
  }

  let currentPercent = 0
  const stops = items.map(({ count, color }) => {
    const start = currentPercent
    currentPercent += (count / totalUsers) * 100
    return `${color} ${start}% ${currentPercent}%`
  })

  return `conic-gradient(${stops.join(', ')})`
}

const Dashboard = async ({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()
  const { user: authUser } = await payload.auth({ headers: headersList })
  const user = authUser ? await payload.findByID({
    collection: 'users',
    id: authUser.id,
    depth: 1,
  }) : null
  const shouldShowNewsroomMoveNotice =
    ((user as (User & { latestVersion?: string | null }) | null)?.latestVersion || '0.0.0') !==
    '1.0.0'
  const isAdmin = Boolean(user?.roles?.includes('admin'))

  const { search } = await searchParams
  const rawSearchQuery = Array.isArray(search) ? search[0] : search
  const searchQuery = rawSearchQuery?.trim() || ''

  let versionChartData: { version: string; count: number; color: string }[] = []
  let totalActiveUsers = 0

  if (isAdmin) {
    const usersByVersion = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        or: [
          {
            retired: {
              equals: false,
            },
          },
          {
            retired: {
              exists: false,
            },
          },
        ],
      },
    })

    const counts = new Map<string, number>()

    for (const staffUser of usersByVersion.docs as User[]) {
      const version = staffUser.latestVersion?.trim() || '0.0.0'
      counts.set(version, (counts.get(version) || 0) + 1)
    }

    versionChartData = Array.from(counts.entries())
      .sort(([versionA], [versionB]) =>
        versionA.localeCompare(versionB, undefined, { numeric: true, sensitivity: 'base' }),
      )
      .map(([version, count], index) => ({
        version,
        count,
        color: VERSION_CHART_COLORS[index % VERSION_CHART_COLORS.length],
      }))

    totalActiveUsers = versionChartData.reduce((sum, item) => sum + item.count, 0)
  }

  // Fetch articles, optionally filtering by title if a search query is provided
  const articles = await payload.find({
    collection: 'articles',
    limit: 10,
    sort: '-updatedAt',
    depth: 1, // Populate authors to get names
    where: searchQuery
      ? {
          title: {
            contains: searchQuery,
          },
        }
      : {},
  })

  // Global search for admins
  let globalResults: { collection: string; label: string; href: string }[] = []
  if (searchQuery) {
    const [users, media, jobTitles, layouts, opinionPageLayouts] = await Promise.all([
      payload.find({
        collection: 'users',
        limit: 5,
        where: {
          or: [
            { email: { contains: searchQuery } },
            { firstName: { contains: searchQuery } },
            { lastName: { contains: searchQuery } },
          ],
        },
      }),
      payload.find({
        collection: 'media',
        limit: 5,
        where: {
          or: [{ filename: { contains: searchQuery } }, { alt: { contains: searchQuery } }],
        },
      }),
      payload.find({
        collection: 'job-titles',
        limit: 5,
        where: {
          title: { contains: searchQuery },
        },
      }),
      payload.find({
        collection: 'layout',
        limit: 5,
        where: {
          name: { contains: searchQuery },
        },
      }),
      payload.find({
        collection: 'opinion-page-layout',
        limit: 5,
        where: {
          or: [
            { name: { contains: searchQuery } },
            { editorsChoiceLabel: { contains: searchQuery } },
          ],
        },
      }),
    ])

    globalResults = [
      ...users.docs.map((d: User) => ({
        collection: 'Users',
        label: `${d.firstName} ${d.lastName} (${d.email})`,
        href: `/newsroom/collections/users/${d.id}`,
      })),
      ...media.docs.map((d: Media) => ({
        collection: 'Media',
        label: (d.filename as string) || (d.alt as string) || String(d.id),
        href: `/newsroom/collections/media/${d.id}`,
      })),
      ...jobTitles.docs.map((d: JobTitle) => ({
        collection: 'Job Titles',
        label: d.title,
        href: `/newsroom/collections/job-titles/${d.id}`,
      })),
      ...layouts.docs.map((d: { id: string | number; name?: string | null }) => ({
        collection: 'Skeletons & Layouts',
        label: d.name || `Layout ${d.id}`,
        href: `/newsroom/collections/layout/${d.id}`,
      })),
      ...opinionPageLayouts.docs.map((d: { id: string | number; name?: string | null }) => ({
        collection: 'Opinion Layouts',
        label: d.name || `Opinion layout ${d.id}`,
        href: `/newsroom/collections/opinion-page-layout/${d.id}`,
      })),
    ]
  }

  return (
    <div className="dashboard-container">
      <NewsroomMovedNotice shouldShow={shouldShowNewsroomMoveNotice} />
      <SidebarNewArticle />
      {/* Header Section: Greeting (includes Profile Picture & New Article Button) */}
      <div className="dashboard-header">
        <Greeting user={user} />
      </div>

      {isAdmin && (
        <div className="dashboard-version-chart">
          <div
            className="dashboard-version-chart-graphic"
            aria-label="User version breakdown"
            role="img"
            style={{ backgroundImage: buildVersionChartGradient(versionChartData, totalActiveUsers) }}
          />
          <div className="dashboard-version-chart-copy">
            <h2>Polymer version rollout</h2>
            <p className="subtext">
              {totalActiveUsers} unretired users across {versionChartData.length || 1} version
              {versionChartData.length === 1 ? '' : 's'}
            </p>
            <div className="dashboard-version-chart-legend">
              {versionChartData.map((item) => (
                <div key={item.version} className="dashboard-version-chart-item">
                  <span
                    className="dashboard-version-chart-swatch"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="dashboard-version-chart-version">{item.version}</span>
                  <span className="dashboard-version-chart-count">
                    {item.count} user{item.count === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="dashboard-search">
        <Suspense fallback={<div>Loading search...</div>}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="dashboard-content">
        {/* Articles Section (always shown if articles found) */}
        <div className="dashboard-articles-section">
          {articles.docs.length > 0 ? (
            <div className="dashboard-todos">
              <h2>
                {searchQuery
                  ? `Articles matching "${searchQuery}"`
                  : "I found these so you don't have to."}
              </h2>
              <p className="subtext">
                {searchQuery ? `${articles.docs.length} articles found.` : "You're welcome."}
              </p>
              <Todos articles={articles.docs} />
            </div>
          ) : (
            <div className="dashboard-todos">
              <h2>{searchQuery ? `No articles for "${searchQuery}"` : "No articles found."}</h2>
              <p className="subtext">
                {searchQuery
                  ? "Try a different search term?"
                  : "Start by creating your first article!"}
              </p>
            </div>
          )}
        </div>

        {/* Global Search Results (Admin Only) */}
        {searchQuery && globalResults.length > 0 && (
          <div className="dashboard-global-results">
            <h2>Global Results</h2>
            <p className="subtext">Found in other collections</p>
            <div className="global-results-list">
              {globalResults.map((result, i) => (
                <a
                  key={`${result.collection}-${result.href}-${i}`}
                  href={result.href}
                  className="global-result-item"
                >
                  <span className="result-collection">{result.collection}</span>
                  <span className="result-label">{result.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
