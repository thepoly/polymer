import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getPayload, type CollectionSlug } from 'payload';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import config from '@/payload.config';
import Footer from '@/components/Footer';
import ArticleStaticHeader from '@/components/Article/ArticleStaticHeader';
import { ArticleDivider } from '@/components/Article/ArticleDivider';
import { SerializeLexical, type LexicalNode } from '@/components/Article/RichTextParser';
import { extractTextFromLexical, renderLexicalHeadline } from '@/utils/formatArticle';
import LiveBadge from '@/components/LiveArticle/LiveBadge';
import LiveUpdate from '@/components/LiveArticle/LiveUpdate';
import { formatRelativeTime } from '@/components/LiveArticle/relativeTime';

export const revalidate = 30;

// ---- Local types ----
// The live-articles collection lives on a parallel branch, so payload-types
// is not yet updated. We declare a local contract and cast at the boundary.

type LiveArticleSummaryItem = {
  id: string;
  label: string;
  body: SerializedEditorState;
};

type LiveArticleUpdate = {
  id: string;
  timestamp: string;
  heading?: string;
  author: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: { url: string; alt?: string } | null;
  };
  body: SerializedEditorState;
};

type LiveArticle = {
  id: string;
  title: SerializedEditorState;
  plainTitle: string;
  slug: string;
  section: string;
  hero: { url: string; alt?: string; width?: number; height?: number; caption?: string };
  summary?: LiveArticleSummaryItem[];
  updates: LiveArticleUpdate[];
  publishedDate?: string;
  updatedAt: string;
};

type Args = {
  params: Promise<{ slug: string }>;
};

// The collection slug isn't in the generated union yet on this worktree, so
// we cast the string to CollectionSlug where payload requires it.
const LIVE_COLLECTION = 'live-articles' as unknown as CollectionSlug;

const getLiveArticle = cache(async (slug: string): Promise<LiveArticle | undefined> => {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      collection: LIVE_COLLECTION,
      where: {
        and: [
          { slug: { equals: slug } },
          { _status: { equals: 'published' } },
        ],
      },
      limit: 1,
      depth: 2,
    });
    const doc = result.docs[0] as unknown as LiveArticle | undefined;
    return doc;
  } catch {
    // Collection may not exist yet in this worktree; fail closed to 404.
    return undefined;
  }
});

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  try {
    const articles = await payload.find({
      collection: LIVE_COLLECTION,
      where: { _status: { equals: 'published' } },
      limit: 1000,
      depth: 0,
    });
    return (articles.docs as unknown as Array<{ slug?: string | null }>)
      .filter((doc) => typeof doc.slug === 'string' && doc.slug.length > 0)
      .map((doc) => ({ slug: doc.slug as string }));
  } catch {
    return [];
  }
}

function firstSummaryBodyText(article: LiveArticle): string | undefined {
  const first = article.summary?.[0];
  if (!first) return undefined;
  const text = extractTextFromLexical(first.body).trim();
  return text.length ? text : undefined;
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  const article = await getLiveArticle(slug);
  if (!article) return {};

  const description =
    firstSummaryBodyText(article) ||
    `Live coverage from The Polytechnic: ${article.plainTitle}.`;

  return {
    title: article.plainTitle,
    description,
    alternates: { canonical: `/live/${article.slug}` },
    openGraph: {
      title: article.plainTitle,
      description,
      type: 'article',
      url: `/live/${article.slug}`,
      publishedTime: article.publishedDate,
      modifiedTime: article.updatedAt,
      ...(article.hero?.url && {
        images: [{ url: article.hero.url, alt: article.hero.alt || article.plainTitle }],
      }),
    },
    twitter: {
      card: article.hero?.url ? 'summary_large_image' : 'summary',
      title: article.plainTitle,
      description,
      ...(article.hero?.url && { images: [article.hero.url] }),
    },
  };
}

