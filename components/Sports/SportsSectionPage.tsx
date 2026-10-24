"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle, GameResult, GameTeam } from "@/components/FrontPage/types";
import type { SportStandings } from "@/lib/standings";
import type { SportSchedule } from "@/lib/schedule";
import { sportLabel } from "@/lib/sports";
import SportsStandings, { type StandingsTeam } from "./SportsStandings";
import SportsScoreStrip from "./SportsScoreStrip";

const RPI_FALLBACK: GameTeam = {
  name: "Rensselaer Polytechnic Institute",
  shortName: "RPI",
  logo: null,
  url: "https://rpiathletics.com",
};

const COLUMN_GAP = "clamp(16px, 2vw, 28px)";
const HEADLINE_COUNT = 3;

/* ── Helpers ── */

// Fixed to Troy's time zone so the server render and the browser agree
const shortDate = (article: ComponentArticle, withYear = false) => {
  const iso = article.publishedDate || article.createdAt;
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });
};

/** Day the lead's game was played, typed into the layout editor */
export type ScoreboardDate = { articleId: number; date: string };

// "2026-10-22" is a calendar day, not an instant, so it's read as UTC to keep
// it from shifting a day in any time zone
const gameDayLabel = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })
    : null;

/** The story's sport ("Men's Hockey"); kicker for stories not labelled yet */
const sportName = (article: ComponentArticle) => sportLabel(article.sport) ?? article.kicker;

/**
 * Author names in red, joined with "&", each linked to its staff profile
 * (write-ins stay plain text)
 */
