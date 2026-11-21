import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { newsBylineDate, type LeadTextPosition } from "./newsLayout";
import type { FrameStyle } from "./timelinePage";

/** How the lead photo is framed on computers and tablets (≥768px) and on phones */
export type LeadFrames = { desktop: FrameStyle; mobile: FrameStyle };

/** CSS variables the lead photo reads its framing from */
const frameVars = (frames: LeadFrames) =>
  ({
    "--pos-d": frames.desktop.position,
    "--zoom-d": frames.desktop.zoom,
    "--pos-m": frames.mobile.position,
    "--zoom-m": frames.mobile.zoom,
  }) as React.CSSProperties;

// Phones use the -m framing, wider screens the -d one; zoom scales toward the kept point
const FRAME_CLASS =
  "object-cover [object-position:var(--pos-m)] [transform-origin:var(--pos-m)] [transform:scale(var(--zoom-m))] md:[object-position:var(--pos-d)] md:[transform-origin:var(--pos-d)] md:[transform:scale(var(--zoom-d))]";

/**
 * Height limits for the photo while BalanceColumns squares off the page
 * (width ÷ height, widest then tallest): stacked and overlay photos run from
 * 16:9 to 5:4, a photo beside the text from 16:9 to square (it still follows
 * longer text up to 4:5, but balancing alone stops at square so the text
 * beside it isn't left with a blank under it).
 */
const FLEX_STACKED = "1.7778,1.25";

/** Lead headline's base size, by the lead's own width (cqw) */
const HEADLINE = "clamp(30px, 5.4cqw, 46px)";
/** Half of the column's --balance-scale, as a multiplier: the lead's text grows at half the strips' rate */
const HALF_SCALE = "(1 + (var(--balance-scale, 1) - 1) * 0.5)";
/**
 * Largest the lead's headline gets above or below the photo, however much
 * BalanceColumns scales the column (a little over the 46px base size)
 */
const STACKED_HEADLINE_MAX = 48;
const FLEX_BESIDE = "1.7778,1";

/**
 * A photo above or under the text, or behind it, is also kept short enough
 * that the whole lead story is on the first screen on a laptop-height
 * window, down to 2:1 if it has to be (BalanceColumns' fold). A photo beside
 * the text follows the text's height instead, so it isn't held.
 */
const FOLD_WIDEST = "2";

/**
 * A zoomed photo is drawn larger than its box, so it needs a sharper copy:
 * scales the widths in a `sizes` list, leaving the "(max-width: …)" parts
 */
const zoomedSizes = (sizes: string, frames: LeadFrames) => {
  const zoom = Math.max(frames.desktop.zoom, frames.mobile.zoom);
  if (zoom <= 1) return sizes;
  return sizes.replace(/(?<!: )\b(\d+)(vw|px)/g, (_, n, unit) => `${Math.round(Number(n) * zoom)}${unit}`);
};

/** "Name/The Polytechnic" for staff photographers; write-in credits as typed */
function photoCredit(article: ComponentArticle): string | null {
  if (!article.imagePhotographer) return null;
  return article.imagePhotographerId != null
    ? `${article.imagePhotographer}/The Polytechnic`
    : article.imagePhotographer;
}

/**
 * "Overlay": the text sits on the bottom of the photo, white over a dark
 * gradient, on tablet and desktop. Phones put it under the photo in the
 * usual colours, since a headline over a small photo would cover it.
 */
function OverlayLead({ article, image, frames }: { article: ComponentArticle; image: string; frames: LeadFrames }) {
  const credit = photoCredit(article);
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      <article data-balance-fold-end className="@container">
        <div className="relative">
          {/* 3:2, until BalanceColumns sets another height on desktop (cqw = 1% of the lead's width) */}
          <div
            data-balance-flex={FLEX_STACKED}
            data-balance-fold={FOLD_WIDEST}
            suppressHydrationWarning
            className="relative -mx-4 aspect-[3/2] overflow-hidden sm:mx-0 lg:aspect-auto lg:h-[var(--balance-h,66.667cqw)]"
          >
            <Image
              src={article.imageFull || image}
              alt={article.imageTitle || ""}
              fill
              priority
              className={FRAME_CLASS}
              style={frameVars(frames)}
              sizes={zoomedSizes("(max-width: 1024px) 100vw, 840px", frames)}
            />
            {/* Dark from the bottom up to just past the text, clear above */}
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.62)_32%,rgba(0,0,0,0.18)_58%,rgba(0,0,0,0)_72%)] md:block"
            />
            {/* Hover: the whole photo darkens a little */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-[0.18]"
            />
          </div>
          <div className="mt-4 md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:px-8 md:pb-7 md:text-white">
            {article.kicker && (
              <span className="mb-2 block font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] md:text-white md:dark:text-white">
                {article.kicker}
              </span>
            )}
            <h2
              className="max-w-[24ch] font-copy font-medium text-text-main transition-colors group-hover:text-accent md:text-white md:group-hover:text-white"
              style={{ fontSize: "clamp(30px, 5cqw, 44px)", lineHeight: 1.06 }}
            >
              {article.richTitle || article.title}
            </h2>
            <Byline
              author={article.author}
              date={newsBylineDate(article)}
              variant="features"
              className="mt-3 text-[13px] md:[&_span]:text-white"
            />
          </div>
        </div>
        {credit && <p className="mt-1.5 font-meta text-[12px] italic text-text-muted">{credit}</p>}
      </article>
    </TransitionLink>
  );
}

