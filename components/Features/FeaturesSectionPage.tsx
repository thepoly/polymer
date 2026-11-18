"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { AnimatedLine } from "@/components/Opinion/RainbowDivider";

/* ── Types ── */

export type SpotlightPhoto = {
  url: string;
  caption?: string;
  articleTitle?: string;
  articleUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
};

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
        className={`font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent ${
          large ? "text-[34px] lg:text-[42px] lg:leading-[1.08]" : "text-[20px]"
        }`}
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
        <p
          className={`mt-0.5 font-meta font-medium leading-[1.5] text-text-main line-clamp-4 ${
            large ? "text-[15px] lg:text-[17px]" : "text-[15px]"
          }`}
        >
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/* ── Compact card: image beside the text (stories under the spotlight) ── */

function FeaturesRowCard({ article }: { article: ComponentArticle }) {
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className="group grid items-start gap-4"
      style={{ gridTemplateColumns: article.image ? "minmax(0, 2fr) minmax(0, 3fr)" : "1fr" }}
    >
      {article.image && (
        <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            sizes="200px"
          />
        </div>
      )}
      <div>
        {article.kicker && (
          <span className="font-meta text-[13px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1">
            {article.kicker}
          </span>
        )}
        <h3 className="font-copy font-medium leading-[1.12] text-[20px] text-text-main transition-colors group-hover:text-accent">
          {article.richTitle || article.title}
        </h3>
        <Byline author={article.author} variant="features" className="mt-2 text-[13px]" />
      </div>
    </TransitionLink>
  );
}

/* ── Top-row section label: red rule over a small caps label ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "2px solid var(--accent-color)", paddingTop: 4, marginBottom: 16 }}>
      <h2
        className="font-meta uppercase text-accent dark:text-white"
        style={{ fontSize: 17, letterSpacing: "0.08em", fontWeight: 500, margin: "0 0 2px" }}
      >
        {children}
      </h2>
    </div>
  );
}

/* ── Photo Spotlight Carousel ── */

/** The slug at the end of an article path, for matching spotlight links to stories */
const slugOf = (path: string | undefined): string | null =>
  path ? path.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() || null : null;

