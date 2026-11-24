import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { shortDate } from "@/utils/articleDates";

/*
 * The top of the Features page, after main's three-column front: no column
 * titles.
 *
 *   phone        tablet (≥768)       desktop (≥1024)
 *   lead         lead  lead          left | lead      | right
 *   under ×2     under under              | under under |
 *   left ×3      left  right
 *   right ×3
 *
 * Left: two photo stories and the "featured" request box. Right: three photo
 * stories. Rules between the columns, as on main. On desktop every column
 * stretches to the tallest: the request box grows to fill the left, and the
 * right spaces its stories evenly, so all three end on one line.
 */

const COVER_CSS = `
.features-cover {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "center" "left" "right";
  row-gap: 24px;
}
@media (min-width: 768px) {
  .features-cover {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: "center center" "left right";
    column-gap: clamp(16px, 2vw, 28px);
    row-gap: 28px;
  }
}
@media (min-width: 1024px) {
  .features-cover {
    grid-template-columns: minmax(0, 24fr) minmax(0, 52fr) minmax(0, 28fr);
    grid-template-areas: "left center right";
  }
}
`;

/**
 * One story: photo, red kicker, headline, byline, and for the lead its dek.
 * `row` (side columns) puts a small thumbnail beside the headline on phones
 * and the photo on top from tablet up.
 */
function CoverCard({
  article,
  photo = true,
  large = false,
  row = false,
  flat = false,
  priority = false,
  sizes,
}: {
  article: Article;
  photo?: boolean;
  /** The lead: on desktop its photo grows to fill the column's spare height */
  large?: boolean;
  row?: boolean;
  /** A 16:10 photo on desktop instead of 3:2 (right column) */
  flat?: boolean;
  priority?: boolean;
  sizes: string;
}) {
  const hasImage = photo && Boolean(article.image);
  const asRow = row && hasImage;

  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className={`group ${asRow ? "grid grid-cols-[minmax(0,1fr)_104px] items-start gap-x-3 md:block" : large ? "block lg:flex lg:h-full lg:flex-col" : "block"}`}
    >
      {hasImage && (
        <div
          className={`relative overflow-hidden ${
            large
              ? "-mx-4 mb-3 aspect-video sm:mx-0 lg:aspect-auto lg:min-h-[300px] lg:flex-1"
              : asRow
                ? `order-2 aspect-[4/3] md:mb-3 md:aspect-[3/2] ${flat ? "lg:aspect-[16/10]" : ""}`
                : "mb-3 aspect-[3/2]"
          }`}
        >
          <Image
            src={article.image!}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
            sizes={sizes}
            priority={priority}
          />
        </div>
      )}
      <div className="min-w-0">
        {article.kicker && (
          <span
            className={`mb-1.5 block font-meta font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] ${
              large ? "text-[14px]" : "text-[12px]"
            }`}
          >
            {article.kicker}
          </span>
        )}
        <h3
          className={`font-copy font-medium text-text-main transition-colors group-hover:text-accent ${
            large ? "text-[28px] leading-[1.1] md:text-[34px]" : "text-[19px] leading-[1.16] md:text-[20px]"
          }`}
        >
          {article.richTitle || article.title}
        </h3>
        <Byline
          authors={article.authorLinks}
          // Every cover story is dated ("Nov 14, 2026")
          date={shortDate(article.publishedDate || article.isoDate)}
          size={large ? "lg" : "sm"}
          margin="mt-1.5"
        />
        {large && article.excerpt && (
          <p className="mt-2 font-meta text-[15px] leading-[1.5] text-text-main line-clamp-3">{article.excerpt}</p>
        )}
      </div>
    </TransitionLink>
  );
}

const SIDE_SIZES = "(max-width: 767px) 104px, (max-width: 1023px) 50vw, 320px";

/** "Have something you want to be featured?", linking to the Features desk */
function FeatureRequest({ href }: { href: string }) {
  return (
    <div className="flex min-h-[140px] items-center lg:flex-1 justify-center border-y border-rule px-2 py-8 text-center">
      <p className="font-meta text-[19px] font-medium uppercase leading-[1.3] tracking-[0.04em] text-text-main">
        Have something you want to be{" "}
        <a href={href} className="text-accent transition-colors hover:underline dark:text-[#d96b76]">
          featured
        </a>
        ?
      </p>
    </div>
  );
}

export default function FeaturesCover({
  lead,
  under,
  left,
  right,
  requestHref,
}: {
  /** Where "featured" in the request box leads (the Features desk email) */
  requestHref: string;
  lead?: Article;
  /** The two photo stories under the lead */
  under: Article[];
  left: Article[];
  right: Article[];
}) {
  if (!lead && under.length === 0 && left.length === 0 && right.length === 0) return null;

  return (
    <section aria-label="Top stories" className="features-cover">
      <style>{COVER_CSS}</style>

      <div style={{ gridArea: "center" }} className="lg:flex lg:flex-col">
        {lead && (
          <div className="lg:flex-1">
          <CoverCard
            article={lead}
            large
            priority
            sizes="(max-width: 1023px) 100vw, 640px"
          />
          </div>
        )}
        {under.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-5">
            {under.map((article) => (
              <CoverCard
                key={article.id}
                article={article}
                row
                sizes="(max-width: 639px) 104px, (max-width: 1023px) 50vw, 320px"
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{ gridArea: "left" }}
        className="flex flex-col gap-6 border-t border-rule pt-5 md:border-t-0 md:pt-0 lg:border-r lg:pr-[clamp(16px,2vw,28px)]"
      >
        {left.map((article) => (
          <CoverCard key={article.id} article={article} row sizes={SIDE_SIZES} />
        ))}
        <FeatureRequest href={requestHref} />
      </div>

      {right.length > 0 && (
        <div
          style={{ gridArea: "right" }}
          className="flex flex-col gap-6 border-t border-rule pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-[clamp(16px,2vw,28px)] lg:justify-between"
        >
          {right.map((article) => (
            <CoverCard key={article.id} article={article} row flat sizes={SIDE_SIZES} />
          ))}
        </div>
      )}
    </section>
  );
}
