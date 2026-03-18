import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;

  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex flex-col gap-4 max-w-[680px] w-full mx-auto">
        {article.kicker && (
            <span className="font-meta text-accent font-[440] italic text-[15px] md:text-[16px] tracking-[0.06em] transition-colors">
                {article.kicker}
            </span>
        )}
        <h1 className={`font-display font-bold text-[28px] md:text-[34px] lg:text-[42px] text-text-main leading-[1.05] tracking-[-0.02em] transition-colors ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
          {article.title}
        </h1>
        {article.subdeck && (
            <h2 className="font-meta text-xl md:text-2xl font-normal text-text-muted leading-snug transition-colors">
                {article.subdeck}
            </h2>
        )}
      </div>

      {featuredImage?.url && (() => {
        const photographer = featuredImage.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
        const imageCaption = (article as unknown as Record<string, unknown>).imageCaption as string | undefined;
        return (
          <div className="flex flex-col gap-1 max-w-[680px] w-full mx-auto">
            <div
              id={`media-${featuredImage.id}`}
              className="relative aspect-[3/2] w-screen max-w-none bg-gray-100 dark:bg-zinc-800 overflow-hidden scroll-mt-20 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-0 md:mr-0 md:w-full"
            >
              <Image
                src={featuredImage.url}
                alt={featuredImage.alt || article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            {(imageCaption || photographer) && (
              <div className="flex justify-between items-baseline gap-4 mt-1">
                {imageCaption && (
                  <span className="font-meta text-[12px] text-text-muted italic transition-colors">
                    {imageCaption}
                  </span>
                )}
                {photographer && (
                  <span className="font-meta text-[11px] text-text-muted transition-colors shrink-0">
                    Photo Credit: <Link href={`/staff/${photographer.slug || photographer.id}`} className="hover:text-accent transition-colors">{photographer.firstName} {photographer.lastName}</Link>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex flex-col gap-3 py-4 border-b border-rule-strong max-w-[680px] w-full mx-auto transition-colors">
        <div className="flex items-start gap-3">
            {/* Author Headshots */}
            <div className="flex -space-x-2">
                {article.authors?.map((author) => {
                    const user = author as User;
                    const headshot = user.headshot as Media | null;
                    if (!headshot?.url) return null;
                    return (
                        <Link href={`/staff/${user.slug || user.id}`} key={user.id} className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors hover:border-accent z-10 hover:z-20">
                            <Image
                                src={headshot.url}
                                alt={`${user.firstName} ${user.lastName}`}
                                fill
                                className="object-cover"
                            />
                        </Link>
                    );
                })}
            </div>

            {/* Author Names + Titles */}
            {article.authors && article.authors.length > 0 ? (() => {
                const enriched = article.authors!.map((author) => {
                    const user = author as User;
                    const pos = user.positions?.find((p) => !(p as Record<string, unknown>).endDate) ?? user.positions?.[0];
                    const jobTitle = (pos as Record<string, unknown> | undefined)?.jobTitle;
                    const title = typeof jobTitle === 'object' && jobTitle
                        ? ((jobTitle as Record<string, unknown>).title as string | undefined) ?? null
                        : null;
                    return { user, title };
                });
                const hasTitles = enriched.some((a) => a.title);

                if (hasTitles) {
                    return (
                        <div className="flex flex-row flex-wrap items-start gap-y-1">
                            {enriched.map(({ user, title }, index) => (
                                <React.Fragment key={user.id}>
                                {index > 0 && (
                                    <span className="font-meta text-[14px] md:text-[15px] font-[440] text-text-muted mx-3 mt-0">&</span>
                                )}
                                <div>
                                    <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
                                        <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
                                            {user.firstName} {user.lastName}
                                        </Link>
                                    </div>
                                    {title && (
                                        <p className="font-meta text-[11px] md:text-[12px] font-normal italic text-text-main mt-0.5 transition-colors">
                                            {title}
                                        </p>
                                    )}
                                </div>
                                </React.Fragment>
                            ))}
                        </div>
                    );
                }

                return (
                    <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
                        {enriched.map(({ user }, index) => (
                            <React.Fragment key={user.id}>
                                {index > 0 && index === enriched.length - 1 ? ' & ' : index > 0 ? ', ' : ''}
                                <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
                                    {user.firstName} {user.lastName}
                                </Link>
                            </React.Fragment>
                        ))}
                    </div>
                );
            })() : (
                <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
                    The Poly Staff
                </div>
            )}
        </div>
        <div className="font-meta text-[11px] font-medium tracking-[0.06em] text-text-muted">
            {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      </div>
    </div>
  );
};
