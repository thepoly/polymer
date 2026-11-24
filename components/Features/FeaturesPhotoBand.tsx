"use client";

import { useEffect, useRef, useState } from "react";
import TransitionLink from "@/components/TransitionLink";
import PhotoWindow, { type PhotoSource } from "@/components/PhotoWindow";

/** What the page needs for the band; built from the Features layout's photoBand (lib/featuresPhotoBand.ts). */
export type FeaturesPhotoBandData = {
  photo: PhotoSource;
  alt: string;
  /** CSS object-position: where the photo is aimed ("50% 40%") */
  focus: string;
  photographer: { name: string; href: string | null } | null;
  story: { title: string; href: string } | null;
};

/*
 * The Features photo band: one wide window onto a photo pinned to the screen,
 * between the cover and the sections below it. The page scrolls past the
 * photo, which stays still (see PhotoWindow).
 *
 * The photo covers the whole screen, so it's a large download. Pinned images
 * count as on screen wherever the window is, so the browser would fetch it
 * with the page; instead it loads once the band is within about a screen of
 * view.
 *
 * The band isn't a link. The credit is: the photographer's profile and the
 * story the photo comes from.
 */
export default function FeaturesPhotoBand({
  band,
  thin = false,
  className = "mt-8",
}: {
  band: FeaturesPhotoBandData;
  /** A slim second window onto the same photo, lower on the page; credit only from tablet up */
  thin?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  const { photographer, story } = band;

  return (
    // Full bleed within the page: out to the edges of the page's side padding
    <figure ref={ref} data-features-photo-band className={`relative -mx-4 md:-mx-6 xl:-mx-[30px] ${className}`}>
      <PhotoWindow
        src={band.photo}
        alt={band.alt}
        focus={band.focus}
        loadImage={near}
        className={thin ? "h-[clamp(88px,14vh,150px)]" : "h-[clamp(220px,42vh,460px)]"}
      >
        {/* Keeps the credit legible over a bright photo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/55 to-transparent"
        />
      </PhotoWindow>
      {(photographer || story) && (
          <figcaption className={`absolute ${thin ? "hidden md:block " : ""}bottom-2.5 left-3 right-3 z-10 text-right font-meta text-[12px] leading-snug tracking-[0.02em] text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.6)] md:bottom-3 md:left-5 md:right-5 md:text-[13px]`}>
            {photographer && (
              <>
                Photo by{" "}
                {photographer.href ? (
                  <TransitionLink href={photographer.href} className="font-semibold underline-offset-[3px] hover:underline">
                    {photographer.name}
                  </TransitionLink>
                ) : (
                  <span className="font-semibold">{photographer.name}</span>
                )}
              </>
            )}
            {photographer && story && <span aria-hidden="true"> · </span>}
            {story && (
              <TransitionLink href={story.href} className="underline-offset-[3px] hover:underline">
                {story.title}
                <span aria-hidden="true">&nbsp;›</span>
              </TransitionLink>
            )}
          </figcaption>
      )}
    </figure>
  );
}
