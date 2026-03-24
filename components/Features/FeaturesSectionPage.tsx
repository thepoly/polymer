"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
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
};

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
          className="relative overflow-hidden mb-3"
          style={{ aspectRatio: large ? "16/9" : "3/2" }}
        >
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes={large ? "50vw" : "33vw"}
            priority={priority}
          />
        </div>
      )}
      {article.kicker && (
        <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent block mb-1.5">
          {article.kicker}
        </span>
      )}
      <h3
        className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
        style={{ fontSize: large ? 34 : 20 }}
      >
        {article.title}
      </h3>
      <div className="mt-2 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
        {article.author && (
          <span>
            <span className="text-text-muted">BY </span>
            <span className="text-accent">{article.author}</span>
          </span>
        )}
        {!hideDate && article.author && article.date && (
          <span className="text-text-muted mx-1.5">&bull;</span>
        )}
        {!hideDate && article.date && (
          <span className="text-text-muted">{article.date}</span>
        )}
      </div>
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
  if (events.length === 0) return null;

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
          borderTop: "2px solid #C41E3A",
          paddingTop: 10,
        }}
      >
        <p
          className="font-meta uppercase"
          style={{
            fontSize: 15,
            letterSpacing: "0.08em",
            color: "#C41E3A",
            fontWeight: 500,
            margin: "0 0 2px",
          }}
        >
          Upcoming Events
        </p>
        <div className="flex flex-col">
          {events.map((event, i) => {
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
                    i < events.length - 1
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
      <div style={{ overflow: "hidden", borderRadius: 4 }}>
        <div style={{ aspectRatio: "3/2", position: "relative" }}>
          <Image
            src={photos[current].url}
            alt={photos[current].caption || ""}
            fill
            className="object-cover"
            sizes="50vw"
          />
        </div>
      </div>
      {photos[current].articleTitle && (
        <p className="mt-2 font-meta text-[15px] font-medium text-accent text-center">
          {photos[current].articleTitle}
        </p>
      )}
      {photos[current].caption && (
        <p className="mt-0.5 font-meta text-[13px] text-text-muted italic text-center">
          {photos[current].caption}
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
                  background: i === current ? "#C41E3A" : "#d9d9d9",
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

  return (
    <div
      style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 30px 32px" }}
    >
      {/* Header */}
      <div className="flex items-center mt-6 mb-10" style={{ gap: 24 }}>
        <h1
          className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors"
          style={{ fontSize: 60, fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
      </div>

      {/* Single grid — vertical lines are continuous, horizontal line breaks at intersections */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 320px",
          gap: "0 24px",
        }}
      >
        {/* ══ Row 1 ══ */}

        {/* ── Left column: On-Campus ── */}
        <div
          style={{
            borderRight: "1px solid var(--rule-color)",
            paddingRight: 24,
          }}
        >
          <h2
            className="font-meta uppercase tracking-[0.04em] text-text-main"
            style={{ fontSize: 28, fontWeight: 500, marginBottom: 16 }}
          >
            On-Campus
          </h2>

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
        <div
          style={{
            borderRight: "1px solid var(--rule-color)",
            paddingRight: 24,
          }}
        >
          <h2
            className="font-meta uppercase tracking-[0.04em] text-text-main"
            style={{ fontSize: 28, fontWeight: 500, marginBottom: 16 }}
          >
            Featured
          </h2>

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
                  <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent block mb-1.5">
                    {wideArticle[0].kicker}
                  </span>
                )}
                <h2
                  className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
                  style={{ fontSize: 28 }}
                >
                  {wideArticle[0].title}
                </h2>
                {wideArticle[0].author && (
                  <div className="mt-2 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
                    <span className="text-text-muted">BY </span>
                    <span className="text-accent">{wideArticle[0].author}</span>
                    {wideArticle[0].date && (
                      <>
                        <span className="text-text-muted mx-1.5">&bull;</span>
                        <span className="text-text-muted">{wideArticle[0].date}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              {wideArticle[0].image && (
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
                  <Image
                    src={wideArticle[0].image}
                    alt={wideArticle[0].title}
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
        <div
          style={{
            borderRight: "1px solid var(--rule-color)",
            paddingRight: 24,
          }}
        >
          <div style={{ borderTop: "1px solid var(--text-main, #1a1a1a)", marginRight: 7 }} />
          <div style={{ paddingTop: 24 }}>
            <h2
              className="font-meta uppercase tracking-[0.04em] text-text-main"
              style={{ fontSize: 28, fontWeight: 500, marginBottom: 16 }}
            >
              The Arts
            </h2>

            {theArts[0] && <FeaturesCard article={theArts[0]} withImage={theArtsImages[0]} priority hideDate />}
            {theArts[1] && <FeaturesCard article={theArts[1]} withImage={theArtsImages[1]} hideDate />}
            {theArts[2] && <FeaturesCard article={theArts[2]} withImage={theArtsImages[2]} hideDate />}
          </div>
        </div>

        {/* ── Middle column: Photo Spotlight ── */}
        <div
          style={{
            borderRight: "1px solid var(--rule-color)",
            paddingRight: 24,
          }}
        >
          <div style={{ borderTop: "1px solid var(--text-main, #1a1a1a)", marginLeft: 7, marginRight: 7 }} />
          <div style={{ paddingTop: 24 }}>
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
          <div style={{ borderTop: "1px solid var(--text-main, #1a1a1a)", marginLeft: 7 }} />
          <div style={{ paddingTop: 24 }}>
            <h2
              className="font-meta uppercase tracking-[0.04em] text-text-main"
              style={{ fontSize: 24, fontWeight: 500, marginBottom: 16 }}
            >
              Collar City Column
            </h2>

            {collarCity[0] && <FeaturesCard article={collarCity[0]} withImage={collarCityImages[0]} />}
            {collarCity[1] && <FeaturesCard article={collarCity[1]} withImage={collarCityImages[1]} />}
            {collarCity[2] && <FeaturesCard article={collarCity[2]} withImage={collarCityImages[2]} />}
          </div>
        </div>
      </div>

      {/* ── More in Features ── */}
      <div className="mt-14">
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
        <AnimatedLine id="features-more" delay={0} duration={300} style={{ marginTop: 24, marginBottom: 8 }} />
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
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="20vw"
                  />
                </div>
              )}
              {article.kicker && (
                <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent block mb-1.5">
                  {article.kicker}
                </span>
              )}
              <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors group-hover:text-accent">
                {article.title}
              </h3>
              {article.author && (
                <div className="mt-2 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
                  <span className="text-text-muted">BY </span><span className="text-accent">{article.author}</span>
                </div>
              )}
            </TransitionLink>
          ))}
        </div>
      </div>
    </div>
  );
}
