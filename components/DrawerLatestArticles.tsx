'use client';

import { useEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { extractTextFromLexical, renderLexicalHeadline } from '@/utils/formatArticle';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { formatRelativeTime } from '@/components/LiveArticle/relativeTime';
import { troyDay, TROY_TIME_ZONE } from '@/lib/troyTime';

const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';
const PHONE_QUERY = '(max-width: 767px)';
const sections = ['news', 'features', 'opinion', 'sports'];
type LatestArticle = {
  href: string;
  section: string;
  title: ReactNode;
  publishedDate: string;
  dateLabel: string;
};

let cached: { expires: number; articles: LatestArticle[] } | undefined;
let pending: Promise<LatestArticle[]> | undefined;

function subscribeToViewport(callback: () => void) {
  const queries = [PHONE_QUERY, TABLET_QUERY].map(query => window.matchMedia(query));
  queries.forEach(media => media.addEventListener('change', callback));
  return () => queries.forEach(media => media.removeEventListener('change', callback));
}
const articleCount = () => window.matchMedia(TABLET_QUERY).matches ? 3 : window.matchMedia(PHONE_QUERY).matches ? 1 : 0;
const serverSnapshot = () => 0;

function publicationLabel(date: Date, now: Date) {
  const day = troyDay(date);
  const today = troyDay(now);
  if (day === today) return formatRelativeTime(date, now);
  if (Date.parse(today) - Date.parse(day) === 86400000) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    timeZone: TROY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
  });
}

async function loadLatest(): Promise<LatestArticle[]> {
  if (cached && cached.expires > Date.now()) return cached.articles;
  if (pending) return pending;
  pending = (async () => {
    const now = new Date();
    const query = new URLSearchParams({
      'where[_status][equals]': 'published',
      'where[publishedDate][less_than_equal]': now.toISOString(),
      sort: '-publishedDate,-id',
      limit: '3',
      depth: '0',
      'select[_status]': 'true',
      'select[title]': 'true',
      'select[plainTitle]': 'true',
      'select[section]': 'true',
      'select[slug]': 'true',
      'select[publishedDate]': 'true',
    });
    // Use the existing public collection API without staff cookies, requesting
    // only the summary fields this menu displays.
    const response = await fetch(`/api/articles?${query}`, { credentials: 'omit' });
    if (!response.ok) throw new Error('Latest articles request failed');
    const data: { docs?: unknown } = await response.json();
    const articles: LatestArticle[] = [];
    for (const value of Array.isArray(data.docs) ? data.docs : []) {
      if (!value || typeof value !== 'object') continue;
      const article = value as Record<string, unknown>;
      if (article._status !== 'published' || typeof article.section !== 'string' || !sections.includes(article.section)
        || typeof article.slug !== 'string' || !article.slug || typeof article.publishedDate !== 'string') continue;
      const date = new Date(article.publishedDate);
      if (!Number.isFinite(date.getTime()) || date > now) continue;
      const title = extractTextFromLexical(article.title) || article.plainTitle;
      if (typeof title !== 'string' || !title.trim()) continue;
      const href = getArticleUrl({ section: article.section, slug: article.slug, publishedDate: article.publishedDate });
      if (href === '#' || articles.some(item => item.href === href)) continue;
      articles.push({
        href,
        section: article.section,
        title: renderLexicalHeadline(article.title) || title,
        publishedDate: article.publishedDate,
        dateLabel: publicationLabel(date, now),
      });
      if (articles.length === 3) break;
    }
    cached = { expires: Date.now() + 60000, articles };
    return articles;
  })().finally(() => { pending = undefined; });
  return pending;
}

export default function DrawerLatestArticles({ isOpen, onLinkClick }: {
  isOpen: boolean;
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const count = useSyncExternalStore(subscribeToViewport, articleCount, serverSnapshot);
  const [articles, setArticles] = useState<LatestArticle[]>([]);

  useEffect(() => {
    if (!isOpen || count === 0) return;
    let active = true;
    void loadLatest().then(items => { if (active) setArticles(items); }).catch(() => {
      // Keep navigation available if the optional latest feed cannot load.
    });
    return () => { active = false; };
  }, [isOpen, count]);

  if (count === 0 || articles.length === 0) return null;
  return (
    <section aria-label="Latest articles" className="pb-2 lg:hidden">
      <h2 className="mb-2 flex items-center gap-3 font-meta text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
        Latest<span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </h2>
      {articles.slice(0, count).map(article => (
        <Link
          key={article.href}
          href={article.href}
          onClick={event => onLinkClick(event, article.href)}
          className="group block border-b border-rule py-3 last:border-b-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <span className="block font-meta text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{article.section}</span>
          <span className="mt-1 block font-copy text-[20px] font-normal leading-[1.18] text-text-main group-hover:text-accent [&_strong]:font-normal [&_b]:font-normal">{article.title}</span>
          <time dateTime={article.publishedDate} className="mt-1 block font-meta text-[12px] font-medium leading-[1.3] text-text-muted">{article.dateLabel}</time>
        </Link>
      ))}
    </section>
  );
}
