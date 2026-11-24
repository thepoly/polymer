"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { AnimatedLine } from "@/components/Opinion/RainbowDivider";
import SectionSearchPrompt from "@/components/SectionSearchPrompt";
import FeaturesCover from "@/components/Features/FeaturesCover";

const FEATURES_CONTACT_MAILTO =
  "mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip";

/* ── Types ── */

export type SpotlightPhoto = {
  url: string;
  caption?: string;
  articleTitle?: string;
  articleUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
};

/*
 * The cover (FeaturesCover: lead and six stories) opens the page. Below it,
 * one layout for every screen size: the DOM is in phone reading order and
 * CSS grid areas place the same sections on tablet and desktop:
 *
 *   phone       tablet (≥768)        desktop (≥1024)
 *   spot        spot     spot        oncampus spot spot
 *   oncampus    oncampus arts        oncampus arts arts
 *   arts
 *
 * Cards change shape per breakpoint with classes, not duplicate markup: on
 * phones most stories are compact rows (headline, small thumbnail); from
 * tablet up they're the stacked cards the editor's image toggles control.
 */

const COLUMN_GAP = "clamp(16px, 2vw, 24px)";

const GRID_CSS = `
.features-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "spot" "oncampus" "arts";
  row-gap: 48px;
}
@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: "spot spot" "oncampus arts";
    column-gap: ${COLUMN_GAP};
    row-gap: 40px;
  }
}
@media (min-width: 1024px) {
  .features-grid {
    /* The cover's columns, so the rules below line up with it */
    grid-template-columns: minmax(0, 24fr) minmax(0, 48fr) minmax(0, 28fr);
    grid-template-areas: "oncampus spot spot" "oncampus arts arts";
    grid-template-rows: auto 1fr;
  }
}
@keyframes dividerWaveTravel {
  from { transform: translateX(-600px); }
  to   { transform: translateX(0px); }
}
@keyframes dividerRainbowHue {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(360deg); }
}
`;

/* ── Labels and dates ── */

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/**
 * The kicker, unless it only repeats the section it sits in, says
 * "Features", or opens the headline already ("Photo" over "Photo: …")
 */
function visibleKicker(article: ComponentArticle, sectionLabel?: string): string | null {
  const kicker = article.kicker?.trim();
  if (!kicker) return null;
  const n = normalize(kicker);
  if (n === "features") return null;
  if (sectionLabel && n === normalize(sectionLabel)) return null;
  if (article.title?.toLowerCase().startsWith(`${kicker.toLowerCase()}:`)) return null;
  return kicker;
}

/** Kickers that put a story in a topic section when it's auto-filled */
const ON_CAMPUS_KICKERS = new Set(["oncampus", "campus", "campuslife"]);
const ARTS_KICKERS = new Set(["thearts", "arts", "art", "music", "theater", "theatre", "film", "dance"]);
const isOnCampus = (a: ComponentArticle) => ON_CAMPUS_KICKERS.has(normalize(a.kicker ?? ""));
const isArts = (a: ComponentArticle) => ARTS_KICKERS.has(normalize(a.kicker ?? ""));

/** "Nov 14", in the paper's time zone so server and browser agree */
const shortDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Non-breaking space: the date never splits across lines ("Oct / 30")
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
    .replace(" ", " ");
};

/** More in Features columns by story count, so a short run never leaves a hole */
const MORE_COLUMNS: Record<number, string> = {
  1: "md:grid-cols-1 lg:grid-cols-1",
  2: "md:grid-cols-2 lg:grid-cols-2",
  3: "md:grid-cols-3 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
  5: "md:grid-cols-3 lg:grid-cols-5",
};

/** The slug at the end of an article path, for matching spotlight links to stories */
const slugOf = (path: string | undefined): string | null =>
  path ? path.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() || null : null;

/* ── Story card ── */

/** Phone (<768px): a big photo on top, a thumbnail beside the headline, or no photo */
type PhoneMedia = "stack" | "thumb" | "none";
/** Tablet and up: photo on top, photo left of the text, photo right of it, or none */
type WideMedia = "stack" | "row" | "row-end" | "none";
type HeadlineSize = "lead" | "m" | "s" | "xs";

