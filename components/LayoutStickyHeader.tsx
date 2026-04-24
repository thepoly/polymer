'use client';

import { usePathname } from 'next/navigation';
import ArticleStaticHeader from '@/components/Article/ArticleStaticHeader';

// Renders a scroll-triggered sticky header on every frontend page EXCEPT
// article pages (which render their own always-visible ArticleStaticHeader
// in their layout). Matches the article-page header exactly — same component,
// different mode — so the site's sticky chrome is consistent everywhere.
const ARTICLE_PATH = /^\/[^/]+\/\d{4}\/\d{2}\/[^/]+$/;
const LIVE_ARTICLE_PATH = /^\/live\/[^/]+$/;

export default function LayoutStickyHeader() {
  const pathname = usePathname() ?? '';
  if (ARTICLE_PATH.test(pathname) || LIVE_ARTICLE_PATH.test(pathname)) {
    return null;
  }
  return <ArticleStaticHeader />;
}
