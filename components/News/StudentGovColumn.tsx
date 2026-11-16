import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { newsBylineDate } from "./newsLayout";
import { STUDENT_GOV, updateAnchor, type StudentGovBody, type TimelineItem } from "./studentGov";

/** The term in session, for the box's nameplate */
export type StudentGovSession = {
  /** "The 57th" (Senate) / "Rensselaer Union" (E-Board) */
  kicker: string;
  /** "2026–27" */
  year: string;
};

export type StudentGovBoxContent = (
  | { body: StudentGovBody; kind: "article"; article: ComponentArticle }
  | {
      body: StudentGovBody;
      kind: "timeline";
      /** Newest first; may hold more than `min` */
      items: TimelineItem[];
      /** Entries always shown; the rest appear when the column has room */
      min: number;
    }
) & { session: StudentGovSession | null };

/**
 * How far the column's type may be scaled to end level with the lead's
 * column (BalanceColumns): a little smaller when it runs long, up to nearly
 * half again as large when it runs short.
 */
const COLUMN_SCALE = "0.9,1.45";

/** Font size that follows the column's scale: fully (rate 1) or in part */
const scaled = (px: number, rate = 1) =>
  rate === 1 ? `calc(${px}px * var(--balance-scale, 1))` : `calc(${px}px * (1 + (var(--balance-scale, 1) - 1) * ${rate}))`;

/**
 * Month and day apart, for the docket's date column ("Nov", "11"); fixed to
 * Troy's time zone so server and browser agree
 */
function docketDate(iso: string): { month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).formatToParts(new Date(iso));
  return {
    month: parts.find((p) => p.type === "month")?.value ?? "",
    day: parts.find((p) => p.type === "day")?.value ?? "",
  };
}

/**
 * The body's nameplate: the term over the body's name, standing on a red
 * bar. Links to the body's timeline.
 */
function Nameplate({ body, session }: { body: StudentGovBody; session: StudentGovSession | null }) {
  const meta = STUDENT_GOV[body];
  return (
    <h2 className="border-b-[3px] border-accent">
      <TransitionLink
        href={meta.href}
        className="group block pb-3 text-text-main transition-colors hover:text-accent"
      >
        {session && (
          <span className="flex items-baseline justify-between gap-3 font-meta text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            <span>{session.kicker}</span>
            <span className="tabular-nums">{session.year}</span>
          </span>
        )}
        <span className="mt-1.5 flex items-end justify-between gap-3">
          <span className="font-copy text-[clamp(28px,2.6vw,34px)] font-semibold leading-[0.95] tracking-[-0.01em]">
            {meta.title}
          </span>
          <span
            aria-hidden="true"
            className="mb-0.5 font-meta text-[22px] leading-none transition-transform duration-200 group-hover:translate-x-1"
          >
            &rsaquo;
          </span>
        </span>
      </TransitionLink>
    </h2>
  );
}

function PinnedArticle({ article }: { article: ComponentArticle }) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block pt-4">
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
      <h3
        className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
        style={{ fontSize: scaled(22) }}
      >
        {article.richTitle || article.title}
      </h3>
      <Byline author={article.author} date={newsBylineDate(article)} variant="features" className="mt-2 text-[12px]" />
      {article.excerpt && (
        <p
          data-balance-trim
          className="mt-1.5 font-meta font-medium leading-[1.45] text-text-main line-clamp-3"
          style={{ fontSize: scaled(15) }}
        >
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/** One docket row: the date in its own column (month over a large day), then the entry */
function DocketRow({
  href,
  date,
  title,
  text,
  optional,
}: {
  href: string;
  date: string;
  title: React.ReactNode;
  /** Summary under the headline; dropped when the column needs the room */
  text?: string | null;
  /** Only shown when BalanceColumns finds room for it */
  optional?: boolean;
}) {
  const { month, day } = docketDate(date);
  return (
    <li data-balance-opt={optional ? "" : undefined} suppressHydrationWarning>
      <TransitionLink
        href={href}
        className="group grid grid-cols-[44px_1fr] gap-x-3.5"
        style={{ paddingTop: scaled(16) }}
      >
        <time
          dateTime={date}
          className="flex flex-col items-center border-r border-[var(--rule-color)] pr-3.5 text-center"
        >
          <span className="font-meta text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{month}</span>
          <span
            className="mt-0.5 font-copy font-semibold leading-none tabular-nums text-text-main"
            style={{ fontSize: scaled(26, 0.5) }}
          >
            {day}
          </span>
        </time>
        <span className="min-w-0">
          <span
            className="block font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
            style={{ fontSize: scaled(text ? 18 : 22) }}
          >
            {title}
          </span>
          {text && (
            <span
              data-balance-trim
              className="mt-1 block font-meta leading-[1.4] text-text-main line-clamp-2"
              style={{ fontSize: scaled(13.5) }}
            >
              {text}
            </span>
          )}
        </span>
      </TransitionLink>
    </li>
  );
}

/**
 * Latest timeline entries as a docket. The first `min` always show; later
 * ones are optional and fill the column when it's the shorter one.
 */
function Docket({
  body,
  items,
  min,
  headlinesOnly,
}: {
  body: StudentGovBody;
  items: TimelineItem[];
  min: number;
  /** Leave out the summaries; the headlines run larger instead */
  headlinesOnly: boolean;
}) {
  if (items.length === 0) {
    return <p className="py-4 font-meta text-[14px] text-text-muted">No business on the record yet.</p>;
  }
  return (
    <ol>
      {items.map((item, i) => {
        const href =
          item.kind === "article"
            ? getArticleUrl(item.article)
            : `${STUDENT_GOV[body].href}#${updateAnchor(item.id)}`;
        const title = item.kind === "article" ? item.article.richTitle || item.article.title : item.title;
        const text = item.kind === "article" ? item.article.excerpt : item.blurb;
        return (
          <DocketRow
            key={`${item.kind}-${item.id}`}
            href={href}
            date={item.date}
            title={title}
            text={headlinesOnly ? null : text}
            optional={i >= min}
          />
        );
      })}
    </ol>
  );
}

/**
 * Right column of the /news top block: the Senate and Executive Board, each
 * as a nameplate over either one pinned article or the latest timeline
 * entries as a docket (order and mode are set in the News Layout editor).
 *
 * It's a BalanceColumns column. When it's shorter than the lead's column, a
 * box set to two entries shows a third and the entries' type is set larger
 * until the columns end together; when it's the taller one its type is set
 * a little smaller and, failing that, the summaries are dropped. The
 * nameplates stay one size.
 */
export default function StudentGovColumn({
  boxes,
  headlinesOnly = false,
  className = "",
}: {
  boxes: StudentGovBoxContent[];
  /** Bullets as larger headlines with no summary (News Layout editor) */
  headlinesOnly?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-label="Student government"
      data-balance-col
      data-balance-scale={COLUMN_SCALE}
      suppressHydrationWarning
      className={`flex flex-col gap-5 ${className}`}
    >
      {boxes.map((box) => (
        <div key={box.body}>
          <Nameplate body={box.body} session={box.session} />
          {box.kind === "article" ? (
            <PinnedArticle article={box.article} />
          ) : (
            <Docket body={box.body} items={box.items} min={box.min} headlinesOnly={headlinesOnly} />
          )}
        </div>
      ))}
    </section>
  );
}
