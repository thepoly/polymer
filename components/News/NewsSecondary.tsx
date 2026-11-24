import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { newsBylineDate } from "./newsLayout";

/** How wide the strip photo is drawn (about a quarter of the lead column), for the download size */
const STRIP_PHOTO_SIZES = "(max-width: 640px) 30vw, (max-width: 1024px) 26vw, 220px";

/**
 * One story under the lead, as a horizontal strip: kicker, headline and
 * byline on the left, and the story's photo on the right, its top level
 * with the kicker and its height the text's (16:10 at the shortest, square at
 * the tallest). A story without a photo runs its text the lead's full width.
 * Tablets (768–1023px) also show the subdeck beneath the byline.
 *
 * Its type follows the column's `--balance-scale` (BalanceColumns): the
 * headline by the full scale, so the strip gets deeper when the lead's
 * column has to reach the bottom of the Student Government column. The
 * photo keeps its size.
 */
function Strip({ article, optional, photo }: { article: ComponentArticle; optional: boolean; photo: boolean }) {
  const image = photo ? article.image : null;
  return (
    <div
      // "reach": shown even if it overshoots, when the Student Government
      // column can then grow to meet it (see BalanceColumns)
      data-balance-opt={optional ? "reach" : undefined}
      suppressHydrationWarning
      className="mt-6 border-t border-[var(--rule-color)] pt-5"
    >
      <TransitionLink href={getArticleUrl(article)} className="group block">
        <article
          className={
            image
              ? "grid grid-cols-[minmax(0,1fr)_30%] items-start gap-x-4 sm:grid-cols-[minmax(0,1fr)_27%] sm:gap-x-[clamp(16px,2vw,28px)]"
              : undefined
          }
        >
          <div>
            {article.kicker && (
              <span className="mb-1.5 block font-meta text-[13px] font-medium uppercase leading-[1.25] tracking-[0.08em] text-accent dark:text-[#d96b76]">
                {article.kicker}
              </span>
            )}
            <h3
              className="font-copy font-medium leading-[1.1] text-text-main transition-colors group-hover:text-accent"
              style={{ fontSize: "calc(clamp(22px, 2.1vw, 27px) * var(--balance-scale, 1))" }}
            >
              {article.richTitle || article.title}
            </h3>
            <Byline
              authors={article.authorLinks}
              date={newsBylineDate(article)}
              size="md"
              margin="mt-2.5"
            />
            {article.excerpt && (
              <p data-news-secondary-subdeck className="mt-2.5 font-meta text-[16px] font-medium leading-[1.5] text-text-main">
                {article.excerpt}
              </p>
            )}
          </div>
          {image && (
            // The photo follows the text's height, from 16:10 up to square, so a
            // short text doesn't leave a gap under it beside a tall photo.
            // The cell stretches to the row; the box inside is held to those
            // shapes by its own width (cqw).
            <div className="@container self-stretch">
              <div className="relative h-full min-h-[62.5cqw] max-h-[100cqw] overflow-hidden">
                <Image
                  src={image}
                  alt={article.imageTitle || ""}
                  fill
                  className="object-cover"
                  style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
                  sizes={STRIP_PHOTO_SIZES}
                />
              </div>
            </div>
          )}
        </article>
      </TransitionLink>
    </div>
  );
}

/**
 * The stories under the lead, one strip per row, photo on the right when the
 * story has one and `photos` is on (the News Layout editor's switch).
 * `optional` strips only appear when BalanceColumns finds the lead's column
 * short enough to need them, or short by more than the Student Government
 * column can make up once a strip is added.
 */
export default function NewsSecondary({
  articles,
  optional = false,
  photos = true,
}: {
  articles: ComponentArticle[];
  optional?: boolean;
  photos?: boolean;
}) {
  if (articles.length === 0) return null;
  return (
    <>
      {articles.map((article) => (
        <Strip key={article.id} article={article} optional={optional} photo={photos} />
      ))}
    </>
  );
}