/**
 * Lead story at the top left of /news, two thirds of the page wide.
 *
 * `position` puts the text (kicker, headline, byline) north, south,
 * east or west of the photo, or over it, on tablet and desktop. Phones always
 * stack the text under the photo, since a side-by-side layout doesn't fit.
 *
 * `frames` is how the photo is cropped (the point kept in view and the zoom),
 * set in the News Layout editor or taken from the photo's focal point. It
 * matters because the photo's shape isn't fixed: on desktop BalanceColumns
 * may make it shorter or taller to square the page off.
 */
export default function NewsLead({
  article,
  position: chosen,
  frames,
}: {
  article: ComponentArticle;
  position: LeadTextPosition;
  frames: LeadFrames;
}) {
  // Overlay needs a photo to sit on; without one the text goes under it
  if (chosen === "overlay" && article.image) {
    return <OverlayLead article={article} image={article.image} frames={frames} />;
  }
  const position = chosen === "overlay" ? "south" : chosen;
  const sideBySide = position === "east" || position === "west";
  const credit = photoCredit(article);

  const text = (
    <div className={sideBySide ? "md:pt-1" : undefined}>
      {article.kicker && (
        <span className="mb-2 block font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76]">
          {article.kicker}
        </span>
      )}
      <h2
        className="font-copy font-medium text-text-main transition-colors group-hover:text-accent"
        style={{
          // Scales with the lead's own width (cqw), not the window's, so
          // tablets, where the lead runs full width, get a full-size headline.
          // BalanceColumns may set it larger (--balance-scale, at half rate)
          // when the lead's column has to run deeper. Above or below the
          // photo, that's capped: the headline runs the column's full width,
          // so a few points more read as shouting. The photo and an extra
          // strip close the rest.
          fontSize: sideBySide
            ? `calc(${HEADLINE} * ${HALF_SCALE})`
            : `min(${STACKED_HEADLINE_MAX}px, calc(${HEADLINE} * ${HALF_SCALE}))`,
          lineHeight: 1.06,
        }}
      >
        {article.richTitle || article.title}
      </h2>
      <Byline
        author={article.author}
        date={newsBylineDate(article)}
        variant="features"
        className="mt-3 text-[13px]"
      />
    </div>
  );

  const photo = article.image ? (
    <figure
      className={sideBySide ? "@container m-0 flex flex-col md:h-full" : "m-0"}
    >
      <div
        data-balance-flex={sideBySide ? FLEX_BESIDE : FLEX_STACKED}
        data-balance-fold={sideBySide ? undefined : FOLD_WIDEST}
        suppressHydrationWarning
        className={
          sideBySide
            ? // Side by side, the photo stretches to the height of the text so
              // neither column leaves a gap. It never gets shorter than a 3:2
              // landscape frame (or the height BalanceColumns asks for) or
              // taller than 4:5 portrait (cqw = 1% of the photo column's
              // width). Phones keep a plain 3:2 frame.
              "relative -mx-4 aspect-[3/2] overflow-hidden sm:mx-0 md:aspect-auto md:min-h-[var(--balance-h,66.667cqw)] md:max-h-[125cqw] md:flex-1"
            : // Stacked: 3:2, until BalanceColumns sets another height on desktop
              "relative -mx-4 aspect-[3/2] overflow-hidden sm:mx-0 lg:aspect-auto lg:h-[var(--balance-h,66.667cqw)]"
        }
      >
        <Image
          src={article.imageFull || article.image}
          alt={article.imageTitle || ""}
          fill
          priority
          className={FRAME_CLASS}
          style={frameVars(frames)}
          sizes={zoomedSizes(
            sideBySide
              ? "(max-width: 768px) 100vw, (max-width: 1280px) 36vw, 460px"
              : "(max-width: 1024px) 100vw, 840px",
            frames,
          )}
        />
      </div>
      {credit && (
        <figcaption className="mt-1.5 font-meta text-[12px] italic text-text-muted">{credit}</figcaption>
      )}
    </figure>
  ) : null;

  // Phones: photo, then text. Wider screens: the editor's chosen side.
  const layoutClass = {
    north: "flex flex-col gap-4 md:flex-col-reverse md:gap-5",
    south: "flex flex-col gap-4 md:gap-5",
    east: "flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-7",
    west: "flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-7",
  }[position];

  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      <article data-balance-fold-end className={`@container ${layoutClass}`}>
        {/* West: text comes first in the DOM, matching the desktop layout,
            and is moved under the photo on phones */}
        {position === "west" ? (
          <>
            <div className="order-2 md:order-none">{text}</div>
            {photo && <div className="order-1 md:order-none">{photo}</div>}
          </>
        ) : (
          <>
            {photo}
            {text}
          </>
        )}
      </article>
    </TransitionLink>
  );
}
