import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import type { Metadata } from 'next';
import config from '@/payload.config';
import { extractTextFromLexical, renderLexicalHeadline } from '@/utils/formatArticle';
import { getArticleLayout, ArticleLayouts } from '@/components/Article/Layouts';
import ArticleScrollBar from '@/components/ArticleScrollBar';
import { PreviewBanner } from '@/components/Article/PreviewBanner';
import { toPublicArticle } from '@/lib/publicArticle';
import type { Article } from '@/payload-types';

/**
 * Draft preview: the article exactly as the public page will lay it out, from
 * its latest saved version, published or not.
 *
 * The URL is shareable — it carries nothing but the article id — and the gate
 * is the newsroom login. Anyone signed out lands on the login page and comes
 * back here afterwards. Nothing is cached: every load reads the draft fresh.
 */
export const dynamic = 'force-dynamic';

type Args = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Draft preview',
  robots: { index: false, follow: false },
};

export default async function PreviewPage({ params }: Args) {
  const { id } = await params;
  const articleId = Number.parseInt(id, 10);
  if (!Number.isFinite(articleId) || String(articleId) !== id) notFound();

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) {
    redirect(`/newsroom/login?redirect=${encodeURIComponent(`/preview/${articleId}`)}`);
  }

  // draft: true returns the newest version, which is what an editor has most
  // recently saved — the thing they want to see — rather than what is live.
  let raw: Article | null = null;
  try {
    raw = await payload.findByID({
      collection: 'articles',
      id: articleId,
      depth: 2,
      draft: true,
      overrideAccess: false,
      user,
    });
  } catch {
    raw = null;
  }
  if (!raw) notFound();

  const article = toPublicArticle(raw);
  const layoutType = getArticleLayout(article);
  const LayoutComponent = ArticleLayouts[layoutType];
  const title = extractTextFromLexical(article.title);

  return (
    <>
      <PreviewBanner
        articleId={articleId}
        status={raw._status === 'published' ? 'published' : 'draft'}
        updatedAt={raw.updatedAt}
      />
      <ArticleScrollBar
        title={title}
        richTitle={renderLexicalHeadline(article.title)}
        section={article.section}
        hideUntilScroll={layoutType === 'photofeature'}
      />
      <LayoutComponent article={article} content={article.content} />
    </>
  );
}
