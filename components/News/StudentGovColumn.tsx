import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { STUDENT_GOV, updateAnchor, type StudentGovBody, type TimelineItem } from "./studentGov";

export type StudentGovBoxContent =
  | { body: StudentGovBody; kind: "article"; article: ComponentArticle }
  | { body: StudentGovBody; kind: "timeline"; items: TimelineItem[] };

/** "Nov 11" — fixed to Troy's time zone so server and browser agree */
export function formatTimelineDate(iso: string, withYear = false): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "America/New_York",
  });
}

function BoxHeading({ body }: { body: StudentGovBody }) {
  const meta = STUDENT_GOV[body];
  return (
    <h3 className="mb-3 font-meta text-[15px] font-semibold uppercase tracking-[0.08em]">
      <TransitionLink
        href={meta.href}
        className="text-text-main transition-colors hover:text-accent"
      >
        {meta.label}
        <span aria-hidden="true" className="ml-1.5 text-accent">
          &rsaquo;
        </span>
      </TransitionLink>
    </h3>
  );
}

function PinnedArticle({ article }: { article: ComponentArticle }) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      {article.image && (
        <div className="relative mb-3 aspect-[3/2] overflow-hidden">
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
            sizes="(max-width: 1024px) 100vw, 400px"
          />
        </div>
      )}
      <h4 className="font-copy text-[22px] font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent">
        {article.richTitle || article.title}
      </h4>
      <Byline author={article.author} date={article.date} variant="features" className="mt-2 text-[12px]" />
      {article.excerpt && (
        <p className="mt-1.5 font-meta text-[15px] font-medium leading-[1.45] text-text-main line-clamp-3">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/** Latest timeline entries as a short vertical list with dots on a rule */
function TimelineBullets({ body, items }: { body: StudentGovBody; items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="font-meta text-[14px] text-text-muted">No updates yet.</p>;
  }
  return (
    <ol className="relative ml-1 border-l border-[var(--rule-color)]">
      {items.map((item) => {
        const href =
          item.kind === "article"
            ? getArticleUrl(item.article)
            : `${STUDENT_GOV[body].href}#${updateAnchor(item.id)}`;
        const title = item.kind === "article" ? item.article.richTitle || item.article.title : item.title;
        const text = item.kind === "article" ? item.article.excerpt : item.blurb;
        return (
          <li key={`${item.kind}-${item.id}`} className="relative mb-4 pl-4 last:mb-0">
            <span
              aria-hidden="true"
              className="absolute -left-[4.5px] top-[5px] h-2 w-2 rounded-full bg-accent"
            />
            <TransitionLink href={href} className="group block">
              <span className="block font-meta text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                {formatTimelineDate(item.date)}
              </span>
              <span className="mt-0.5 block font-copy text-[18px] font-medium leading-[1.15] text-text-main transition-colors group-hover:text-accent">
                {title}
              </span>
              {text && (
                <span className="mt-1 block font-meta text-[14px] leading-[1.4] text-text-main line-clamp-2">
                  {text}
                </span>
              )}
            </TransitionLink>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Right column of the /news top block: a Student Government heading over
 * the Senate and Executive Board boxes (order set in the News Layout editor).
 * Each box shows either one pinned article or the latest timeline entries.
 */
export default function StudentGovColumn({ boxes }: { boxes: StudentGovBoxContent[] }) {
  return (
    <section aria-labelledby="student-gov-heading">
      <div className="mb-4 border-t-2 border-[var(--accent-color)] pt-1">
        <h2
          id="student-gov-heading"
          className="font-meta uppercase text-accent dark:text-white"
          style={{ fontSize: 17, letterSpacing: "0.08em", fontWeight: 500, margin: "0 0 2px" }}
        >
          Student Government
        </h2>
      </div>
      {boxes.map((box, i) => (
        <div
          key={box.body}
          className={i > 0 ? "mt-6 border-t border-[var(--rule-color)] pt-5" : undefined}
        >
          <BoxHeading body={box.body} />
          {box.kind === "article" ? (
            <PinnedArticle article={box.article} />
          ) : (
            <TimelineBullets body={box.body} items={box.items} />
          )}
        </div>
      ))}
    </section>
  );
}
