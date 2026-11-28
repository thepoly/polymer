import React from "react";
import TransitionLink from "@/components/TransitionLink";
import { Byline } from "@/components/FrontPage/Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { DEFAULT_CHOICE_STYLE, type ChoiceStyle } from "@/lib/opinionLayout";
import type { Article } from "@/components/FrontPage/types";

const LABEL = "font-meta text-[15px] font-medium uppercase tracking-[0.08em]";
const RED_LABEL = `${LABEL} text-accent dark:text-[#d96b76]`;
const INK_LABEL = `${LABEL} text-text-main`;

function Picks({ articles }: { articles: Article[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {articles.map((article) => (
        <li key={article.id}>
          <TransitionLink href={getArticleUrl(article)} className="group block">
            <span className="block font-copy text-[20px] font-medium leading-[1.15] text-text-main transition-colors group-hover:text-accent">
              {article.richTitle || article.title}
            </span>
            <Byline authors={article.authorLinks ?? []} size="sm" margin="mt-1" />
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * Opinion's Choice: the editors' three picks, at the foot of column 3. They're
 * equal, so unnumbered; each is its headline and byline, as every other
 * opinion on the page is, undated as curated picks are (docs/bylines.md). The
 * editors pick how it's set off (`style`, in the Opinion Layout editor):
 * - keyline (default): a 1px frame, the label set into its top edge, as a
 *   printed sidebar is
 * - margin: the label in red, then a vertical rule down the left of the picks
 * - rule: the label over a 2px rule, as the group titles below are
 */
export default function EditorsChoice({
  label,
  articles,
  style = DEFAULT_CHOICE_STYLE,
}: {
  label: string;
  articles: Article[];
  style?: ChoiceStyle;
}) {
  if (articles.length === 0) return null;

  if (style === "rule") {
    return (
      <section aria-label={label}>
        <h2 className={`${INK_LABEL} border-b-2 border-rule-strong pb-1.5`}>{label}</h2>
        <div className="mt-4">
          <Picks articles={articles} />
        </div>
      </section>
    );
  }

  if (style === "margin") {
    return (
      <section aria-label={label}>
        <h2 className={RED_LABEL}>{label}</h2>
        <div className="mt-3 border-l-2 border-rule-strong pl-4">
          <Picks articles={articles} />
        </div>
      </section>
    );
  }

  return (
    // The label sits on the frame's top edge, its own background cutting the
    // line; the top margin makes room for the half of it above the frame
    <section aria-label={label} className="relative mt-2.5 border border-rule-strong px-5 pb-5 pt-6">
      <h2 className={`${INK_LABEL} absolute -top-[0.7em] left-3.5 bg-bg-main px-1.5 leading-none`}>{label}</h2>
      <Picks articles={articles} />
    </section>
  );
}
