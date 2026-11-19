'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const NAV_LINK_ID = 'nav-news-page-layout'
const HOST_ID = 'nav-news-page-layout-pages'

const PAGES = [
  { param: 'senate', label: 'Senate page' },
  { param: 'executive-board', label: 'Executive Board page' },
]

/**
 * Arrow beside "News Layout" in the sidebar that opens the Senate and
 * Executive Board page editors (the News Layout edit view with
 * `?page=senate` / `?page=executive-board`).
 *
 * Payload's sidebar has no nested items, so this mounts from `afterNavLinks`
 * and portals into a small container placed right after the News Layout
 * link. It re-places the container if the sidebar re-renders.
 */
export function NewsLayoutNavDropdown() {
  const pathname = usePathname()
  const page = useSearchParams().get('page')
  const [host, setHost] = useState<HTMLElement | null>(null)
  // The arrow sits on the News Layout link's row, just above the container
  const [linkHeight, setLinkHeight] = useState(0)
  const [docId, setDocId] = useState<string | null>(null)
  const [openState, setOpen] = useState<boolean | null>(null)

  const onLayoutPath = pathname.includes('/collections/news-page-layout')
  const activePage = onLayoutPath ? page : null
  // Open by default while one of its pages is showing
  const open = openState ?? Boolean(activePage)

  // Keep a container directly after the News Layout link
  useEffect(() => {
    const place = () => {
      const link = document.getElementById(NAV_LINK_ID)
      if (!link) return
      let el = document.getElementById(HOST_ID)
      if (!el) {
        el = document.createElement('div')
        el.id = HOST_ID
        el.className = 'nav-subpages'
      }
      if (link.nextElementSibling !== el) link.insertAdjacentElement('afterend', el)
      setHost(el)
      setLinkHeight(link.offsetHeight)
    }
    place()
    const nav = document.querySelector('nav') ?? document.body
    const observer = new MutationObserver(place)
    observer.observe(nav, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  // The editors live on the layout document's edit view
  useEffect(() => {
    fetch('/api/news-page-layout?limit=1&depth=0&select[name]=true')
      .then((r) => r.json())
      .then((data) => {
        const id = data?.docs?.[0]?.id
        if (id != null) setDocId(String(id))
      })
      .catch(() => {})
  }, [])

  if (!host) return null
  const base = `/newsroom/collections/news-page-layout/${docId ?? 'create'}`

  return createPortal(
    <>
      <button
        type="button"
        className={`nav-subpages__toggle ${open ? 'nav-subpages__toggle--open' : ''}`}
        aria-expanded={open}
        aria-controls={`${HOST_ID}-list`}
        aria-label={open ? 'Hide Senate and Executive Board pages' : 'Show Senate and Executive Board pages'}
        style={{ height: linkHeight || undefined }}
        onClick={() => setOpen(!open)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div id={`${HOST_ID}-list`} className="nav-subpages__list">
          {PAGES.map((p) => (
            <Link
              key={p.param}
              href={`${base}?page=${p.param}`}
              className={`nav__link nav-subpages__link ${activePage === p.param ? 'nav-subpages__link--active' : ''}`}
              prefetch={false}
            >
              {activePage === p.param && <div className="nav__link-indicator" />}
              <span className="nav__link-label">{p.label}</span>
            </Link>
          ))}
        </div>
      )}
    </>,
    host,
  )
}
