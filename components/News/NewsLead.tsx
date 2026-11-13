import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import type { LeadTextPosition } from "./newsLayout";

/** "Name/The Polytechnic" for staff photographers; write-in credits as typed */
function photoCredit(article: ComponentArticle): string | null {
  if (!article.imagePhotographer) return null;
  return article.imagePhotographerId != null
    ? `${article.imagePhotographer}/The Polytechnic`
    : article.imagePhotographer;
}

/**
 * Lead story at the top left of /news, two thirds of the page wide.
 *
 * `position` puts the text (kicker, headline, byline, subdeck) north, south,
 * east or west of the photo on tablet and desktop. Phones always stack the
 * text under the photo, since a side-by-side layout doesn't fit.
 */
export default function NewsLead({
  article,
  position,
}: {
  article: ComponentArticle;
  position: LeadTextPosition;
}) {
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
          // tablets, where the lead runs full width, get a full-size headline
          fontSize: "clamp(30px, 5.4cqw, 46px)",
          lineHeight: 1.06,
        }}
      >
        {article.richTitle || article.title}
      </h2>
      <Byline
        author={article.author}
        date={article.date}
        variant="features"
        className="mt-3 text-[13px]"
      />
      {article.excerpt && (
        <p
          className="mt-3 font-meta font-medium leading-[1.5] text-text-main"
          style={{ fontSize: sideBySide ? 18 : 17 }}
        >
          {article.excerpt}
        </p>
      )}
    </div>
  );

  const photo = article.image ? (
    <figure
      className={sideBySide ? "@container m-0 flex flex-col md:h-full" : "m-0"}
    >
      <div
        className={
          sideBySide
            ? // Side by side, the photo stretches to the height of the text so
              // neither column leaves a gap. It never gets shorter than a 3:2
              // landscape frame or taller than 4:5 portrait (cqw = 1% of the
              // photo column's width). Phones keep a plain 3:2 frame.
              "relative -mx-4 aspect-[3/2] overflow-hidden sm:mx-0 md:aspect-auto md:min-h-[66.667cqw] md:max-h-[125cqw] md:flex-1"
            : "relative -mx-4 aspect-[3/2] overflow-hidden sm:mx-0"
        }
      >
        <Image
          src={article.imageFull || article.image}
          alt={article.imageTitle || ""}
          fill
          priority
          className="object-cover"
          style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
          sizes={
            sideBySide
              ? "(max-width: 768px) 100vw, (max-width: 1280px) 36vw, 460px"
              : "(max-width: 1024px) 100vw, 840px"
          }
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
      <article className={`@container ${layoutClass}`}>
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
