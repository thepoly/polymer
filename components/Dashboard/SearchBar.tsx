'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export const SearchBar = ({ isAdmin }: { isAdmin?: boolean }) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  
  const currentSearch = searchParams.get('search') || ''
  const [query, setQuery] = useState(currentSearch)
  const isFocused = useRef(false)

  // Sync state with URL (e.g. back button) ONLY if not focused.
  // We use an effect here because we need to check the focus ref, 
  // which cannot be done during render.
  useEffect(() => {
    if (!isFocused.current && currentSearch !== query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(currentSearch)
    }
  }, [currentSearch, query])

  // Live search effect - no debounce for "instant" feel
  useEffect(() => {
    const trimmedQuery = query.trim()
    const params = new URLSearchParams(searchParams.toString())
    
    if (trimmedQuery) {
      params.set('search', trimmedQuery)
    } else {
      params.delete('search')
    }
    
    const queryString = params.toString()
    const currentQueryString = window.location.search.replace(/^\?/, '')
    
    if (queryString !== currentQueryString) {
      const newPath = queryString ? `${pathname}?${queryString}` : pathname
      router.replace(newPath, { scroll: false })
    }
  }, [query, pathname, router, searchParams])

  return (
    <div className="search-form">
      <input
        type="text"
        placeholder={isAdmin ? "Search everything..." : "Search articles..."}
        value={query}
        onFocus={() => { isFocused.current = true }}
        onBlur={() => { isFocused.current = false }}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
    </div>
  )
}