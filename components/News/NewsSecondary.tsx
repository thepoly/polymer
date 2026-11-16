import React from "react";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { newsBylineDate } from "./newsLayout";

/**
 * One story under the lead, as a horizontal strip with no photo: the
 * headline runs the lead's full width, with the byline and then the subdeck
 * under it, each also full width.
 *
 * Its type follows the column's `--balance-scale` (BalanceColumns): the
 * headline by the full scale, the subdeck by six tenths of it, so the strip
 * gets deeper when the lead's column has to reach the bottom of the Student
 * Government column.
 */
function Strip({ article, optional }: { article: ComponentArticle; optional: boolean }) {
  return (
    <div
      data-balance-opt={optional ? "" : undefined}
      suppressHydrationWarning
      className="mt-6 border-t border-[var(--rule-color)] pt-5"
    >
      <TransitionLink href={getArticleUrl(article)} className="group block">
        <article>
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
            author={article.author}
            date={newsBylineDate(article)}
            variant="features"
            className="mt-2.5 text-[12px]"
          />
          {article.excerpt && (
            <p
              className="mt-2.5 font-meta font-medium leading-[1.5] text-text-main"
              style={{ fontSize: "calc(16px * (1 + (var(--balance-scale, 1) - 1) * 0.6))" }}
            >
              {article.excerpt}
            </p>
          )}
        </article>
      </TransitionLink>
    </div>
  );
}

/**
 * The stories under the lead: photo-less strips, one per row. `optional`
 * strips only appear when BalanceColumns finds the lead's column short
 * enough to need them.
 */
export default function NewsSecondary({
  articles,
  optional = false,
}: {
  articles: ComponentArticle[];
  optional?: boolean;
}) {
  if (articles.length === 0) return null;
  return (
    <>
      {articles.map((article) => (
        <Strip key={article.id} article={article} optional={optional} />
      ))}
    </>
  );
}
