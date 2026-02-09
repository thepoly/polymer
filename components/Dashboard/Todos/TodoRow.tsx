import React from 'react'
import Link from 'next/link'
import type { Article, User } from '@/payload-types.ts'
import { StatusBadge } from '@/components/StatusBadge'

// Helper to format dates nicely
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Unscheduled'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export const TodoRow = ({ article }: { article: Article }) => {
  return (
    <Link href={`/admin/collections/articles/${article.id}`} className="todo-row">
      <div className="todo-col-main">
        <span className="todo-title">{article.title || 'Untitled'}</span>
        <span className="todo-meta">
           {article.section} • {article.authors?.map((a) => (a as User).firstName).join(', ')}
        </span>
      </div>
      
      <div className="todo-col-status">
        <StatusBadge cellData={article._status === 'published' ? 'published' : (article.status || 'draft')} />
      </div>

      <div className="todo-col-date">
        {formatDate(article.publishedDate)}
      </div>
    </Link>
  )
}