function latestTimestamp(article: LiveArticle): string | undefined {
  const candidates: number[] = [];
  if (article.publishedDate) {
    const t = Date.parse(article.publishedDate);
    if (!Number.isNaN(t)) candidates.push(t);
  }
  for (const u of article.updates || []) {
    const t = Date.parse(u.timestamp);
    if (!Number.isNaN(t)) candidates.push(t);
  }
  if (!candidates.length) return article.updatedAt;
  return new Date(Math.max(...candidates)).toISOString();
}

export default async function LiveArticlePage({ params }: Args) {
  const { slug } = await params;
  const article = await getLiveArticle(slug);
  if (!article) notFound();

  const updatesSorted = [...(article.updates || [])].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );

  const latest = latestTimestamp(article);
  const hasSummary = Array.isArray(article.summary) && article.summary.length > 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-bg-main pt-[56px] transition-colors duration-300">
      <ArticleStaticHeader />

      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <div className="flex flex-col gap-6 mb-8" style={{ paddingTop: '40px' }}>
          {/* Meta row: LIVE badge + relative updated time */}
          <div className="max-w-[680px] w-full mx-auto flex items-center gap-3">
            <LiveBadge />
            {latest && (
              <span className="font-meta text-[12px] uppercase tracking-[0.08em] text-text-muted">
                Updated {formatRelativeTime(latest)}
              </span>
            )}
          </div>

          {/* Headline (richText title) */}
          <div className="max-w-[680px] w-full mx-auto">
            <h1 className="font-copy font-bold text-text-main text-[39px] md:text-[34px] lg:text-[42px] leading-[1.05] tracking-[-0.02em] transition-colors">
              {renderLexicalHeadline(article.title)}
            </h1>
          </div>

          {/* Hero */}
          {article.hero?.url && (
            <div className="flex flex-col max-w-[680px] w-full mx-auto">
              <div className="relative aspect-[3/2] w-screen max-w-none bg-gray-100 dark:bg-zinc-800 overflow-hidden left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-0 md:mr-0 md:w-full">
                <Image
                  src={article.hero.url}
                  alt={article.hero.alt || article.plainTitle}
                  fill
                  sizes="(max-width: 768px) 100vw, 680px"
                  className="object-cover"
                  priority
                />
              </div>
              {article.hero.caption && (
                <p className="mt-2 font-meta text-[12px] italic text-text-muted transition-colors">
                  {article.hero.caption}
                </p>
              )}
            </div>
          )}
        </div>

        {/* "What We're Covering Today" */}
        {hasSummary && (
          <section className="max-w-[680px] w-full mx-auto mt-10">
            <h2 className="font-copy font-bold text-text-main text-2xl md:text-3xl mb-5 leading-tight transition-colors">
              What We&rsquo;re Covering Today
            </h2>
            <ul className="flex flex-col gap-3 list-disc pl-6">
              {article.summary!.map((item) => {
                const bodyChildren = (item.body?.root?.children ?? []) as unknown as LexicalNode[];
                return (
                  <li
                    key={item.id}
                    className="font-copy text-[18px] md:text-xl leading-relaxed text-text-main dark:text-[#CCCCCC] transition-colors"
                  >
                    <span className="font-bold">{item.label}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      &mdash;
                    </span>
                    <span className="live-summary-body inline">
                      <SerializeLexical nodes={bodyChildren} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <ArticleDivider className="mt-12" />

        {/* Updates stream */}
        <section className="max-w-[680px] w-full mx-auto mt-6">
          {updatesSorted.length === 0 ? (
            <p className="font-meta text-[14px] text-text-muted py-8">
              No updates yet. Check back soon.
            </p>
          ) : (
            <div className="divide-y divide-rule">
              {updatesSorted.map((update) => (
                <LiveUpdate
                  key={update.id}
                  timestamp={update.timestamp}
                  heading={update.heading}
                  author={update.author}
                  body={update.body}
                />
              ))}
            </div>
          )}
        </section>
      </article>

      <Footer />

      {/*
        Inline styles for elements rendered inside our live-summary list items.
        We inherit most typography from the RichTextParser paragraphs, but
        summary items render inline so we collapse paragraph margins.
      */}
      <style>{`
        .live-summary-body p { display: inline; margin: 0; font-size: inherit; line-height: inherit; }
      `}</style>
    </main>
  );
}