const ROOT_PHONE: Record<PhoneMedia, string> = {
  stack: "block",
  thumb: "grid grid-cols-[minmax(0,1fr)_88px] items-start gap-x-3",
  none: "block",
};
const ROOT_WIDE: Record<WideMedia, string> = {
  stack: "md:block",
  row: "md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-x-4",
  "row-end": "md:grid md:grid-cols-2 md:items-start md:gap-x-6",
  none: "md:block",
};
const MEDIA_PHONE: Record<PhoneMedia, string> = {
  stack: "-mx-4 mb-3 sm:mx-0",
  thumb: "order-2 aspect-square w-[88px]",
  none: "hidden",
};
const MEDIA_WIDE: Record<WideMedia, string> = {
  stack: "md:order-none md:mx-0 md:mb-3 md:block md:w-full",
  row: "md:order-1 md:mx-0 md:mb-0 md:block md:w-full md:aspect-[3/2]",
  "row-end": "md:order-2 md:mx-0 md:mb-0 md:block md:w-full md:aspect-[3/2]",
  none: "md:hidden",
};
const BODY_PHONE: Record<PhoneMedia, string> = { stack: "", thumb: "order-1", none: "" };
const BODY_WIDE: Record<WideMedia, string> = {
  stack: "md:order-none",
  row: "md:order-2",
  "row-end": "md:order-1",
  none: "md:order-none",
};

/** The type scale: lead 42/36/32, m 24, s 20, xs 18. Phone rows are always 18. */
const HEADLINE_PHONE: Record<HeadlineSize, string> = {
  lead: "text-[32px] leading-[1.08]",
  m: "text-[22px] leading-[1.12]",
  s: "text-[20px] leading-[1.15]",
  xs: "text-[18px] leading-[1.18]",
};
const HEADLINE_PHONE_ROW = "text-[18px] leading-[1.18]";
const HEADLINE_WIDE: Record<HeadlineSize, string> = {
  lead: "md:text-[36px] lg:text-[42px] md:leading-[1.08]",
  m: "md:text-[24px] md:leading-[1.12]",
  s: "md:text-[20px] md:leading-[1.15]",
  xs: "md:text-[18px] md:leading-[1.18]",
};

function StoryCard({
  article,
  phone = "thumb",
  wide = "stack",
  size = "s",
  sectionLabel,
  showDek = false,
  date = null,
  priority = false,
  large = false,
  wideSizes = "33vw",
  className = "",
}: {
  article: ComponentArticle;
  phone?: PhoneMedia;
  wide?: WideMedia;
  size?: HeadlineSize;
  /** The section the card sits in; a kicker that repeats it is hidden */
  sectionLabel?: string;
  showDek?: boolean;
  date?: string | null;
  priority?: boolean;
  /** 16:9 photo instead of 3:2 (the lead) */
  large?: boolean;
  /** `sizes` for tablet and up */
  wideSizes?: string;
  className?: string;
}) {
  const hasImage = Boolean(article.image);
  const phoneMedia: PhoneMedia = hasImage ? phone : "none";
  const wideMedia: WideMedia = hasImage ? wide : "none";
  const showMedia = phoneMedia !== "none" || wideMedia !== "none";
  const kicker = visibleKicker(article, sectionLabel);
  const phoneSize = phoneMedia === "stack" ? "100vw" : "88px";
  const tabletSize = wideMedia === "none" ? "88px" : wideSizes;
  const stackAspect = large ? "aspect-video" : "aspect-[3/2]";
  const wideStackAspect = large ? "md:aspect-video" : "md:aspect-[3/2]";

  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className={`group ${ROOT_PHONE[phoneMedia]} ${ROOT_WIDE[wideMedia]} ${className}`}
    >
      {showMedia && (
        <div
          className={`relative overflow-hidden ${phoneMedia === "stack" ? stackAspect : ""} ${
            MEDIA_PHONE[phoneMedia]
          } ${MEDIA_WIDE[wideMedia]} ${wideMedia === "stack" ? wideStackAspect : ""}`}
        >
          <Image
            src={article.image!}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
            sizes={`(max-width: 767px) ${phoneSize}, ${tabletSize}`}
            priority={priority}
          />
        </div>
      )}
      <div className={`min-w-0 ${BODY_PHONE[phoneMedia]} ${BODY_WIDE[wideMedia]}`}>
        {kicker && (
          <span className="mb-1 block font-meta text-[13px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76]">
            {kicker}
          </span>
        )}
        <h3
          className={`font-copy font-medium text-text-main transition-colors group-hover:text-accent ${
            phoneMedia === "thumb" ? HEADLINE_PHONE_ROW : HEADLINE_PHONE[size]
          } ${HEADLINE_WIDE[size]}`}
        >
          {article.richTitle || article.title}
        </h3>
        <Byline authors={article.authorLinks} date={date} size={size === "lead" ? "lg" : size === "m" ? "md" : "sm"} margin="mt-1.5" />
        {showDek && article.excerpt && (
          <p
            className={`mt-1.5 font-meta leading-[1.5] line-clamp-3 ${
              size === "lead"
                ? "text-[16px] text-text-main lg:text-[17px]"
                : "text-[15px] text-text-muted"
            } ${phoneMedia === "thumb" ? "hidden md:block" : ""}`}
          >
            {article.excerpt}
          </p>
        )}
      </div>
    </TransitionLink>
  );
}

