import React from 'react';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import TransitionLink from '@/components/TransitionLink';
import { Byline } from '@/components/FrontPage/Byline';
import { opinionTypeLabels } from '@/components/Opinion/opinionTypeLabels';
import { Article, Media, User } from '@/payload-types';
import { getArticleUrl } from '@/utils/getArticleUrl';

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
  slug?: string | null;
  subdeck?: string | null;
  section: Article['section'];
  kicker?: string | null;
  publishedDate?: string | null;
  createdAt: string;
  authors: RecommendationAuthor[];
  featuredImage?: RecommendationImage | null;
  opinionType?: string | null;
};

const getOpinionType = (article: RecommendationArticle | Article) =>
  (article as unknown as Record<string, unknown>).opinionType as string | undefined;

const getFeaturedImage = (value: RecommendationArticle['featuredImage'] | Media | number | null | undefined): RecommendationImage | null => {
  if (!value || typeof value === 'number') return null;
  return value as RecommendationImage;
};

const getAuthorString = (article: RecommendationArticle) => {
  const staffNames = (article.authors || []).flatMap((author) => {
    if (typeof author === 'number') return [];
    return [`${author.firstName} ${author.lastName}`];
  });
  const writeInNames = ((article as unknown as Record<string, unknown>).writeInAuthors as Array<{ name: string }> || [])
    .map((a) => a.name)
    .filter(Boolean);
  const names = [...staffNames, ...writeInNames];
  return names.length > 0 ? names.join(' AND ') : null;
};

const formatDate = (article: RecommendationArticle) => {
  const dateValue = article.publishedDate || article.createdAt;
  if (!dateValue) return null;

  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getArticleLabel = (article: RecommendationArticle) => {
  if (article.section === 'opinion') {
    const opinionType = getOpinionType(article);
    return opinionTypeLabels[opinionType || 'opinion'] || 'Opinion';
  }

  return article.kicker?.trim() || sectionLabels[article.section];
};

const getHeadlineClasses = (article: RecommendationArticle, variant: 'lead' | 'list') => {
  const base =
    variant === 'lead'
      ? 'font-display text-[31px] font-bold leading-[1.02] tracking-[-0.02em] md:text-[37px]'
      : 'font-display text-[23px] font-bold leading-[1.08] tracking-[-0.015em] md:text-[25px]';

  const sectionStyles = [
    article.section === 'features'
      ? variant === 'lead'
        ? 'text-[33px] font-normal italic md:text-[39px]'
        : 'text-[24px] font-normal italic md:text-[26px]'
      : '',
    article.section === 'sports' ? 'italic tracking-[0.015em]' : '',
    article.section === 'opinion'
      ? variant === 'lead'
        ? 'font-copy font-medium leading-[1.12] text-[28px] md:text-[28px]'
        : 'font-copy font-medium leading-[1.12] text-[28px] md:text-[28px]'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `${base} text-text-main transition-colors ${sectionStyles}`;
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
  title: article.title,
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
          url: article.featuredImage.sizes?.card?.url || article.featuredImage.url,
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

  return (
    <section
      className="mx-auto mt-5 max-w-[1200px] px-4 md:px-6"
      data-article-recommendations
    >
      <div className="pt-2 md:pt-3">
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
                className={`mt-2 font-display leading-[0.98] tracking-[-0.03em] text-text-main transition-colors group-hover:text-accent ${currentArticle.section === 'opinion' ? 'font-medium' : 'font-bold text-[33px] md:text-[41px]'}`}
                style={currentArticle.section === 'opinion' ? { fontSize: 56 } : undefined}
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
                    src={leadImage.sizes?.card?.url || leadImage.url}
                    alt={leadImage.alt || leadArticle.title}
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
                  {leadArticle.title}
                </h3>
                <Byline
                  author={getAuthorString(leadArticle)}
                  date={formatDate(leadArticle)}
                  className="mt-4 text-[14px] md:text-[14px]"
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
                    className={`${isLast ? '' : 'border-b border-rule'} ${index === 0 ? 'pt-5 lg:pt-0' : 'pt-5'} pb-5`}
                  >
                    <TransitionLink
                      href={getArticleUrl(article)}
                      data-analytics-context="article-recommendation"
                      className={`group ${image?.url ? 'grid gap-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-start' : 'block'}`}
                    >
                      {image?.url ? (
                        <div className="relative hidden aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-800 sm:block">
                          <Image
                            src={image.sizes?.card?.url || image.url}
                            alt={image.alt || article.title}
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
                          {article.title}
                        </h3>
                        <Byline author={getAuthorString(article)} date={formatDate(article)} className="text-[15px] md:text-[14px]" />
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
