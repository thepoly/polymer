import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { Greeting } from './Greeting.tsx'
import { SearchBar } from './SearchBar.tsx'
import { Todos } from './Todos/index.tsx'
import { NewArticleButton } from './NewArticleButton.tsx'
import './styles.css' // We will add a simple CSS file for layout

const Dashboard = async () => {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  // Fetch only the latest 10 articles for the "Todos" list
  const articles = await payload.find({
    collection: 'articles',
    limit: 10,
    sort: '-updatedAt',
    depth: 1, // Populate authors to get names
  })

  return (
    <div className="dashboard-container">
      {/* Header Section: Greeting + Action Button */}
      <div className="dashboard-header">
        <Greeting user={user} />
        <NewArticleButton />
      </div>

      {/* Search Bar */}
      <div className="dashboard-search">
        <SearchBar />
      </div>

      {/* Todos / Article List */}
      {articles.docs.length > 0 && (
        <div className="dashboard-todos">
          <h2>I found these so you don&apos;t have to.</h2>
          <p className="subtext">You&apos;re welcome.</p>
          <Todos articles={articles.docs} />
        </div>
      )}
    </div>
  )
}

export default Dashboard