function AuthorNames({ article }: { article: ComponentArticle }) {
  const authors = article.authorLinks?.length
    ? article.authorLinks
    : article.author
      ? [{ name: article.author, href: null }]
      : [];
  return (
    <span className="text-accent">
      {authors.map((a, i) => (
        <React.Fragment key={i}>
          {i > 0 && " & "}
          {a.href ? (
            // z-10 lifts the link above the card's stretched title link
            <TransitionLink href={a.href} className="relative z-10 transition-colors hover:text-text-main">
              {a.name}
            </TransitionLink>
          ) : (
            a.name
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Sport • author • date. Each dot belongs to the item after it and sits in a
 * strip that's clipped off at the start of every line, so a wrapped line
 * never begins or ends with a stray dot. With stackOnDesktop the items stack
 * one per line on desktop, without dots.
 */
function MetaLine({
  article,
  date,
  showAuthors = true,
  className,
  stackOnDesktop = false,
}: {
  article: ComponentArticle;
  date?: string | null;
  showAuthors?: boolean;
  className: string;
  stackOnDesktop?: boolean;
}) {
  const sport = sportName(article);
  const hasAuthors = showAuthors && Boolean(article.authorLinks?.length || article.author);
  const items: { node: React.ReactNode; wrap?: boolean }[] = [
    ...(sport ? [{ node: <span className="font-bold text-text-main">{sport}</span> }] : []),
    ...(hasAuthors ? [{ node: <AuthorNames article={article} />, wrap: true }] : []),
    ...(date ? [{ node: date }] : []),
  ];
  return (
    <div className={`overflow-hidden font-meta uppercase tracking-[0.04em] text-text-muted ${className}`}>
      <div className={`-ml-[1.2em] flex flex-wrap ${stackOnDesktop ? "lg:ml-0 lg:flex-col" : ""}`}>
        {items.map((item, i) => (
          <span
            key={i}
            className={`relative pl-[1.2em] before:absolute before:left-[0.38em] before:content-['•'] ${item.wrap ? "" : "whitespace-nowrap"} ${stackOnDesktop ? "lg:pl-0 lg:before:hidden" : ""}`}
          >
            {item.node}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Scoreboard bar above the lead story ── */

type ScoreSideData = { team: GameTeam; score: number | null };

function ScoreSide({
  side,
  align,
  isWinner,
  hideName,
}: {
  side: ScoreSideData;
  align: "left" | "right";
  isWinner: boolean;
  /** Set by ScoreboardBar when the names don't fit beside logo + score */
  hideName: boolean;
}) {
  // When there isn't room, the logo stands in for the name, as on a broadcast
  // score bug. A hidden name is taken out of the flow but stays measurable.
  // On phones it starts hidden so nothing overlaps before measuring.
  const canHide = Boolean(side.team.logo);
  const hidden = canHide && hideName;
  const hideClass = hidden
    ? "pointer-events-none invisible absolute"
    : canHide
      ? "max-sm:pointer-events-none max-sm:invisible max-sm:absolute"
      : "";
  const nameClassName = `${hideClass} whitespace-nowrap font-meta text-[17px] sm:text-[24px] lg:text-[30px] leading-tight ${align === "left" ? "text-right" : "text-left"} ${isWinner ? "text-text-main font-semibold" : "text-text-muted font-medium"}`;
  const nameBlock = side.team.url ? (
    <a
      href={side.team.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${side.team.name} athletics`}
      data-team-name
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={`${nameClassName} hover:text-accent focus-visible:text-accent transition-colors`}
    >
      {side.team.shortName}
    </a>
  ) : (
    <div data-team-name aria-hidden={hidden || undefined} className={nameClassName}>
      {side.team.shortName}
    </div>
  );

  const logoBlock = side.team.logo ? (
    <div data-team-logo className="relative h-11 w-11 shrink-0 sm:h-16 sm:w-16 lg:h-[76px] lg:w-[76px]">
      {/* Logos are small, already-sized transparent images */}
      <Image src={side.team.logo} alt={`${side.team.name} logo`} fill sizes="76px" className="object-contain" unoptimized />
    </div>
  ) : null;

  const scoreBlock = (
    <span
      className={`text-[46px] sm:text-[64px] lg:text-[84px] leading-none tabular-nums ${isWinner ? "text-text-main" : "text-text-muted"}`}
      style={{ fontFamily: "var(--font-display-news)", fontWeight: 700 }}
    >
      {side.score ?? "–"}
    </span>
  );

  return (
    <div
      data-score-side
      className={`relative flex min-w-0 items-center gap-2.5 sm:gap-5 lg:gap-6 ${align === "left" ? "justify-end" : "justify-start"}`}
    >
      {align === "left" ? (
        <>
          {nameBlock}
          {logoBlock}
          {scoreBlock}
        </>
      ) : (
        <>
          {scoreBlock}
          {logoBlock}
          {nameBlock}
        </>
      )}
    </div>
  );
}

function ScoreboardBar({
  game,
  rpiTeam,
  sport,
  date,
}: {
  game: GameResult;
  rpiTeam: GameTeam;
  /** Shown above the status, e.g. "Men's Hockey" */
  sport?: string | null;
  /** Shown below the status, e.g. "Oct 22" */
  date?: string | null;
}) {
  const rpi: ScoreSideData = { team: rpiTeam, score: game.rpiScore };
  const opponent: ScoreSideData = { team: game.opponent, score: game.opponentScore };
  // Away team on the left, home on the right; RPI is "home" at neutral sites
  const [left, right] = game.homeAway === "away" ? [rpi, opponent] : [opponent, rpi];

  const decided = left.score !== null && right.score !== null && left.score !== right.score;
  const leftWins = decided && (left.score ?? 0) > (right.score ?? 0);
  const rightWins = decided && !leftWins;

  // Hide both team names as soon as either would collide with its logo and
  // score; show them again once there's room. Measured, not a fixed
  // breakpoint, because widths depend on the names ("Western New England").
  const boardRef = useRef<HTMLDivElement>(null);
  const [hideNames, setHideNames] = useState(false);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const fits = [...board.querySelectorAll<HTMLElement>("[data-score-side]")].every((side) => {
        const name = side.querySelector<HTMLElement>("[data-team-name]");
        if (!name || !side.querySelector("[data-team-logo]")) return true;
        const gap = parseFloat(getComputedStyle(side).columnGap) || 0;
        const others = [...side.children]
          .filter((child) => child !== name)
          .reduce((width, child) => width + (child as HTMLElement).offsetWidth, 0);
        return name.scrollWidth + others + gap * 2 <= side.clientWidth;
      });
      setHideNames(!fits);
    };
    // Fires once on observe, then on every resize
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    // Web fonts change the names' widths once they load
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boardRef}
      className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-3 sm:gap-8 sm:pb-4"
    >
      <ScoreSide side={left} align="left" isWinner={leftWins} hideName={hideNames} />
      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
        {sport && (
          <span className="font-meta text-[11px] sm:text-[12px] lg:text-[13px] max-w-[96px] text-center leading-tight uppercase tracking-[0.1em] text-text-main/75 sm:max-w-none sm:whitespace-nowrap">
            {sport}
          </span>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          <span aria-hidden="true" className={`text-[12px] sm:text-[16px] text-text-main ${leftWins ? "" : "invisible"}`}>&#9664;</span>
          <span className="font-meta font-semibold text-[14px] sm:text-[18px] lg:text-[22px] uppercase tracking-[0.06em] text-text-main whitespace-nowrap">
            {game.status}
          </span>
          <span aria-hidden="true" className={`text-[12px] sm:text-[16px] text-text-main ${rightWins ? "" : "invisible"}`}>&#9654;</span>
        </div>
        {date && (
          <span className="font-meta text-[11px] sm:text-[12px] lg:text-[13px] uppercase tracking-[0.1em] text-text-main/75 whitespace-nowrap">
            {date}
          </span>
        )}
      </div>
      <ScoreSide side={right} align="right" isWinner={rightWins} hideName={hideNames} />
    </div>
  );
}

/* ── Lead story: big image with the title box overlapping its bottom-right ── */

function SportsLeadStory({
  article,
  showScoreboard,
  gameDate,
  rpiTeam,
}: {
  article: ComponentArticle;
  showScoreboard: boolean;
  /** Day the game was played, for the scoreboard; else the publish date */
  gameDate: string | null;
  rpiTeam: GameTeam;
}) {
  const href = getArticleUrl(article);
  const image = article.imageFull || article.image;
  const date = shortDate(article);
  const scoreboardDate = (gameDate && gameDayLabel(gameDate)) || date;
  const sport = sportName(article);

  return (
    // Desktop: scoreboard, photo, then the title box overlapping the photo.
    // Phones reorder to title, scoreboard, photo.
    <article className="group flex flex-col">
      {showScoreboard && article.game && (
        <div className="order-2 lg:order-1">
          <ScoreboardBar game={article.game} rpiTeam={rpiTeam} sport={sport} date={scoreboardDate} />
        </div>
      )}

      <TransitionLink href={href} className="order-3 block lg:order-2">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-rule">
          {image && (
            <Image
              src={image}
              alt={article.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 840px"
              className="object-cover"
            />
          )}
        </div>
      </TransitionLink>

      <div className="relative z-10 order-1 mb-5 bg-bg-main lg:order-3 lg:mb-0 lg:-mt-8 lg:ml-auto lg:w-[72%] lg:pl-5 lg:pt-4">
        <MetaLine article={article} date={date} showAuthors={false} className="mb-2 text-[12px]" />
        <TransitionLink href={href}>
          <h2 className="font-copy font-light text-[30px] sm:text-[36px] lg:text-[38px] leading-[1.08] tracking-[-0.01em] text-text-main group-hover:text-accent transition-colors">
            {article.richTitle ?? article.title}
          </h2>
        </TransitionLink>
        <p className="mt-3 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
          <AuthorNames article={article} />
        </p>
      </div>
    </article>
  );
}

/* ── Wide card under the lead: image left, text right ── */

// The title link is stretched over the whole card (after:inset-0), so the
// card stays clickable while the author links inside it stay separate links.
function SportsWideCard({ article, flip = false }: { article: ComponentArticle; flip?: boolean }) {
  const image = article.image || article.imageFull;

  return (
    <div className={`group relative flex flex-col gap-4 sm:items-center sm:gap-6 ${flip ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
      {/* Phones: text above the photo; wider screens: photo left, text right
          (or mirrored with flip) */}
      {image && (
        <div className="relative order-2 aspect-[3/2] w-full shrink-0 overflow-hidden bg-rule sm:order-none sm:w-[46%]">
          <Image
            src={image}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      )}
      <div className="order-1 flex min-w-0 flex-col justify-center gap-2.5 sm:order-none">
        <h3 className="font-copy text-[26px] sm:text-[28px] lg:text-[32px] font-light leading-[1.1] text-text-main group-hover:text-accent transition-colors">
          <TransitionLink href={getArticleUrl(article)} className="after:absolute after:inset-0">
            {article.richTitle ?? article.title}
          </TransitionLink>
        </h3>
        {article.excerpt && (
          <p className="font-copy text-[17px] lg:text-[18px] leading-[1.35] text-text-muted line-clamp-4">{article.excerpt}</p>
        )}
        <MetaLine article={article} date={shortDate(article, true)} className="text-[12px] lg:text-[13px] lg:leading-[1.5]" stackOnDesktop />
      </div>
    </div>
  );
}

/* ── Headlines column ── */

// Below desktop the list runs full width, so sizes scale with the screen
// between a floor and a ceiling (thumbnail capped at 260px) to keep text and
// photo in proportion; the narrow desktop column keeps fixed sizes.
function HeadlineRow({ article, flip = false }: { article: ComponentArticle; flip?: boolean }) {
  const image = article.image || article.imageFull;

  return (
    <div className={`group relative flex items-center gap-4 py-5 first:pt-0 sm:gap-5 lg:gap-3 ${flip ? "flex-row-reverse" : ""}`}>
      {image && (
        <div className="relative aspect-[3/2] w-[40%] max-w-[260px] shrink-0 overflow-hidden bg-rule lg:w-[48%] lg:max-w-none">
          <Image src={image} alt={article.title} fill sizes="(max-width: 1024px) 40vw, 210px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-copy font-light leading-[1.12] text-text-main transition-colors [font-size:clamp(18px,calc(2.2vw_+_10px),26px)] group-hover:text-accent lg:[font-size:21px]">
          {/* Stretched over the row so the whole row opens the story */}
          <TransitionLink href={getArticleUrl(article)} className="after:absolute after:inset-0">
            {article.richTitle ?? article.title}
          </TransitionLink>
        </h3>
        {article.excerpt && (
          <p className="mt-1 font-copy leading-[1.3] text-text-muted line-clamp-2 [font-size:clamp(14px,calc(0.8vw_+_11px),17px)] lg:[font-size:14px]">
            {article.excerpt}
          </p>
        )}
        <MetaLine
          article={article}
          date={shortDate(article, true)}
          className="mt-1.5 [font-size:clamp(11px,calc(0.3vw_+_10px),13px)] lg:leading-[1.5] lg:[font-size:11px]"
          stackOnDesktop
        />
      </div>
    </div>
  );
}

function SportsHeadlines({ articles }: { articles: ComponentArticle[] }) {
  return (
    <section>
      <div style={{ borderTop: "2px solid var(--accent-color)", paddingTop: 4, marginBottom: 16 }}>
        <h2
          className="font-meta uppercase text-accent dark:text-white"
          style={{ fontSize: 21, letterSpacing: "0.08em", fontWeight: 500, margin: "0 0 2px" }}
        >
          Headlines
        </h2>
      </div>
      <div className="divide-y divide-rule">
        {/* Rows alternate: photo left, then text left, then photo left */}
        {articles.map((a, i) => (
          <HeadlineRow key={a.id} article={a} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

/* ── Page ── */

export interface SportsSectionPageProps {
  title: string;
  articles: ComponentArticle[];
  pinnedLead: ComponentArticle | null;
  pinnedBelowLead: ComponentArticle | null;
  /** Second wide card, used only when the scoreboard isn't showing */
  pinnedBelowLead2: ComponentArticle | null;
  pinnedHeadlines: (ComponentArticle | null)[];
  showScoreboard: boolean;
  scoreboardDate: ScoreboardDate | null;
  rpiTeam: GameTeam | null;
  standings: SportStandings[];
  standingsTeams: Record<string, StandingsTeam>;
  /** RPI's recent and upcoming games per standings sport, for the score strip */
  schedule: SportSchedule[];
}

export default function SportsSectionPage({
  title,
  articles,
  pinnedLead,
  pinnedBelowLead,
  pinnedBelowLead2,
  pinnedHeadlines,
  showScoreboard,
  scoreboardDate,
  rpiTeam,
  standings,
  standingsTeams,
  schedule,
}: SportsSectionPageProps) {
  // Pinned slots win; empty slots fill from the newest unused stories,
  // preferring ones with a photo since every slot here shows one.
  const used = new Set<string | number>();
  for (const a of [pinnedLead, pinnedBelowLead, pinnedBelowLead2, ...pinnedHeadlines]) {
    if (a) used.add(a.id);
  }
  const take = (): ComponentArticle | null => {
    const next = articles.find((a) => !used.has(a.id) && a.image) ?? articles.find((a) => !used.has(a.id));
    if (next) used.add(next.id);
    return next ?? null;
  };

  const lead = pinnedLead ?? take();
  const headlines = Array.from({ length: HEADLINE_COUNT }, (_, i) => pinnedHeadlines[i] ?? take()).filter(
    (a): a is ComponentArticle => a !== null,
  );
  const belowLead = pinnedBelowLead ?? take();
  // Without the scoreboard the left column is shorter, so a second wide card
  // (mirrored: text left, photo right) fills the space
  const scoreboardShown = showScoreboard && Boolean(lead?.game);
  const belowLead2 = scoreboardShown ? null : (pinnedBelowLead2 ?? take());

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className={`mx-auto max-w-[1280px] px-4 pb-8 md:px-6 xl:px-[30px] ${schedule.length > 0 ? "" : "pt-5"}`}>
      {/* Header: the score strip, hung from the header's rule, with the page
          title kept for screen readers and search. If RPI Athletics' feed has
          nothing, the title shows instead. */}
      {schedule.length > 0 ? (
        <>
          <h1 className="sr-only">{title}</h1>
          <SportsScoreStrip schedule={schedule} rpiTeam={rpiTeam ?? RPI_FALLBACK} />
        </>
      ) : (
        <h1
          className="mt-3 mb-8 text-center font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:mb-10 sm:text-[52px] lg:text-left lg:text-[60px]"
          style={{ fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
      )}

      {/* Top block: lead stories (~63%) | standings and headlines (~37%) */}
      <div
        className="flex flex-col gap-10 lg:grid lg:gap-y-0"
        style={{ gridTemplateColumns: "1.7fr 1fr", columnGap: COLUMN_GAP }}
      >
        {/* Phone order: lead title, scoreboard, lead photo, wide card,
            standings, headlines. Desktop keeps the two-column layout. */}
        <div className="flex flex-col gap-8">
          {lead && (
            <SportsLeadStory
              article={lead}
              showScoreboard={showScoreboard}
              // Only for the article it was entered for, never one that auto-filled the slot
              gameDate={scoreboardDate && String(scoreboardDate.articleId) === String(lead.id) ? scoreboardDate.date : null}
              rpiTeam={rpiTeam ?? RPI_FALLBACK}
            />
          )}
          {belowLead && <SportsWideCard article={belowLead} />}
          {belowLead2 && <SportsWideCard article={belowLead2} flip />}
        </div>

        <div className="flex flex-col gap-10 lg:gap-0 lg:border-l lg:border-rule lg:pl-6">
          {standings.length > 0 && (
            <div>
              <SportsStandings standings={standings} teams={standingsTeams} defaultSport={lead?.sport} />
            </div>
          )}
          {headlines.length > 0 && (
            <div className={standings.length > 0 ? "lg:mt-6" : ""}>
              <SportsHeadlines articles={headlines} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
