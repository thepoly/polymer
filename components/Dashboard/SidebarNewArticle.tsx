'use client'
import React from 'react'
import Link from 'next/link'

export const SidebarNewArticle = () => {
  return (
    <div className="sidebar-new-article">
      <Link href="/admin/collections/articles/create" className="btn-new-article">
        <span className="btn-icon">+</span>
        <span className="btn-text">New Article</span>
      </Link>
    </div>
  )
}