"use client";

import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle, GameResult, GameTeam } from "@/components/FrontPage/types";
import type { SportStandings } from "@/lib/standings";
import type { SportSchedule } from "@/lib/schedule";
import SportsStandings, { type StandingsTeam } from "./SportsStandings";
import SportsScoreStrip from "./SportsScoreStrip";
import SportsFeatured from "./SportsFeatured";
import SportsHeading from "./SportsHeading";
import { GameScores } from "./Scoreboard/GameScores";
import { RPI_FALLBACK } from "./Scoreboard/results";
import SportsByline from "./SportsByline";
import { shortDate, sportName } from "./sportsFormat";
import {
  FEATURED_COUNT,
  HEADLINE_COUNT,
  autoFill,
  type FeaturedFocus,
  type ScoreboardDate,
} from "@/lib/sportsLayout";

const COLUMN_GAP = "clamp(16px, 2vw, 28px)";

/* ── Helpers ── */

/** Author names in red */
function AuthorNames({ article }: { article: ComponentArticle }) {
  return (
    <span className="text-accent">
      <SportsByline article={article} linkClassName="transition-colors hover:text-text-main" />
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

/* ── Lead story: big image with the title box overlapping its bottom-right ── */

function SportsLeadStory({
  article,
  games,
  gameDate,
  titleOverlay,
  rpiTeam,
}: {
  article: ComponentArticle;
  games: GameResult[];
  /** Day the game was played, for the scoreboard; else the publish date */
  gameDate: string | null;
  /** Desktop: title box overlapping the photo's foot, else a plain title below it */
  titleOverlay: boolean;
  rpiTeam: GameTeam;
}) {
  const href = getArticleUrl(article);
  const image = article.imageFull || article.image;
  const date = shortDate(article);
  const sport = sportName(article);
  const series = games.length === 2;

  return (
    // Desktop: scoreboard, photo, then the title box overlapping the photo
    // (or, with the overlay off, a plain title under it). Phones reorder to
    // scoreboard, title, photo either way.
    <article className="group flex flex-col">
      {games.length > 0 && (
        <div className="order-1 pt-4 lg:pt-0">
          <GameScores games={games} rpiTeam={rpiTeam} sport={sport} dateOverride={gameDate} published={article.isoDate} lead />
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

      <div
        className={`${series ? "max-lg:contents" : ""} ${
          titleOverlay
            ? "relative z-10 order-2 mb-5 bg-bg-main lg:order-3 lg:mb-0 lg:-mt-8 lg:ml-auto lg:w-[72%] lg:pl-5 lg:pt-4"
            : "order-2 mb-5 lg:order-3 lg:mb-0 lg:mt-4"
        }`}
      >
        <MetaLine article={article} date={date} showAuthors={false} className={`mb-2 text-[12px] ${series ? "max-lg:hidden" : ""}`} />
        <TransitionLink href={href} className={series ? "max-lg:order-2 max-lg:mb-4" : undefined}>
          <h2 className="font-copy font-light text-[30px] sm:text-[36px] lg:text-[38px] leading-[1.08] tracking-[-0.01em] text-text-main group-hover:text-accent transition-colors">
            {article.richTitle ?? article.title}
          </h2>
        </TransitionLink>
        <p className="order-4 mt-3 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
          <AuthorNames article={article} />
          {series && date && <span className="text-text-muted lg:hidden"> · {date}</span>}
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
function HeadlineRow({ article }: { article: ComponentArticle }) {
  const image = article.image || article.imageFull;

  return (
    // The photo fills the row from top to bottom: at least 3:2 (the spacer
    // inside sets that floor), and taller when the headline runs long
    <div className="group relative flex gap-4 py-5 first:pt-0 last:pb-0 sm:gap-5 lg:gap-3">
      {image && (
        <div className="relative w-[40%] max-w-[260px] shrink-0 overflow-hidden bg-rule lg:w-[48%] lg:max-w-none">
          <div aria-hidden="true" className="aspect-[3/2]" />
          <Image
            src={image}
            alt={article.title}
            fill
            // Cropping to a taller box draws the photo wider than the column
            sizes="(max-width: 1024px) 60vw, 320px"
            className="object-cover"
            style={{ objectPosition: article.imageFocus || undefined }}
          />
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
      <SportsHeading>Headlines</SportsHeading>
      <div className="divide-y divide-rule">
        {/* Every row: photo left, text right */}
        {articles.map((a) => (
          <HeadlineRow key={a.id} article={a} />
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
  /** Featured row slots, in order (null = fill automatically) */
  pinnedFeatured: (ComponentArticle | null)[];
  featuredFocus: FeaturedFocus;
  /** Lead title overlaps its photo on desktop (default), else sits below it */
  leadTitleOverlay: boolean;
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
  pinnedFeatured,
  featuredFocus,
  leadTitleOverlay,
}: SportsSectionPageProps) {
  // Pinned slots win; empty slots fill from the newest unused stories,
  // preferring ones with a photo since every slot here shows one.
  const used = new Set<string | number>();
  for (const a of [pinnedLead, pinnedBelowLead, pinnedBelowLead2, ...pinnedHeadlines, ...pinnedFeatured]) {
    if (a) used.add(a.id);
  }
  const take = (): ComponentArticle | null => {
    const next = autoFill(articles, used, (a) => Boolean(a.image));
    if (next) used.add(next.id);
    return next;
  };

  const lead = pinnedLead ?? take();
  const headlines = Array.from({ length: HEADLINE_COUNT }, (_, i) => pinnedHeadlines[i] ?? take()).filter(
    (a): a is ComponentArticle => a !== null,
  );
  const belowLead = pinnedBelowLead ?? take();
  const games = showScoreboard ? lead?.games ?? [] : [];
  // Without the scoreboard the left column is shorter, so a second wide card
  // (mirrored: text left, photo right) fills the space
  const belowLead2 = games.length ? null : (pinnedBelowLead2 ?? take());
  // Featured row: pinned cards keep their places, the rest fill from what's left
  const featured = Array.from({ length: FEATURED_COUNT }, (_, i) => pinnedFeatured[i] ?? take()).filter(
    (a): a is ComponentArticle => a !== null,
  );

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className={`mx-auto max-w-[1280px] px-4 pb-2.5 md:px-6 xl:px-[30px] ${schedule.length > 0 ? "" : "pt-5"}`}>
      {/* Header: the score strip, hung from the header's rule, with the page
          title kept for screen readers and search. The original "Sports |
          Contact" header shows instead when editors switch the strip off (the
          layout editor's "Scores banner") or RPI Athletics' feed has nothing. */}
      {schedule.length > 0 ? (
        <>
          <h1 className="sr-only">{title}</h1>
          <SportsScoreStrip schedule={schedule} rpiTeam={rpiTeam ?? RPI_FALLBACK} />
        </>
      ) : (
        <div className="mt-3 mb-8 flex flex-col items-center gap-4 text-center sm:mb-10 lg:flex-row lg:items-center lg:gap-6 lg:text-left">
          <h1
            className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px] lg:text-[60px]"
            style={{ fontWeight: 400, lineHeight: 1 }}
          >
            {title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[24px] sm:text-[28px] lg:justify-start lg:text-[36px]">
            <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
            <a
              href="mailto:sports@poly.rpi.edu?subject=Sports%20Request%2FComment%20or%20Tip"
              className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
              style={{ fontWeight: 300 }}
            >
              Contact
            </a>
          </div>
        </div>
      )}

      {/* Top block: lead stories (~63%) | standings and headlines (~37%) */}
      <div
        className="flex flex-col gap-10 lg:grid lg:gap-y-0"
        style={{ gridTemplateColumns: "1.7fr 1fr", columnGap: COLUMN_GAP }}
      >
        {/* Phone order: scoreboard, lead title, lead photo, wide card,
            standings, headlines. Desktop keeps the two-column layout. */}
        <div className="flex flex-col gap-8">
          {lead && (
            <SportsLeadStory
              article={lead}
              games={games}
              // Only for the article it was entered for, never one that auto-filled the slot
              gameDate={scoreboardDate && String(scoreboardDate.articleId) === String(lead.id) ? scoreboardDate.date : null}
              titleOverlay={leadTitleOverlay}
              rpiTeam={rpiTeam ?? RPI_FALLBACK}
            />
          )}
          {belowLead && <SportsWideCard article={belowLead} />}
          {belowLead2 && <SportsWideCard article={belowLead2} flip />}
        </div>

        <div className="flex flex-col gap-3 md:gap-5 lg:gap-0 lg:border-l lg:border-rule lg:pl-6">
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

      {featured.length > 0 && <SportsFeatured articles={featured} focus={featuredFocus} />}
    </div>
  );
}
