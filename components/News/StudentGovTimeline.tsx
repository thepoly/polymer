import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { Byline } from "@/components/FrontPage/Byline";
import { formatTimelineDate } from "./StudentGovColumn";
import { STUDENT_GOV, STUDENT_GOV_BODIES, updateAnchor, type StudentGovBody, type TimelineItem } from "./studentGov";

/** "November 2026", fixed to Troy's time zone */
const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/New_York" });

function groupByMonth(items: TimelineItem[]): { month: string; items: TimelineItem[] }[] {
  const groups: { month: string; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const month = monthLabel(item.date);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

function Entry({ item }: { item: TimelineItem }) {
  const dot = (
    <span
      aria-hidden="true"
      className={`absolute -left-[6.5px] top-[7px] h-3 w-3 rounded-full border-2 border-bg-main ${
        item.kind === "article" ? "bg-accent" : "bg-text-main"
      }`}
    />
  );
  const date = (
    <time
      dateTime={item.date}
      className="block font-meta text-[12px] font-medium uppercase tracking-[0.08em] text-text-muted"
    >
      {formatTimelineDate(item.date, true)}
      <span className="ml-2 text-accent">{item.kind === "article" ? "Article" : "Update"}</span>
    </time>
  );

  if (item.kind === "update") {
    return (
      <li id={updateAnchor(item.id)} className="relative scroll-mt-24 pb-9 pl-7 last:pb-0">
        {dot}
        {date}
        <h3 className="mt-1 font-copy text-[24px] font-medium leading-[1.15] text-text-main">{item.title}</h3>
        <p className="mt-2 max-w-[640px] whitespace-pre-line font-meta text-[16px] leading-[1.55] text-text-main">
          {item.blurb}
        </p>
      </li>
    );
  }

  const { article } = item;
  return (
    <li className="relative pb-9 pl-7 last:pb-0">
      {dot}
      {date}
      <TransitionLink href={getArticleUrl(article)} className="group mt-1 flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <h3 className="font-copy text-[24px] font-medium leading-[1.15] text-text-main transition-colors group-hover:text-accent">
            {article.richTitle || article.title}
          </h3>
          <Byline author={article.author} variant="features" className="mt-2 text-[12px]" />
          {article.excerpt && (
            <p className="mt-1.5 max-w-[640px] font-meta text-[16px] font-medium leading-[1.5] text-text-main">
              {article.excerpt}
            </p>
          )}
        </div>
        {article.image && (
          <div className="relative hidden aspect-[3/2] w-[180px] shrink-0 overflow-hidden sm:block">
            <Image
              src={article.image}
              alt={article.imageTitle || ""}
              fill
              className="object-cover"
              style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
              sizes="180px"
            />
          </div>
        )}
      </TransitionLink>
    </li>
  );
}

/**
 * /news/senate and /news/executive-board: every article with the body's
 * kicker and every update, newest first, on a vertical line grouped by month.
 */
export default function StudentGovTimeline({ body, items }: { body: StudentGovBody; items: TimelineItem[] }) {
  const meta = STUDENT_GOV[body];
  const other = STUDENT_GOV[STUDENT_GOV_BODIES.find((b) => b !== body) as StudentGovBody];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-16 md:px-6 xl:px-[30px]">
      <div className="mt-6 mb-10">
        <TransitionLink
          href="/news"
          className="font-meta text-[13px] font-medium uppercase tracking-[0.08em] text-accent hover:underline"
        >
          News
        </TransitionLink>
        <span className="mx-2 font-meta text-[13px] text-text-muted" aria-hidden="true">
          /
        </span>
        <span className="font-meta text-[13px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Student Government
        </span>
        <h1
          className="mt-3 font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white text-[36px] sm:text-[48px] lg:text-[56px]"
          style={{ fontWeight: 400, lineHeight: 1 }}
        >
          {meta.title}
        </h1>
        <p className="mt-3 font-meta text-[15px] text-text-muted">
          Articles and updates, newest first.{" "}
          <TransitionLink href={other.href} className="text-accent hover:underline">
            {other.title} timeline &rsaquo;
          </TransitionLink>
        </p>
      </div>

      {items.length === 0 ? (
        <p className="font-meta text-[16px] text-text-muted">Nothing here yet.</p>
      ) : (
        <div className="max-w-[880px]">
          {groupByMonth(items).map((group) => (
            <section key={group.month} className="mb-10 last:mb-0">
              <h2 className="mb-5 font-meta text-[15px] font-semibold uppercase tracking-[0.1em] text-text-main">
                {group.month}
              </h2>
              <ol className="ml-[6px] border-l border-[var(--rule-color)]">
                {group.items.map((item) => (
                  <Entry key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
