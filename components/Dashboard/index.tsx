import React, { Suspense } from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { Greeting } from './Greeting.tsx'
import { SearchBar } from './SearchBar.tsx'
import { Todos } from './Todos/index.tsx'
import { NewArticleButton } from './NewArticleButton.tsx'
import './styles.css' // We will add a simple CSS file for layout
import { User, Media, JobTitle } from '@/payload-types'

const Dashboard = async ({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })
  const isAdmin = user?.roles?.includes('admin')

  const { search } = await searchParams
  const rawSearchQuery = Array.isArray(search) ? search[0] : search
  const searchQuery = rawSearchQuery?.trim() || ''

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
  let globalResults: { collection: string; label: string; id: string | number }[] = []
  if (isAdmin && searchQuery) {
    const [users, media, jobTitles] = await Promise.all([
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
    ])

    globalResults = [
      ...users.docs.map((d: User) => ({
        collection: 'Users',
        label: `${d.firstName} ${d.lastName} (${d.email})`,
        id: d.id,
      })),
      ...media.docs.map((d: Media) => ({
        collection: 'Media',
        label: (d.filename as string) || (d.alt as string) || String(d.id),
        id: d.id,
      })),
      ...jobTitles.docs.map((d: JobTitle) => ({
        collection: 'Job Titles',
        label: d.title,
        id: d.id,
      })),
    ]
  }

  return (
    <div className="dashboard-container">
      {/* Header Section: Greeting + Action Button */}
      <div className="dashboard-header">
        <Greeting user={user} />
        <NewArticleButton />
      </div>

      {/* Search Bar */}
      <div className="dashboard-search">
        <Suspense fallback={<div>Loading search...</div>}>
          <SearchBar isAdmin={isAdmin} />
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
        {isAdmin && searchQuery && globalResults.length > 0 && (
          <div className="dashboard-global-results">
            <h2>Global Results</h2>
            <p className="subtext">Found in other collections</p>
            <div className="global-results-list">
              {globalResults.map((result, i) => (
                <a
                  key={`${result.collection}-${result.id}-${i}`}
                  href={`/admin/collections/${result.collection.toLowerCase().replace(' ', '-')}/${
                    result.id
                  }`}
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