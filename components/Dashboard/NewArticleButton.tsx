import React from 'react'
import Link from 'next/link'

export const NewArticleButton = () => {
  return (
    <Link href="/admin/collections/articles/create" className="btn-new-article">
      + New Article
    </Link>
  )
}
