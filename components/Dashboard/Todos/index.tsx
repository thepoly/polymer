import React from 'react'
import { TodoRow } from './TodoRow.tsx'
import type { Article } from '@/payload-types.ts'

export const Todos = ({ articles }: { articles: Article[] }) => {
  if (!articles || articles.length === 0) {
    return null
  }

  return (
    <div className="todos-list">
      {articles.map((article) => (
        <TodoRow key={article.id} article={article} />
      ))}
    </div>
  )
}