/**
 * A run of stories: hairline-divided rows on phones, spaced cards from
 * tablet up. Pass grid classes to lay the cards out side by side.
 */
function StoryList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col divide-y divide-rule md:divide-y-0 [&>*]:py-4 [&>*:first-child]:pt-0 md:[&>*]:py-0 md:[&>*]:mb-6 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Section label: red rule over a small-caps heading ── */

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border-t-2 border-accent pt-1">
      <h2
        id={id}
        className="m-0 font-meta text-[17px] font-medium uppercase tracking-[0.08em] text-accent dark:text-white"
      >
        {children}
      </h2>
    </div>
  );
}

/* ── Photo Spotlight: a swipeable rail with buttons ── */

function PhotoSpotlight({ photos }: { photos: SpotlightPhoto[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  // Follow whichever slide is mostly in view (swipes, trackpads, buttons)
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || photos.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: rail, threshold: 0.6 },
    );
    rail.querySelectorAll<HTMLElement>("[data-index]").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [photos.length]);

  const goTo = useCallback(
    (index: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const i = (index + photos.length) % photos.length;
      const slides = rail.querySelectorAll<HTMLElement>("[data-index]");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rail.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: reduce ? "auto" : "smooth" });
      setCurrent(i);
    },
    [photos.length],
  );

  if (photos.length === 0) return null;

  return (
    <div>
      <div
        ref={railRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 md:gap-0 [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="Photo Spotlight"
      >
        {photos.map((photo, i) => {
          const caption = photo.caption?.trim();
          return (
            <figure
              key={`${photo.url}-${i}`}
              data-index={i}
              className="m-0 w-[88%] shrink-0 snap-start md:w-full"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${photos.length}`}
            >
              {/* 3:2 on phones; 16:9 from tablet up, where it spans two columns */}
              <div className="relative aspect-[3/2] overflow-hidden rounded-[4px] bg-black/5 md:aspect-video dark:bg-white/5">
                <Image
                  src={photo.url}
                  alt={caption || photo.articleTitle || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 767px) 88vw, (max-width: 1023px) 100vw, 960px"
                />
              </div>
              {/* Newspaper caption: what the photo shows, then credit and its story */}
              <figcaption className="mt-2 pr-2">
                {caption && <p className="font-meta text-[14px] leading-[1.45] text-text-main">{caption}</p>}
                {(photo.photographerName || photo.articleTitle) && (
                  <p className="mt-1 font-meta text-[12px] leading-[1.45] text-text-muted">
                    {photo.photographerName && (
                      <>
                        Photo by{" "}
                        {photo.photographerUrl ? (
                          <TransitionLink href={photo.photographerUrl} className="-my-[5px] inline-block py-[5px] font-semibold text-text-main underline-offset-[3px] hover:underline">
                            {photo.photographerName}
                          </TransitionLink>
                        ) : (
                          photo.photographerName
                        )}
                      </>
                    )}
                    {photo.photographerName && photo.articleTitle && (
                      <span aria-hidden="true" className="mx-1.5">
                        &middot;
                      </span>
                    )}
                    {photo.articleTitle && (
                      <>
                        From{" "}
                        {photo.articleUrl ? (
                          <TransitionLink
                            href={photo.articleUrl}
                            className="-my-[5px] inline-block py-[5px] italic text-text-main hover:text-accent hover:underline"
                          >
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
            </figure>
          );
        })}
      </div>

      {photos.length > 1 && (
        // Each control is a 44px target around a small visible mark
        <div className="mt-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            className="flex h-11 w-11 items-center justify-center text-[24px] leading-none text-text-muted transition-colors hover:text-text-main"
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="group/dot flex h-11 w-7 items-center justify-center"
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === current ? "true" : undefined}
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full transition-colors ${
                  i === current ? "bg-accent" : "bg-black/20 group-hover/dot:bg-black/40 dark:bg-white/30"
                }`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            className="flex h-11 w-11 items-center justify-center text-[24px] leading-none text-text-muted transition-colors hover:text-text-main"
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
  onCampusImages,
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

  // Fill each slot run: pinned first, then the newest unused pool stories.
  // Topic sections (On Campus, The Arts) only auto-fill stories whose kicker
  // matches, so a section label never sits over an unrelated story; they show
  // fewer stories rather than mislabelled ones.
  const used = new Set<string>();
  const fill = (
    pinned: ComponentArticle[],
    slotCount: number,
    matches: (a: ComponentArticle) => boolean = () => true,
  ): ComponentArticle[] => {
    const result: ComponentArticle[] = [...pinned];
    for (const a of autoFillPool) {
      if (result.length >= slotCount) break;
      if (used.has(String(a.id)) || !matches(a)) continue;
      used.add(String(a.id));
      result.push(a);
    }
    return result;
  };

  // Topic sections first, so their stories aren't used up elsewhere; the lead
  // and Latest then get the newest of the rest. A topic section with no
  // matching story at all falls back to general stories under an honest label
  // rather than leaving a hole in the grid.
  let onCampus = fill(pinnedOnCampus, 3, isOnCampus);
  const onCampusLabel = onCampus.length > 0 ? "On Campus" : "More Stories";
  let theArts = fill(pinnedTheArts, 3, isArts);
  const artsLabel = theArts.length > 0 ? "The Arts" : "More Stories";
  // The cover: the lead and the two stories under it (the editor's Featured
  // slots), three on the right (its right-hand slots, then the newest) and
  // the two newest stories on the left, above the "featured" request box
  const featured = fill(pinnedFeatured, 3);
  const right = fill(pinnedRight, 3);
  const coverLeft = fill([], 2);
  if (onCampus.length === 0) onCampus = fill([], 3);
  if (theArts.length === 0) theArts = fill([], 3);
  const spotlightSubs = fill(pinnedSpotlightSubs, 2);
  const wideArticle = fill(pinnedWide, 1);
  // Headline-only extras so the desktop left column runs about as long as the
  // spotlight and The Arts beside it. Taken after every editor slot, so they
  // never displace a pick.
  const onCampusExtra = fill([], 3, onCampusLabel === "On Campus" ? isOnCampus : undefined);
  // When On Campus runs short of its six, the left column carries on with a
  // separately labelled run of general stories instead of a blank stretch
  const leftMore = fill([], Math.max(0, 6 - onCampus.length - onCampusExtra.length));
  const moreInFeatures = fill([], 5);

  const lead = featured[0];
  const coverUnder = featured.slice(1, 3);
  const wide = wideArticle[0];

  /** A column of an editor's three slots plus extras (On Campus, The Arts) */
  const columnCards = (
    items: ComponentArticle[],
    imageFlags: boolean[],
    label: string,
    wideSizes: string,
    options: { dates?: boolean; extras?: ComponentArticle[] } = {},
  ) => [
    ...items.map((article, i) => {
      const flagged = Boolean(imageFlags[i]);
      return (
        <StoryCard
          key={article.id}
          article={article}
          // Phones: only the section's first story gets the big photo
          phone={i === 0 && flagged ? "stack" : "thumb"}
          wide={flagged ? "stack" : "none"}
          sectionLabel={label}
          showDek={i === 0}
          date={options.dates ? shortDate(article.isoDate) : null}
          wideSizes={wideSizes}
        />
      );
    }),
    ...(options.extras ?? []).map((article) => (
      <StoryCard
        key={article.id}
        article={article}
        wide="none"
        size="xs"
        sectionLabel={label}
        date={options.dates ? shortDate(article.isoDate) : null}
      />
    )),
  ];

  // A column rule and gutter from tablet up, where On Campus has a neighbour
  // to its right (a literal class string so Tailwind can see it)
  const RULE_FROM_MD = "md:border-r md:border-rule md:pr-[clamp(16px,2vw,24px)]";

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-8 md:px-6 xl:px-[30px]">
      <style>{GRID_CSS}</style>

      {/* Title, as on News. On desktop the masthead already marks Features
          (red, with a bar on the rule), so the title is for screen readers
          only and the page starts right under the header. The mobile header
          has no section links, so the title shows there, small. Archive and
          Contact are at the foot of the page (SectionSearchPrompt). */}
      <h1
        className="mt-2 mb-6 text-center font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[32px] sm:text-[40px] lg:sr-only"
        style={{ fontWeight: 400, lineHeight: 1 }}
      >
        {title}
      </h1>

      <FeaturesCover lead={lead} under={coverUnder} left={coverLeft} right={right} requestHref={FEATURES_CONTACT_MAILTO} />

      <div className="features-grid mt-8">
        {/* ── Photo Spotlight and its two stories ── */}
        {(photoSpotlight.length > 0 || spotlightSubs.length > 0) && (
          <section aria-labelledby="features-spotlight" style={{ gridArea: "spot" }}>
            <SectionLabel id="features-spotlight">
              {photoSpotlight.length > 0 ? "Photo Spotlight" : "Spotlight"}
            </SectionLabel>
            <PhotoSpotlight photos={photoSpotlight} />
            {(spotlightSubs.length > 0 || wide) && (
              <StoryList className="mt-4 md:grid md:grid-cols-2 md:gap-x-6">
                {spotlightSubs.map((article) => (
                  <StoryCard key={article.id} article={article} wide="row" wideSizes="200px" />
                ))}
                {wide && (
                  <StoryCard
                    article={wide}
                    wide="row-end"
                    size="m"
                    showDek
                    className="md:col-span-2"
                    wideSizes="(max-width: 1023px) 50vw, 400px"
                  />
                )}
              </StoryList>
            )}
          </section>
        )}

        {/* ── On Campus ── */}
        {(onCampus.length > 0 || onCampusExtra.length > 0) && (
          <section
            aria-labelledby="features-on-campus"
            style={{ gridArea: "oncampus" }}
            className={RULE_FROM_MD}
          >
            <SectionLabel id="features-on-campus">{onCampusLabel}</SectionLabel>
            <StoryList>
              {columnCards(onCampus, onCampusImages, onCampusLabel, "(max-width: 1023px) 50vw, 240px", {
                extras: onCampusExtra,
              })}
            </StoryList>
            {leftMore.length > 0 && (
              <div className="mt-8 md:mt-2">
                <SectionLabel id="features-more-stories">More Stories</SectionLabel>
                <StoryList>
                  {leftMore.map((article) => (
                    <StoryCard key={article.id} article={article} wide="none" size="xs" />
                  ))}
                </StoryList>
              </div>
            )}
          </section>
        )}

        {/* ── The Arts ── */}
        {theArts.length > 0 && (
          <section aria-labelledby="features-arts" style={{ gridArea: "arts" }}>
            <SectionLabel id="features-arts">{artsLabel}</SectionLabel>
            {/* Three across on desktop, where the section spans two columns */}
            <StoryList className="lg:grid lg:grid-cols-3 lg:gap-x-6">
              {columnCards(theArts, theArtsImages, artsLabel, "(max-width: 1023px) 50vw, 300px")}
            </StoryList>
          </section>
        )}
      </div>

      {/* ── More in Features ── */}
      {moreInFeatures.length > 0 && (
        <section aria-labelledby="features-more" className="mt-12 lg:mt-14">
          <AnimatedLine id="features-more" delay={0} duration={300} style={{ marginTop: 24, marginBottom: 8 }} />
          <div className="mb-4 flex items-baseline justify-between">
            <h2
              id="features-more"
              className="font-meta text-[22px] font-medium uppercase tracking-[0.04em] text-text-main md:text-[28px]"
            >
              More in Features
            </h2>
            <TransitionLink
              href="/features/archive"
              className="inline-flex min-h-11 items-center font-meta text-[14px] uppercase tracking-[0.08em] text-accent transition-colors hover:underline"
            >
              More &rarr;
            </TransitionLink>
          </div>
          <StoryList className={`md:grid md:gap-x-6 ${MORE_COLUMNS[moreInFeatures.length]}`}>
            {moreInFeatures.map((article) => (
              <StoryCard key={article.id} article={article} wideSizes="(max-width: 1023px) 33vw, 240px" />
            ))}
          </StoryList>
        </section>
      )}

      {/* Search, archive and contact, where News has them */}
      <SectionSearchPrompt
        section="features"
        name="Features"
        archiveHref="/features/archive"
        contactHref={FEATURES_CONTACT_MAILTO}
      />
    </div>
  );
}
