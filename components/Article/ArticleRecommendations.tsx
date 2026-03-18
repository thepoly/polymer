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

const getOpinionType = (article: Article) =>
  (article as unknown as Record<string, unknown>).opinionType as string | undefined;

const getFeaturedImage = (value: Article['featuredImage'] | Media | number | null | undefined): Media | null => {
  if (!value || typeof value === 'number') return null;
  return value as Media;
};

const getAuthorString = (article: Article) => {
  const names = (article.authors || []).flatMap((author) => {
    if (typeof author === 'number') return [];

    const user = author as User;
    return [`${user.firstName} ${user.lastName}`];
  });

  return names.length > 0 ? names.join(' AND ') : null;
};

const formatDate = (article: Article) => {
  const dateValue = article.publishedDate || article.createdAt;
  if (!dateValue) return null;

  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getArticleLabel = (article: Article) => {
  if (article.section === 'opinion') {
    const opinionType = getOpinionType(article);
    return opinionTypeLabels[opinionType || 'opinion'] || 'Opinion';
  }

  return article.kicker?.trim() || sectionLabels[article.section];
};

const getHeadlineClasses = (article: Article, variant: 'lead' | 'list') => {
  const base =
    variant === 'lead'
      ? 'font-display text-[28px] font-bold leading-[1.02] tracking-[-0.02em] md:text-[34px]'
      : 'font-display text-[20px] font-bold leading-[1.08] tracking-[-0.015em] md:text-[22px]';

  const sectionStyles = [
    article.section === 'news' ? 'font-display-news uppercase' : '',
    article.section === 'features'
      ? variant === 'lead'
        ? 'text-[30px] font-normal italic md:text-[36px]'
        : 'text-[21px] font-normal italic md:text-[23px]'
      : '',
    article.section === 'sports' ? 'italic tracking-[0.015em]' : '',
    article.section === 'opinion' ? 'font-light' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `${base} text-text-main transition-colors group-hover:text-accent ${sectionStyles}`;
};

const prioritizeRecommendations = (articles: Article[], currentArticle: Article) => {
  if (currentArticle.section !== 'opinion') return articles;

  const currentOpinionType = getOpinionType(currentArticle);
  if (!currentOpinionType) return articles;

  const matching = articles.filter((article) => getOpinionType(article) === currentOpinionType);
  const rest = articles.filter((article) => getOpinionType(article) !== currentOpinionType);

  return [...matching, ...rest];
};

const hasImage = (article: Article) => Boolean(getFeaturedImage(article.featuredImage)?.url);

export async function ArticleRecommendations({ currentArticle }: Props) {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: currentArticle.section } },
        { id: { not_equals: currentArticle.id } },
      ],
    },
    sort: '-publishedDate',
    limit: 10,
    depth: 2,
  });

  const pool = prioritizeRecommendations(result.docs as Article[], currentArticle);
  if (pool.length === 0) return null;

  const leadArticle = pool.find(hasImage) || pool[0];
  const leadImage = getFeaturedImage(leadArticle.featuredImage);
  const supportingArticles = pool.filter((article) => article.id !== leadArticle.id).slice(0, 4);
  const sectionLabel = sectionLabels[currentArticle.section];

  return (
    <section className="mx-auto mt-16 max-w-[1200px] px-4 md:px-6">
      <div className="pt-8 md:pt-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-rule pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="font-meta text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
              Continue Reading
            </p>
            <TransitionLink
              href={`/${currentArticle.section}`}
              className="group inline-block"
            >
              <h2 className="mt-2 font-display text-[30px] font-bold leading-[0.98] tracking-[-0.03em] text-text-main transition-colors group-hover:text-accent md:text-[38px]">
                {sectionLabel}
              </h2>
            </TransitionLink>
            <p className="mt-2 max-w-xl font-meta text-[13px] leading-[1.45] text-text-muted">
              {sectionDescriptions[currentArticle.section]}
            </p>
          </div>
        </div>

        <div className={`grid gap-8 ${supportingArticles.length > 0 ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start' : ''}`}>
          <TransitionLink href={getArticleUrl(leadArticle)} className="group block">
            <div className="flex flex-col gap-4">
              {leadImage?.url ? (
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  <Image
                    src={leadImage.url}
                    alt={leadImage.alt || leadArticle.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 720px"
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <p className="line-clamp-1 font-meta text-[11px] font-[440] italic tracking-[0.05em] text-accent">
                  {getArticleLabel(leadArticle)}
                </p>
                <h3 className={`mt-2 ${getHeadlineClasses(leadArticle, 'lead')}`}>
                  {leadArticle.title}
                </h3>
                {leadArticle.subdeck && (
                  <p className="mt-3 max-w-xl font-meta text-[14px] leading-[1.48] text-text-muted line-clamp-3">
                    {leadArticle.subdeck}
                  </p>
                )}
                <Byline
                  author={getAuthorString(leadArticle)}
                  date={formatDate(leadArticle)}
                  className="mt-4 text-[11px] md:text-[11px]"
                />
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
                      className={`group ${image?.url ? 'grid gap-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-start' : 'block'}`}
                    >
                      {image?.url ? (
                        <div className="relative hidden aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-800 sm:block">
                          <Image
                            src={image.url}
                            alt={image.alt || article.title}
                            fill
                            className="object-cover"
                            sizes="104px"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0">
                        <p className="line-clamp-1 font-meta text-[10px] font-[440] italic tracking-[0.05em] text-accent">
                          {getArticleLabel(article)}
                        </p>
                        <h3 className={`mt-1 ${getHeadlineClasses(article, 'list')}`}>
                          {article.title}
                        </h3>
                        <Byline author={getAuthorString(article)} date={formatDate(article)} />
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
