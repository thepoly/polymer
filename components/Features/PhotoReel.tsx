'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TransitionLink from '@/components/TransitionLink';

/*
 * The Photo Short Stories film reel on /features (FeaturesFront). A rail of
 * one story's gallery photos, all the same height, that scrolls sideways:
 * swipe on phones (with arrow buttons on wide ones, 640px and up) and on
 * tablets; a trackpad, Shift+wheel or (once the rail has focus) the arrow
 * keys on desktop. There's no photo counter. `card` is the story's title card, first in the rail.
 * Each photo carries its photographer's credit and links to the story.
 */

export type ReelFrame = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** "Name/The Polytechnic", or null when the photo has no photographer */
  credit: string | null;
};

/** Frame heights: phones, then md and up. Widths follow each photo's shape. */
const FRAME_H = { phone: 300, wide: 440 } as const;

/** The rail starts where the page's content starts, and runs off the right edge */
const RAIL =
  'scrollbar-hide relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scroll-pl-4 md:gap-4 md:px-6 md:scroll-pl-6 xl:px-[max(30px,calc((100vw_-_1280px)/2_+_30px))] xl:scroll-pl-[max(30px,calc((100vw_-_1280px)/2_+_30px))] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4';

const button =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-rule-strong text-text-main transition-colors hover:border-text-main hover:bg-text-main hover:text-bg-main disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

export default function PhotoReel({
  card,
  frames,
  href,
  title,
}: {
  card: ReactNode;
  frames: ReelFrame[];
  href: string;
  title: string;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  // Announced only after an arrow button moves the rail, never on a swipe
  const [announcement, setAnnouncement] = useState('');
  const announceNext = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    // The current photo is the frame nearest the rail's left third (announced after an arrow press)
    const update = () => {
      const marker = el.scrollLeft + el.clientWidth * 0.35;
      let current = 0;
      el.querySelectorAll<HTMLElement>('[data-frame]').forEach((item, n) => {
        if (item.offsetLeft <= marker) current = n;
      });
      setAtStart(el.scrollLeft < 8);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
      if (announceNext.current) {
        if (settle.current) clearTimeout(settle.current);
        settle.current = setTimeout(() => {
          announceNext.current = false;
          setAnnouncement(`Photo ${current + 1} of ${frames.length}`);
        }, 200);
      }
    };
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (settle.current) clearTimeout(settle.current);
    };
  }, [frames.length]);

  const move = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    announceNext.current = true;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: smooth ? 'smooth' : 'auto' });
  };

  return (
    <div>
      {/* Focusable so keyboard users can scroll it with the arrow keys */}
      <ul ref={rail} className={RAIL} aria-label={`Photos from ${title}`} tabIndex={0}>
        <li className="flex h-[300px] w-[70vw] max-w-[320px] shrink-0 snap-start md:h-[440px] md:max-w-[340px]">{card}</li>
        {frames.map((f, i) => (
          <li key={`${f.src}-${i}`} data-frame className="shrink-0 snap-start">
            {/* Out of the tab order (the card's headline is the link), but read in browse mode */}
            <TransitionLink href={href} tabIndex={-1} className="group block">
              <div className="relative h-[300px] overflow-hidden bg-rule md:h-[440px]" style={{ aspectRatio: `${f.width} / ${f.height}` }}>
                <Image
                  src={f.src}
                  alt={f.alt || `${title}, photo ${i + 1}`}
                  fill
                  sizes={`(max-width: 767px) ${Math.round((FRAME_H.phone * f.width) / f.height)}px, ${Math.round((FRAME_H.wide * f.width) / f.height)}px`}
                  className="object-cover transition-[filter] duration-300 group-hover:brightness-110"
                />
              </div>
            </TransitionLink>
            {/* A fixed line, so frames with and without a credit line up; as wide as the photo */}
            <p className="mt-2 h-5 w-0 min-w-full truncate font-meta text-[12px] text-text-muted">{f.credit}</p>
          </li>
        ))}
        <li aria-hidden="true" className="w-px shrink-0" />
      </ul>

      {/* The arrows, for wide phones (640–767px) only; smaller phones and tablets swipe, and desktop scrolls the rail by trackpad, Shift+wheel or the arrow keys */}
      <div className="mx-auto mt-3 hidden max-w-[1280px] items-center justify-end px-4 sm:flex md:hidden">
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <div className="flex gap-2">
          <button type="button" className={button} onClick={() => move(-1)} disabled={atStart} aria-label="Earlier photos">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" className={button} onClick={() => move(1)} disabled={atEnd} aria-label="Later photos">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