function PhotoSpotlightCarousel({ photos, wide = false }: { photos: SpotlightPhoto[]; wide?: boolean }) {
  const [current, setCurrent] = useState(0);

  if (photos.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setCurrent((c) => (c + 1) % photos.length);
  const photo = photos[current];
  const caption = photo.caption?.trim();

  return (
    <figure style={{ margin: 0, padding: 0 }}>
      <div className="-mx-4 w-auto overflow-hidden sm:mx-0 sm:w-full" style={{ borderRadius: 4 }}>
        {/* 16:9 when the spotlight spans two columns, so the photo doesn't
            outgrow the row */}
        <div style={{ aspectRatio: wide ? "16/9" : "3/2", position: "relative" }}>
          <Image
            src={photo.url}
            alt={caption || photo.articleTitle || ""}
            fill
            className="object-cover"
            sizes={wide ? "(max-width: 1024px) 100vw, 960px" : "(max-width: 640px) 100vw, 50vw"}
          />
        </div>
      </div>
      {/* Newspaper caption: what the photo shows, then credit and the story
          it comes from */}
      <figcaption className="mt-2">
        {caption && (
          <p className="font-meta text-[14px] leading-[1.45] text-text-main">{caption}</p>
        )}
        {(photo.photographerName || photo.articleTitle) && (
          <p className="mt-1 font-meta text-[12px] leading-[1.45] text-text-muted">
            {photo.photographerName && (
              <>
                Photo by{" "}
                {photo.photographerUrl ? (
                  <TransitionLink href={photo.photographerUrl} className="text-accent hover:underline">
                    {photo.photographerName}
                  </TransitionLink>
                ) : (
                  photo.photographerName
                )}
              </>
            )}
            {photo.photographerName && photo.articleTitle && (
              <span aria-hidden="true" className="mx-1.5">&middot;</span>
            )}
            {photo.articleTitle && (
              <>
                From{" "}
                {photo.articleUrl ? (
                  <TransitionLink href={photo.articleUrl} className="italic text-text-main hover:text-accent hover:underline">
                    {photo.articleTitle}
                  </TransitionLink>
                ) : (
                  <span className="italic">{photo.articleTitle}</span>
                )}
              </>
            )}
          </p>
        )}
      </figcaption>
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
    </figure>
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
  onCampusImages,
  rightImages,
  pinnedTheArts,
  theArtsImages,
  photoSpotlight,
  pinnedSpotlightSubs,
  pinnedWide = [],
}: {
  title: string;
  articles: ComponentArticle[];
  pinnedOnCampus: ComponentArticle[];
  pinnedFeatured: ComponentArticle[];
  pinnedRight: ComponentArticle[];
  onCampusImages: boolean[];
  rightImages: boolean[];
  pinnedTheArts: ComponentArticle[];
  theArtsImages: boolean[];
  photoSpotlight: SpotlightPhoto[];
  pinnedSpotlightSubs: ComponentArticle[];
  pinnedWide?: ComponentArticle[];
}) {
  // Build set of pinned IDs to exclude from auto-fill
  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of [...pinnedOnCampus, ...pinnedFeatured, ...pinnedRight, ...pinnedTheArts, ...pinnedSpotlightSubs, ...(pinnedWide || [])]) {
      ids.add(String(a.id));
    }
    return ids;
  }, [pinnedOnCampus, pinnedFeatured, pinnedRight, pinnedTheArts, pinnedSpotlightSubs, pinnedWide]);

  // Stories the Photo Spotlight already links to; kept out of auto-fill so a
  // story isn't shown twice (editor-pinned slots are left as chosen)
  const spotlightSlugs = useMemo(
    () => new Set(photoSpotlight.map((p) => slugOf(p.articleUrl)).filter((s): s is string => Boolean(s))),
    [photoSpotlight],
  );

  // Auto-fill pool: articles not already pinned or in the spotlight
  const autoFillPool = useMemo(
    () =>
      articles.filter(
        (a) => !pinnedIds.has(String(a.id)) && !spotlightSlugs.has(slugOf(getArticleUrl(a)) ?? ""),
      ),
    [articles, pinnedIds, spotlightSlugs],
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
  const wideArticle = fillColumn(pinnedWide, 1, poolRef);
  // Headline-only extras so the side columns run about as long as the lead
  // column. Taken after every editor slot, so they never displace a pick.
  const onCampusExtra = fillColumn([], 3, poolRef);
  const rightExtra = fillColumn([], 3, poolRef);

  const sectionColumnStyle = {
    borderRight: "1px solid var(--rule-color)",
    paddingRight: COLUMN_GAP,
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
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-8 md:px-6 xl:px-[30px]">
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
            href="/features/archive"
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Archive
          </TransitionLink>
          <span className="font-meta text-text-muted lg:hidden" aria-hidden="true">
            &middot;
          </span>
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <a
            href="mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip"
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
          <MobileFeaturesList
            articles={[...onCampus, ...onCampusExtra]}
            imageFlags={[...onCampusImages.slice(0, onCampus.length), ...onCampusExtra.map(() => false)]}
            hideDates
          />
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

        {(right.length > 0) && (
          <div className="mt-12">
            <MobileSectionHeader title="Latest" />
            <MobileFeaturesList
              articles={[...right, ...rightExtra]}
              imageFlags={[...rightImages.slice(0, right.length), ...rightExtra.map(() => false)]}
            />
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

        <div className="mt-12">
          <MobileSectionHeader title="More in Features" href="/features/archive" />
          <MobileFeaturesList articles={autoFillPool.slice(poolRef.idx, poolRef.idx + 5)} />
        </div>
      </div>

      {/* Single grid — vertical lines are continuous, horizontal line breaks at intersections */}
      <div
        className="hidden lg:grid"
        style={{
          // The lead column takes the room the old events box used to need
          gridTemplateColumns: "240px minmax(0, 1fr) 300px",
          gap: `0 ${COLUMN_GAP}`,
        }}
      >
        {/* ══ Row 1 ══ */}

        {/* ── Left column: On-Campus ── */}
        <div style={sectionColumnStyle}>
          <SectionLabel>On-Campus</SectionLabel>

          {onCampus[0] && <FeaturesCard article={onCampus[0]} withImage={onCampusImages[0]} priority hideDate />}
          {onCampus[1] && <FeaturesCard article={onCampus[1]} withImage={onCampusImages[1]} hideDate />}
          {onCampus[2] && <FeaturesCard article={onCampus[2]} withImage={onCampusImages[2]} hideDate />}
          {onCampusExtra.map((article) => (
            <FeaturesCard key={article.id} article={article} hideDate />
          ))}
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
                <h3
                  className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
                  style={{ fontSize: 28 }}
                >
                  {wideArticle[0].richTitle || wideArticle[0].title}
                </h3>
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

        {/* ── Right column: Latest ── */}
        <div>
          {right.length > 0 && <SectionLabel>Latest</SectionLabel>}
          {right[0] && <FeaturesCard article={right[0]} withImage={rightImages[0]} />}
          {right[1] && <FeaturesCard article={right[1]} withImage={rightImages[1]} />}
          {right[2] && <FeaturesCard article={right[2]} withImage={rightImages[2]} />}
          {rightExtra.map((article) => (
            <FeaturesCard key={article.id} article={article} />
          ))}
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

        {/* ── Middle + right columns: Photo Spotlight ── */}
        <div style={{ gridColumn: "2 / span 2" }}>
          <div
            style={{
              ...getSectionBreakRuleStyle(SECTION_RULE_INSET, 0),
              marginTop: `calc(${SECTION_RULE_GAP} + ${LOWER_SECTION_EXTRA_TOP_SPACE}px)`,
            }}
          />
          {/* Same heading treatment and spacing as The Arts, so the two line up */}
          <div style={getSectionHeadingWrapStyle(SECTION_RULE_INSET, 0)}>
            <h2
              className="font-meta uppercase tracking-[0.04em] text-text-main text-center"
              style={{ fontSize: 28, fontWeight: 500, marginTop: 0, marginBottom: 16 }}
            >
              Photo Spotlight
            </h2>
          </div>
          <PhotoSpotlightCarousel photos={photoSpotlight} wide />

          {/* Two sub-features, image beside text, so the row stays about as
              tall as The Arts */}
          {(spotlightSubs[0] || spotlightSubs[1]) && (
            <div
              className="mt-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: `0 ${COLUMN_GAP}`,
              }}
            >
              {spotlightSubs[0] && <FeaturesRowCard article={spotlightSubs[0]} />}
              {spotlightSubs[1] && <FeaturesRowCard article={spotlightSubs[1]} />}
            </div>
          )}
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
