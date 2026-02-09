'use client'
import React from 'react'

export const SidebarNewArticle = () => {
  return (
    <div className="sidebar-new-article">
      <a href="/admin/collections/articles/create" className="btn-new-article">
        <span className="btn-icon">+</span>
        <span className="btn-text">New Article</span>
      </a>
    </div>
  )
}