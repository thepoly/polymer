import { extractTextFromLexical, renderLexicalHeadline } from '@/utils/formatArticle';
import React from 'react';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import TransitionLink from '@/components/TransitionLink';
import { Byline } from '@/components/FrontPage/Byline';
import { opinionTypeLabels } from '@/components/Opinion/opinionTypeLabels';
import { Article, Media, User } from '@/payload-types';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { getArticleAuthors } from '@/utils/articleAuthors';
import { shortDate } from '@/utils/articleDates';

type Props = {
  currentArticle: Article;
};

const sectionLabels: Record<Article['section'], string> = {
  news: 'News',
  sports: 'Sports',
  features: 'Features',
  opinion: 'Opinion',
};

const sectionDescriptions: Record<Article['section'], string> = {
  news: 'Recent reporting from across campus and the wider RPI community.',
  sports: 'Recent coverage, recaps, and analysis from the sports desk.',
  features: 'Recent longform, profiles, and campus culture stories.',
  opinion: 'Recent editorials, columns, and letters from The Poly.',
};

type RecommendationAuthor = {
  id: number;
  firstName: string;
  lastName: string;
  slug?: string | null;
};

type RecommendationImage = {
  id: number;
  url?: string | null;
  title?: string | null;
  alt?: string | null;
  sizes?: {
    card?: {
      url?: string | null;
    } | null;
  } | null;
};

type RecommendationArticle = {
  id: number;
  title: string;
  richTitle?: React.ReactNode;
  slug?: string | null;
  subdeck?: string | null;
  section: Article['section'];
  kicker?: string | null;
  publishedDate?: string | null;
  createdAt: string;
  authors: RecommendationAuthor[];
  writeInAuthors?: { name?: string | null }[] | null;
  featuredImage?: RecommendationImage | null;
  opinionType?: string | null;
};

const getOpinionType = (article: RecommendationArticle | Article) =>
  (article as unknown as Record<string, unknown>).opinionType as string | undefined;

const getFeaturedImage = (value: RecommendationArticle['featuredImage'] | Media | number | null | undefined): RecommendationImage | null => {
  if (!value || typeof value === 'number') return null;
  return value as RecommendationImage;
};

/** Authors in byline order; empty renders "By The Polytechnic" */
const getAuthors = (article: RecommendationArticle) => getArticleAuthors(article);

const formatDate = (article: RecommendationArticle) => shortDate(article.publishedDate || article.createdAt);

const getArticleLabel = (article: RecommendationArticle) => {
  if (article.section === 'opinion') {
    const opinionType = getOpinionType(article);
    return opinionTypeLabels[opinionType || 'opinion'] || 'Opinion';
  }

  return article.kicker?.trim() || sectionLabels[article.section];
};

