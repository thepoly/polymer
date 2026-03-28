import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { Article } from "./types";
import { Byline } from "./Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";

export const ArticleCard = ({
  article,
  caption,
  showImage = Boolean(article.image),
  showExcerpt = true,
  imageAspectClassName = "aspect-[4/3]",
  titleClassName = "text-[22px] md:text-[24px]",
  excerptClassName = "mt-1.5 line-clamp-3 text-[13px] leading-[1.38]",
  contained = false,
  showKicker = false,
  imageRight = false,
}: {
  article: Article;
  caption?: string | null;
  showImage?: boolean;
  showExcerpt?: boolean;
  imageAspectClassName?: string;
  titleClassName?: string;
  excerptClassName?: string;
  /** When true, image stays within its container instead of going full-bleed on mobile */
  contained?: boolean;
  /** When true, show the kicker on desktop (always shown on mobile) */
  showKicker?: boolean;
  /** When true, image appears to the right of the text instead of above */
  imageRight?: boolean;
}) => (
  <TransitionLink href={getArticleUrl(article)} className={`group block min-w-0 ${imageRight && showImage && article.image ? "md:grid md:grid-cols-[minmax(0,1fr)_220px] md:gap-5 md:items-start" : ""}`}>
    {showImage && article.image && !imageRight && (
      <figure
        data-header-anchor="image"
        data-marauders-obstacle="image"
        className={`mb-3 ${contained ? 'relative w-full' : 'relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen md:static md:ml-0 md:mr-0 md:w-full'}`}
      >
        <div className={`relative w-full overflow-hidden ${imageAspectClassName}`}>
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 380px"
          />
        </div>
        {caption && (
          <figcaption className="font-meta mt-1.5 text-[10px] leading-snug tracking-wide text-text-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    )}
    <div>
      {article.kicker && (
        <p className={`font-meta text-[12px] font-[600] uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] mb-1 [overflow-wrap:anywhere] break-words ${showKicker ? "" : "lg:hidden"}`}>
          {article.kicker}
        </p>
      )}
      <div data-header-anchor="text">
        <h3
          data-marauders-title
          className={`relative z-[30] font-bold leading-[1.12] tracking-[-0.01em] text-text-main transition-colors [overflow-wrap:anywhere] break-words font-copy ${article.section === "opinion" ? "font-light" : ""} ${titleClassName} ${article.section === "news" ? "text-[23px] md:text-[25px]" : ""} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light text-[23px] md:text-[25px]" : ""}`}
        >
          {article.title}
        </h3>
        <Byline author={article.author} date={article.date} />
        {showExcerpt && article.excerpt && (
          <p
            data-marauders-obstacle="excerpt"
            className={`font-meta font-normal text-black dark:text-white [overflow-wrap:anywhere] break-words ${excerptClassName}`}
          >
            {article.excerpt}
          </p>
        )}
      </div>
    </div>
    {showImage && article.image && imageRight && (
      <figure
        data-header-anchor="image"
        data-marauders-obstacle="image"
        className="relative w-full"
      >
        <div className={`relative w-full overflow-hidden ${imageAspectClassName}`}>
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="220px"
          />
        </div>
      </figure>
    )}
  </TransitionLink>
);
