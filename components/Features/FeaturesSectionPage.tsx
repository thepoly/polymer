"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { AnimatedLine } from "@/components/Opinion/RainbowDivider";

/* ── Types ── */

export type FeaturesEvent = {
  title: string;
  date: string;
  time: string;
  location?: string;
  url?: string;
};

export type SpotlightPhoto = {
  url: string;
  caption?: string;
  articleTitle?: string;
  articleUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
};

const PAGE_SIDE_PADDING = "clamp(16px, 3vw, 30px)";
const COLUMN_GAP = "clamp(16px, 2vw, 24px)";
const SECTION_RULE_GAP = "clamp(18px, 3vw, 24px)";
const SECTION_RULE_INSET = 7;

/* ── Article card — optionally shows image ── */

function FeaturesCard({
  article,
  withImage = false,
  priority = false,
  large = false,
  showExcerpt = false,
  hideDate = false,
}: {
  article: ComponentArticle;
  withImage?: boolean;
  priority?: boolean;
  large?: boolean;
  showExcerpt?: boolean;
  hideDate?: boolean;
}) {
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className="group block mb-5"
    >
      {withImage && article.image && (
        <div
          className="relative overflow-hidden mb-3 -mx-4 w-auto sm:mx-0 sm:w-full"
          style={{ aspectRatio: large ? "16/9" : "3/2" }}
        >
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            sizes={large ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            priority={priority}
          />
        </div>
      )}
      {article.kicker && (
        <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
          {article.kicker}
        </span>
      )}
      <h3
        className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
        style={{ fontSize: large ? 34 : 20 }}
      >
        {article.richTitle || article.title}
      </h3>
      <Byline
        author={article.author}
        date={hideDate ? null : article.date}
        variant="features"
        className="mt-2 text-[13px]"
      />
      {showExcerpt && article.excerpt && (
        <p className="mt-0.5 font-meta text-[15px] font-medium leading-[1.5] text-text-main line-clamp-4">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/* ── Upcoming Events box ── */

function UpcomingEvents({ events }: { events: FeaturesEvent[] }) {
  // Filter out events whose day has already ended
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return events.filter((e) => e.date >= todayStr);
  }, [events]);

  if (upcomingEvents.length === 0) return null;

  const formatEventDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="mb-8">
      <div
        style={{
          borderTop: "2px solid var(--accent-color)",
          paddingTop: 10,
        }}
      >
        <p
          className="font-meta uppercase"
          style={{
            fontSize: 17,
            letterSpacing: "0.08em",
            color: "var(--accent-color)",
            fontWeight: 500,
            margin: "0 0 2px",
          }}
        >
          Upcoming Events
        </p>
        <div className="flex flex-col">
          {upcomingEvents.map((event, i) => {
            const hasUrl = event.url && event.url.trim().length > 0;
            const titleEl = (
              <h4
                className={`font-meta text-[16px] font-medium leading-[1.2] m-0 ${
                  hasUrl
                    ? "text-text-main transition-colors group-hover:text-accent group-hover:underline"
                    : "text-text-main"
                }`}
              >
                {event.title}
              </h4>
            );

            return (
              <div
                key={i}
                style={{
                  padding: "5px 0",
                  borderBottom:
                    i < upcomingEvents.length - 1
                      ? "1px solid var(--rule-color, #e0e0e0)"
                      : "none",
                }}
              >
                {hasUrl ? (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block no-underline"
                  >
                    {titleEl}
                  </a>
                ) : (
                  titleEl
                )}
                <div className="mt-1 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
                  <span className="text-accent">
                    {formatEventDate(event.date)}
                  </span>
                  <span className="text-text-muted mx-1.5">&bull;</span>
                  <span className="text-text-muted">{event.time}</span>
                  {event.location && (
                    <>
                      <span className="text-text-muted mx-1.5">&bull;</span>
                      <span className="text-text-muted">{event.location}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Photo Spotlight Carousel ── */

function PhotoSpotlightCarousel({ photos }: { photos: SpotlightPhoto[] }) {
  const [current, setCurrent] = useState(0);

  if (photos.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setCurrent((c) => (c + 1) % photos.length);

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <h2
        className="font-meta uppercase tracking-[0.04em] text-text-main text-center"
        style={{ fontSize: 28, fontWeight: 500, marginBottom: 16, marginTop: 0 }}
      >
        Photo Spotlight
      </h2>
      <div className="-mx-4 w-auto overflow-hidden sm:mx-0 sm:w-full" style={{ borderRadius: 4 }}>
        <div style={{ aspectRatio: "3/2", position: "relative" }}>
          <Image
            src={photos[current].url}
            alt={photos[current].caption || ""}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      </div>
      {photos[current].photographerName && (
        <p className="mt-2 font-meta text-[15px] font-medium text-accent text-center">
          Shot by{' '}
          {photos[current].photographerUrl ? (
            <TransitionLink href={photos[current].photographerUrl!} className="hover:underline">
              {photos[current].photographerName}
            </TransitionLink>
          ) : (
            photos[current].photographerName
          )}
        </p>
      )}
      {photos[current].articleTitle && (
        <p className="mt-0.5 font-meta text-[13px] text-text-muted text-center">
          {photos[current].articleUrl ? (
            <TransitionLink href={photos[current].articleUrl!} className="hover:underline">
              {photos[current].articleTitle}
            </TransitionLink>
          ) : (
            photos[current].articleTitle
          )}
        </p>
      )}
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 mb-6">
          <button
            onClick={prev}
            style={{ fontSize: 22, lineHeight: 1, padding: "0 4px", color: "#999", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", position: "relative", top: -1 }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <div className="flex gap-1.5 items-center">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: i === current ? "var(--accent-color)" : "#d9d9d9",
                  transition: "background 0.2s",
                }}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            style={{ fontSize: 22, lineHeight: 1, padding: "0 4px", color: "#999", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", position: "relative", top: -1 }}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </div>
      )}
    </div>
  );
}

function MobileSectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  const heading = href ? (
    <TransitionLink
      href={href}
      className="font-meta text-[20px] font-bold tracking-[0.04em] text-accent dark:text-white uppercase leading-[1] hover:opacity-75 transition-opacity"
    >
      {title}
    </TransitionLink>
  ) : (
    <span className="font-meta text-[20px] font-bold tracking-[0.04em] text-accent dark:text-white uppercase leading-[1]">
      {title}
    </span>
  );

  return (
    <div className="mb-3">
      <div className="relative -left-2 w-[calc(100%+0.5rem)] border-t border-black dark:border-white" />
      <h2 className="mt-4">{heading}</h2>
    </div>
  );
}

function MobileFeaturesList({
  articles,
  imageFlags,
  largeFirst = false,
  showExcerptFirst = false,
  hideDates = false,
}: {
  articles: ComponentArticle[];
  imageFlags?: boolean[];
  largeFirst?: boolean;
  showExcerptFirst?: boolean;
  hideDates?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {articles.map((article, i) => (
        <div key={article.id} className={i > 0 ? "mt-10" : ""}>
          <FeaturesCard
            article={article}
            withImage={imageFlags ? Boolean(imageFlags[i]) : Boolean(article.image)}
            large={largeFirst && i === 0}
            showExcerpt={showExcerptFirst && i === 0}
            hideDate={hideDates}
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */

export default function FeaturesSectionPage({
  title,
  articles,
  pinnedOnCampus,
  pinnedFeatured,
  pinnedRight,
  events,
  onCampusImages,
  rightImages,
  pinnedTheArts,
  theArtsImages,
  photoSpotlight,
  pinnedSpotlightSubs,
  pinnedCollarCity,
  collarCityImages,
  pinnedWide = [],
}: {
  title: string;
  articles: ComponentArticle[];
  pinnedOnCampus: ComponentArticle[];
  pinnedFeatured: ComponentArticle[];
  pinnedRight: ComponentArticle[];
  events: FeaturesEvent[];
  onCampusImages: boolean[];
  rightImages: boolean[];
  pinnedTheArts: ComponentArticle[];
  theArtsImages: boolean[];
  photoSpotlight: SpotlightPhoto[];
  pinnedSpotlightSubs: ComponentArticle[];
  pinnedCollarCity: ComponentArticle[];
  collarCityImages: boolean[];
  pinnedWide?: ComponentArticle[];
}) {
  // Build set of pinned IDs to exclude from auto-fill
  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of [...pinnedOnCampus, ...pinnedFeatured, ...pinnedRight, ...pinnedTheArts, ...pinnedSpotlightSubs, ...pinnedCollarCity, ...(pinnedWide || [])]) {
      ids.add(String(a.id));
    }
    return ids;
  }, [pinnedOnCampus, pinnedFeatured, pinnedRight, pinnedTheArts, pinnedSpotlightSubs, pinnedCollarCity, pinnedWide]);

  // Auto-fill pool: articles not already pinned
  const autoFillPool = useMemo(
    () => articles.filter((a) => !pinnedIds.has(String(a.id))),
    [articles, pinnedIds],
  );

  // Fill each column: pinned first, then auto-fill to reach slot count
  const fillColumn = (
    pinned: ComponentArticle[],
    slotCount: number,
    poolRef: { idx: number },
  ): ComponentArticle[] => {
    const result: ComponentArticle[] = [...pinned];
    while (result.length < slotCount && poolRef.idx < autoFillPool.length) {
      result.push(autoFillPool[poolRef.idx++]);
    }
    return result;
  };

  const poolRef = { idx: 0 };
  const onCampus = fillColumn(pinnedOnCampus, 3, poolRef);
  const featured = fillColumn(pinnedFeatured, 3, poolRef);
  const right = fillColumn(pinnedRight, 3, poolRef);
  const theArts = fillColumn(pinnedTheArts, 3, poolRef);
  const spotlightSubs = fillColumn(pinnedSpotlightSubs, 2, poolRef);
  const collarCity = fillColumn(pinnedCollarCity, 3, poolRef);
  const wideArticle = fillColumn(pinnedWide, 1, poolRef);

  const sectionColumnStyle = {
    borderRight: "1px solid var(--rule-color)",
    paddingRight: COLUMN_GAP,
  } as const;

  const sectionBreakContentStyle = {
    paddingTop: SECTION_RULE_GAP,
  } as const;

  const getSectionBreakRuleStyle = (insetLeft = 0, insetRight = 0) =>
    ({
      borderTop: "1px solid var(--text-main, #1a1a1a)",
      marginTop: SECTION_RULE_GAP,
      marginLeft: insetLeft,
      marginRight: insetRight,
    }) as const;
  const LOWER_SECTION_EXTRA_TOP_SPACE = 8;

  const getSectionHeadingWrapStyle = (insetLeft = 0, insetRight = 0) =>
    ({
      marginLeft: insetLeft,
      marginRight: insetRight,
      paddingTop: SECTION_RULE_GAP,
    }) as const;

  return (
    <div
      style={{ maxWidth: 1280, margin: "0 auto", padding: `20px ${PAGE_SIDE_PADDING} 32px` }}
    >
      {/* Header */}
      <div className="mt-6 mb-8 flex flex-col items-center gap-4 text-center sm:mb-10 lg:flex-row lg:items-center lg:gap-6 lg:text-left">
        <h1
          className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px] lg:text-[60px]"
          style={{ fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[24px] sm:text-[28px] lg:justify-start lg:text-[36px]">
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <TransitionLink
            href="/features/submit-event"
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Submit
          </TransitionLink>
          <span className="font-meta text-text-muted lg:hidden" aria-hidden="true">
            &middot;
          </span>
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <a
            href="mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Event%20Tip"
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Contact
          </a>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="flex flex-col">
          <MobileSectionHeader title="On-Campus" href="/features" />
          <MobileFeaturesList articles={onCampus} imageFlags={onCampusImages} hideDates />
        </div>

        <div className="mt-12">
          <MobileSectionHeader title="Featured" href="/features" />
          <div className="flex flex-col">
            {featured[0] && (
              <FeaturesCard article={featured[0]} withImage large priority showExcerpt />
            )}
            {featured[1] && (
              <div className="mt-10">
                <FeaturesCard article={featured[1]} withImage />
              </div>
            )}
            {featured[2] && (
              <div className="mt-10">
                <FeaturesCard article={featured[2]} withImage />
              </div>
            )}
            {wideArticle[0] && (
              <div className="mt-10">
                <FeaturesCard article={wideArticle[0]} withImage showExcerpt />
              </div>
            )}
          </div>
        </div>

        {events.length > 0 && (
          <div className="mt-12">
            <MobileSectionHeader title="Upcoming Events" />
            <UpcomingEvents events={events} />
          </div>
        )}

        {(right.length > 0) && (
          <div className="mt-12">
            <MobileSectionHeader title="Latest" />
            <MobileFeaturesList articles={right} imageFlags={rightImages} />
          </div>
        )}

        {photoSpotlight.length > 0 && (
          <div className="mt-12">
            <MobileSectionHeader title="Photo Spotlight" />
            <PhotoSpotlightCarousel photos={photoSpotlight} />
          </div>
        )}

        {spotlightSubs.length > 0 && (
          <div className="mt-12">
            <MobileSectionHeader title="Spotlight Stories" />
            <MobileFeaturesList articles={spotlightSubs} />
          </div>
        )}

        {theArts.length > 0 && (
          <div className="mt-12">
            <MobileSectionHeader title="The Arts" />
            <MobileFeaturesList articles={theArts} imageFlags={theArtsImages} hideDates />
          </div>
        )}

        {collarCity.length > 0 && (
          <div className="mt-12">
            <MobileSectionHeader title="Collar City Column" />
            <MobileFeaturesList articles={collarCity} imageFlags={collarCityImages} />
          </div>
        )}

        <div className="mt-12">
          <MobileSectionHeader title="More in Features" href="/features/archive" />
          <MobileFeaturesList articles={autoFillPool.slice(poolRef.idx, poolRef.idx + 5)} />
        </div>
      </div>

      {/* Single grid — vertical lines are continuous, horizontal line breaks at intersections */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: "240px 1fr 320px",
          gap: `0 ${COLUMN_GAP}`,
        }}
      >
        {/* ══ Row 1 ══ */}

        {/* ── Left column: On-Campus ── */}
        <div style={sectionColumnStyle}>
          <div
            style={{
              borderTop: "2px solid var(--accent-color)",
              paddingTop: 4,
              marginBottom: 16,
            }}
          >
            <h2
              className="font-meta uppercase text-accent dark:text-white"
              style={{
                fontSize: 17,
                letterSpacing: "0.08em",
                fontWeight: 500,
                margin: "0 0 2px",
              }}
            >
              On-Campus
            </h2>
          </div>

          {onCampus[0] && <FeaturesCard article={onCampus[0]} withImage={onCampusImages[0]} priority hideDate />}
          {onCampus[1] && <FeaturesCard article={onCampus[1]} withImage={onCampusImages[1]} hideDate />}

          {/* Event submission CTA */}
          <div className="py-8 border-y border-rule text-center" style={{ marginBottom: 30 }}>
            <p className="font-meta uppercase tracking-[0.04em] text-text-main" style={{ fontSize: 19, fontWeight: 500 }}>
              Have something you want to be{" "}
              <TransitionLink
                href="/features/submit-event"
                className="text-accent hover:underline transition-colors"
              >
                featured
              </TransitionLink>
              ?
            </p>
          </div>

          {onCampus[2] && <FeaturesCard article={onCampus[2]} withImage={onCampusImages[2]} hideDate />}
        </div>

        {/* ── Middle column: Featured ── */}
        <div style={sectionColumnStyle}>
          {/* Large hero article */}
          {featured[0] && (
            <FeaturesCard article={featured[0]} withImage large priority showExcerpt />
          )}

          {/* Two articles with images below */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 20px",
            }}
          >
            {featured[1] && <FeaturesCard article={featured[1]} withImage />}
            {featured[2] && <FeaturesCard article={featured[2]} withImage />}
          </div>

          {/* Wide article: text left, image right */}
          {wideArticle[0] && (
            <TransitionLink
              href={getArticleUrl(wideArticle[0])}
              className="group"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start", marginTop: 8 }}
            >
              <div>
                {wideArticle[0].kicker && (
                  <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
                    {wideArticle[0].kicker}
                  </span>
                )}
                <h2
                  className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
                  style={{ fontSize: 28 }}
                >
                  {wideArticle[0].richTitle || wideArticle[0].title}
                </h2>
                <Byline author={wideArticle[0].author} date={wideArticle[0].date} variant="features" className="mt-2 text-[13px]" />
                {wideArticle[0].excerpt && (
                  <p className="mt-2 font-meta text-[15px] font-medium leading-[1.5] text-text-muted line-clamp-3">
                    {wideArticle[0].excerpt}
                  </p>
                )}
              </div>
              {wideArticle[0].image && (
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
                  <Image
                    src={wideArticle[0].image}
                    alt={wideArticle[0].imageTitle || ""}
                    fill
                    className="object-cover"
                    sizes="40vw"
                  />
                </div>
              )}
            </TransitionLink>
          )}
        </div>

        {/* ── Right column: Events + articles ── */}
        <div>
          {/* Upcoming Events */}
          <UpcomingEvents events={events} />

          {right[0] && <FeaturesCard article={right[0]} withImage={rightImages[0]} />}
          {right[1] && <FeaturesCard article={right[1]} withImage={rightImages[1]} />}
          {right[2] && <FeaturesCard article={right[2]} withImage={rightImages[2]} />}
        </div>

        {/* ══ Row 2 — borderTop on each cell creates the horizontal line with gaps at the vertical intersections ══ */}

        {/* ── Left column: The Arts ── */}
        <div style={sectionColumnStyle}>
          <div
            style={{
              ...getSectionBreakRuleStyle(0, SECTION_RULE_INSET),
              marginTop: `calc(${SECTION_RULE_GAP} + ${LOWER_SECTION_EXTRA_TOP_SPACE}px)`,
            }}
          />
          <div style={getSectionHeadingWrapStyle(0, SECTION_RULE_INSET)}>
            <h2
              className="font-meta uppercase tracking-[0.04em] text-text-main text-center"
              style={{ fontSize: 28, fontWeight: 500, marginTop: 0, marginBottom: 16 }}
            >
              The Arts
            </h2>
          </div>
          <div>

            {theArts[0] && <FeaturesCard article={theArts[0]} withImage={theArtsImages[0]} priority hideDate />}
            {theArts[1] && <FeaturesCard article={theArts[1]} withImage={theArtsImages[1]} hideDate />}
            {theArts[2] && <FeaturesCard article={theArts[2]} withImage={theArtsImages[2]} hideDate />}
          </div>
        </div>

        {/* ── Middle column: Photo Spotlight ── */}
        <div style={sectionColumnStyle}>
          <div
            style={{
              ...getSectionBreakRuleStyle(SECTION_RULE_INSET, SECTION_RULE_INSET),
              marginTop: `calc(${SECTION_RULE_GAP} + ${LOWER_SECTION_EXTRA_TOP_SPACE}px)`,
            }}
          />
          <div style={sectionBreakContentStyle}>
            <PhotoSpotlightCarousel photos={photoSpotlight} />

            {/* Two sub-feature articles with images */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 20px",
              }}
            >
              {spotlightSubs[0] && <FeaturesCard article={spotlightSubs[0]} withImage />}
              {spotlightSubs[1] && <FeaturesCard article={spotlightSubs[1]} withImage />}
            </div>
          </div>
        </div>

        {/* ── Right column: Collar City Column ── */}
        <div>
          <div
            style={{
              ...getSectionBreakRuleStyle(SECTION_RULE_INSET, 0),
              marginTop: `calc(${SECTION_RULE_GAP} + ${LOWER_SECTION_EXTRA_TOP_SPACE}px)`,
            }}
          />
          <div style={getSectionHeadingWrapStyle(SECTION_RULE_INSET, 0)}>
            <h2
              className="font-meta uppercase tracking-[0.04em] text-text-main text-center"
              style={{ fontSize: 24, fontWeight: 500, marginTop: 0, marginBottom: 16 }}
            >
              Collar City Column
            </h2>
          </div>
          <div>

            {collarCity[0] && <FeaturesCard article={collarCity[0]} withImage={collarCityImages[0]} />}
            {collarCity[1] && <FeaturesCard article={collarCity[1]} withImage={collarCityImages[1]} />}
            {collarCity[2] && <FeaturesCard article={collarCity[2]} withImage={collarCityImages[2]} />}
          </div>
        </div>
      </div>

      {/* ── More in Features ── */}
      <div className="mt-14 hidden md:block">
        <style>{`
          @keyframes dividerWaveTravel {
            from { transform: translateX(-600px); }
            to   { transform: translateX(0px); }
          }
          @keyframes dividerRainbowHue {
            from { filter: hue-rotate(0deg); }
            to   { filter: hue-rotate(360deg); }
          }
        `}</style>
        <AnimatedLine id="features-more" delay={0} duration={300} style={{ marginTop: SECTION_RULE_GAP, marginBottom: 8 }} />
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-meta uppercase tracking-[0.04em] text-text-main" style={{ fontSize: 28, fontWeight: 500 }}>
            More in Features
          </h2>
          <TransitionLink
            href="/features/archive"
            className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
          >
            More &rarr;
          </TransitionLink>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 24,
          }}
        >
          {autoFillPool.slice(poolRef.idx, poolRef.idx + 5).map((article) => (
            <TransitionLink
              key={article.id}
              href={getArticleUrl(article)}
              className="group block"
            >
              {article.image && (
                <div className="relative overflow-hidden mb-3" style={{ aspectRatio: "3/2" }}>
                  <Image
                    src={article.image}
                    alt={article.imageTitle || ""}
                    fill
                    className="object-cover"
                    sizes="20vw"
                  />
                </div>
              )}
              {article.kicker && (
                <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
                  {article.kicker}
                </span>
              )}
              <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors group-hover:text-accent">
                {article.richTitle || article.title}
              </h3>
              <Byline author={article.author} variant="features" className="mt-2 text-[13px]" />
            </TransitionLink>
          ))}
        </div>
      </div>
    </div>
  );
}
