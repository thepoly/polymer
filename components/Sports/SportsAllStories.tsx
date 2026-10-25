import React from "react";
import Link from "next/link";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { sportLabel, type SportValue } from "@/lib/sports";
import { StoryCard } from "./SportsFeatured";
import { cardPosition, type FeaturedFocus } from "./sportsFormat";

/** Sport tabs shown in the row; the rest go under "More" */
const INLINE_TABS = 6;

export type SportTab = { sport: SportValue; count: number };

// Months in Troy's time zone, matching the dates on the cards
const monthKey = (article: ComponentArticle) => {
  const iso = article.publishedDate || article.createdAt;
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" }).format(new Date(iso));
};

const monthLabel = (key: string, style: "short" | "long") =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: style });

const pageHref = (sport: SportValue | null, page: number) => {
  const params = new URLSearchParams();
  if (sport) params.set("sport", sport);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/sports/all${query ? `?${query}` : ""}`;
};

/** Stands in a grid cell where a new month starts: "OCT / October 2026" */
function MonthTile({ monthKey: key, isCurrent }: { monthKey: string; isCurrent: boolean }) {
  return (
    <div className="flex aspect-[4/5] flex-col justify-start pt-1">
      <span aria-hidden="true" className="mb-4 block h-[2px] w-8 bg-accent" />
      <h2
        className="uppercase leading-[0.9] text-text-main text-[56px] sm:text-[68px] lg:text-[76px]"
        style={{ fontFamily: "var(--font-display-news)", fontWeight: 700 }}
      >
        {monthLabel(key, "short")}
      </h2>
      <p className="mt-2 font-meta text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {isCurrent ? "This month" : `${monthLabel(key, "long")} ${key.slice(0, 4)}`}
      </p>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative -mb-px whitespace-nowrap border-b-2 pb-3 font-meta text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors ${
        active ? "border-accent text-text-main" : "border-transparent text-text-muted hover:text-text-main"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Every sports story as a grid of photo cards, newest first, reading left to
 * right. A month tile opens each month. Tabs filter by sport (most stories
 * first), and the list pages at the foot.
 */
export default function SportsAllStories({
  articles,
  tabs,
  activeSport,
  page,
  totalPages,
  currentMonth,
  focus,
}: {
  articles: ComponentArticle[];
  tabs: SportTab[];
  activeSport: SportValue | null;
  page: number;
  totalPages: number;
  /** "2026-10", for labelling this month's tile */
  currentMonth: string;
  focus: FeaturedFocus;
}) {
  const inline = tabs.slice(0, INLINE_TABS);
  // A filtered sport that would sit under "More" moves into the row instead
  const activeTab = tabs.find((t) => t.sport === activeSport);
  if (activeTab && !inline.includes(activeTab)) inline[inline.length - 1] = activeTab;
  const more = tabs.filter((t) => !inline.includes(t));

  // Cards with a month tile wherever the month changes, including at the top
  const cells: React.ReactNode[] = [];
  let lastMonth: string | null = null;
  for (const article of articles) {
    const key = monthKey(article);
    if (key && key !== lastMonth) {
      cells.push(<MonthTile key={`month-${key}`} monthKey={key} isCurrent={key === currentMonth} />);
      lastMonth = key;
    }
    cells.push(<StoryCard key={article.id} article={article} position={cardPosition(article, focus)} compact className="w-full" />);
  }

  const activeName = activeSport ? sportLabel(activeSport) : null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 md:px-6 xl:px-[30px]">
      <div className="mb-8 flex flex-col gap-5 border-b border-rule lg:flex-row lg:items-end lg:gap-12">
        <h1 className="font-meta text-[40px] uppercase leading-none tracking-[0.04em] sm:text-[48px] lg:pb-3">
          {/* Back to the sports home page */}
          <Link href="/sports" className="text-text-main transition-colors hover:text-accent">
            Sports
          </Link>
        </h1>
        <nav aria-label="Filter by sport" className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Tab href={pageHref(null, 1)} active={!activeSport}>
            All
          </Tab>
          {inline.map((t) => (
            <Tab key={t.sport} href={pageHref(t.sport, 1)} active={t.sport === activeSport}>
              {sportLabel(t.sport)}
            </Tab>
          ))}
          {more.length > 0 && (
            <details className="group/more relative -mb-px pb-3">
              <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap border-b-2 border-transparent font-meta text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-main [&::-webkit-details-marker]:hidden">
                More
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="transition-transform group-open/more:rotate-180">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </summary>
              <div className="absolute right-0 z-20 mt-3 flex min-w-[220px] flex-col border border-rule bg-bg-main py-2 shadow-lg lg:left-0 lg:right-auto">
                {more.map((t) => (
                  <Link
                    key={t.sport}
                    href={pageHref(t.sport, 1)}
                    className="px-4 py-2 font-meta text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted transition-colors hover:bg-text-main/[0.04] hover:text-text-main"
                  >
                    {sportLabel(t.sport)}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </nav>
      </div>

      {cells.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{cells}</div>
      ) : (
        <p className="py-16 text-center font-copy text-[18px] text-text-muted">
          No {activeName ? `${activeName} ` : ""}stories yet.
        </p>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pages" className="mt-12 flex items-center justify-between border-t border-rule pt-6">
          {page > 1 ? (
            <Link
              href={pageHref(activeSport, page - 1)}
              className="border border-text-main px-5 py-3 font-meta text-[12px] font-semibold uppercase tracking-[0.08em] text-text-main transition-colors hover:border-accent hover:bg-accent hover:text-white"
            >
              &#8249; Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="font-meta text-[12px] uppercase tracking-[0.1em] text-text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(activeSport, page + 1)}
              className="border border-text-main px-5 py-3 font-meta text-[12px] font-semibold uppercase tracking-[0.08em] text-text-main transition-colors hover:border-accent hover:bg-accent hover:text-white"
            >
              Older &#8250;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