const getHeadlineClasses = (article: RecommendationArticle, variant: 'lead' | 'list') => {
  const weight = article.section === 'news'
    ? 'font-normal [&_strong]:font-normal [&_b]:font-normal'
    : 'font-bold';
  const base =
    variant === 'lead'
      ? 'font-copy leading-[1.12] tracking-[-0.01em] text-[28px] md:text-[32px]'
      : 'font-copy leading-[1.12] tracking-[-0.01em] text-[22px] md:text-[24px]';

  const sectionStyles = [
    article.section === 'features'
      ? variant === 'lead'
        ? 'font-light text-[30px] md:text-[34px]'
        : 'font-light text-[23px] md:text-[25px]'
      : '',
    article.section === 'sports' ? 'font-light' : '',
    article.section === 'opinion' ? 'font-light' : '',
    article.section === 'news'
      ? variant === 'lead'
        ? 'text-[30px] md:text-[34px]'
        : 'text-[23px] md:text-[25px]'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `${base} ${weight} text-text-main transition-colors ${sectionStyles}`;
};

const prioritizeRecommendations = (articles: RecommendationArticle[], currentArticle: Article) => {
  if (currentArticle.section !== 'opinion') return articles;

  const currentOpinionType = getOpinionType(currentArticle);
  if (!currentOpinionType) return articles;

  const matching = articles.filter((article) => getOpinionType(article) === currentOpinionType);
  const rest = articles.filter((article) => getOpinionType(article) !== currentOpinionType);

  return [...matching, ...rest];
};

const hasImage = (article: RecommendationArticle) => Boolean(getFeaturedImage(article.featuredImage)?.url);

const toPublicRecommendationAuthor = (author: User): RecommendationAuthor => ({
  id: author.id,
  firstName: author.firstName,
  lastName: author.lastName,
  slug: author.slug,
});

const toPublicRecommendationArticle = (article: Article): RecommendationArticle => ({
  id: article.id,
  title: extractTextFromLexical(article.title),
  richTitle: renderLexicalHeadline(article.title),
  slug: article.slug,
  subdeck: article.subdeck,
  section: article.section,
  kicker: article.kicker,
  publishedDate: article.publishedDate,
  createdAt: article.createdAt,
  authors: (article.authors || [])
    .filter((author): author is User => typeof author !== 'number')
    .map(toPublicRecommendationAuthor),
  featuredImage:
    article.featuredImage && typeof article.featuredImage !== 'number'
      ? {
          id: article.featuredImage.id,
          url: article.featuredImage.url,
          title: article.featuredImage.title,
          alt: article.featuredImage.alt,
          sizes: article.featuredImage.sizes,
        }
      : null,
  opinionType: (article as unknown as Record<string, unknown>).opinionType as string | null | undefined,
});

export async function ArticleRecommendations({ currentArticle }: Props) {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { section: { equals: currentArticle.section } },
        { id: { not_equals: currentArticle.id } },
      ],
    },
    sort: '-publishedDate',
    limit: 10,
    depth: 1,
    select: {
      title: true,
      slug: true,
      subdeck: true,
      featuredImage: true,
      section: true,
      kicker: true,
      publishedDate: true,
      createdAt: true,
      authors: true,
      writeInAuthors: true,
      opinionType: true,
    },
  });

  const pool = prioritizeRecommendations(
    (result.docs as Article[]).map(toPublicRecommendationArticle),
    currentArticle,
  );
  if (pool.length === 0) return null;

  const leadArticle = pool.find(hasImage) || pool[0];
  const leadImage = getFeaturedImage(leadArticle.featuredImage);
  const supportingArticles = pool.filter((article) => article.id !== leadArticle.id).slice(0, 4);
  const sectionLabel = sectionLabels[currentArticle.section];
  const isNews = currentArticle.section === 'news';
  const isSports = currentArticle.section === 'sports';
  const sectionSpacing = isSports
    ? 'mt-6 pb-3'
    : isNews
      ? 'mt-7 md:mt-10 pb-[22px] md:pb-[34px]'
      : 'mt-14 md:mt-20 pb-14 md:pb-20';

  return (
    <section
      className={`mx-auto max-w-[1200px] px-4 md:px-6 ${sectionSpacing}`}
      data-article-recommendations
    >
      <div className={isSports ? undefined : isNews ? 'pt-1 md:pt-1.5' : 'pt-2 md:pt-3'}>
        <div className="mb-8 flex flex-col gap-4 border-b border-rule pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="font-meta text-[14px] font-bold uppercase tracking-[0.12em] text-accent">
              Continue Reading
            </p>
            <TransitionLink
              href={`/${currentArticle.section}`}
              className="group inline-block"
            >
              <h2
                className="mt-2 font-meta uppercase tracking-[0.04em] text-text-main transition-colors group-hover:text-accent text-[33px] md:text-[41px]"
                style={{ fontWeight: 400, lineHeight: 1 }}
              >
                {sectionLabel}
              </h2>
            </TransitionLink>
            <p className="mt-2 max-w-xl font-meta text-[16px] leading-[1.45] text-text-muted">
              {sectionDescriptions[currentArticle.section]}
            </p>
          </div>
        </div>

        <div className={`grid gap-8 ${supportingArticles.length > 0 ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start' : ''}`}>
          <TransitionLink
            href={getArticleUrl(leadArticle)}
            className="group block"
            data-analytics-context="article-recommendation"
          >
            <div className="flex flex-col gap-4">
              {leadImage?.url ? (
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  <Image
                    src={leadImage.url}
                    alt={leadImage.title || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 720px"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <p className="line-clamp-1 font-meta text-[14px] font-[600] uppercase tracking-[0.08em] text-accent">
                  {getArticleLabel(leadArticle)}
                </p>
                <h3 className={`mt-2 ${getHeadlineClasses(leadArticle, 'lead')}`}>
                  {leadArticle.richTitle || leadArticle.title}
                </h3>
                <Byline
                  authors={getAuthors(leadArticle)}
                  date={formatDate(leadArticle)}
                  size="lg"
                  margin="mt-4"
                />
                {leadArticle.subdeck && (
                  <p className="mt-3 max-w-xl font-meta text-[17px] leading-[1.48] text-text-muted line-clamp-3">
                    {leadArticle.subdeck}
                  </p>
                )}
              </div>
            </div>
          </TransitionLink>

          {supportingArticles.length > 0 && (
            <div className="border-t border-rule lg:border-t-0">
              {supportingArticles.map((article, index) => {
                const image = getFeaturedImage(article.featuredImage);
                const isLast = index === supportingArticles.length - 1;

                return (
                  <div
                    key={article.id}
                    className={`${isLast ? '' : 'border-b border-rule'} ${index === 0 ? 'pt-5 lg:pt-0' : 'pt-5'} ${isSports && isLast ? '' : 'pb-5'}`}
                  >
                    <TransitionLink
                      href={getArticleUrl(article)}
                      data-analytics-context="article-recommendation"
                      className={`group ${image?.url ? 'grid gap-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-start' : 'block'}`}
                    >
                      {image?.url ? (
                        <div className="relative hidden aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-800 sm:block">
                          <Image
                            src={image.url}
                            alt={image.title || ""}
                            fill
                            className="object-cover"
                            sizes="104px"
                            loading="lazy"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0">
                        <p className="line-clamp-1 font-meta text-[13px] font-[600] uppercase tracking-[0.08em] text-accent">
                          {getArticleLabel(article)}
                        </p>
                        <h3 className={`mt-1 ${getHeadlineClasses(article, 'list')}`}>
                          {article.richTitle || article.title}
                        </h3>
                        <Byline authors={getAuthors(article)} date={formatDate(article)} />
                      </div>
                    </TransitionLink>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
