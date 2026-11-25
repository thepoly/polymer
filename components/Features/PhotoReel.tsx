'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TransitionLink from '@/components/TransitionLink';

/*
 * The Photo Short Stories film reel on /features (FeaturesFront). A rail of
 * one story's gallery photos, all the same height, that scrolls sideways: swipe on
 * phones, arrow buttons (or trackpad) on desktop. `card` is the story's title
 * card, first in the rail.
 */

export type ReelFrame = { src: string; width: number; height: number; alt: string };

/** The rail starts where the page's content starts, and runs off the right edge */
const RAIL =
  'scrollbar-hide relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scroll-pl-4 md:gap-4 md:px-6 md:scroll-pl-6 xl:px-[max(30px,calc((100vw_-_1280px)/2_+_30px))] xl:scroll-pl-[max(30px,calc((100vw_-_1280px)/2_+_30px))]';

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
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    // The photo counter follows the frame nearest the rail's left third
    const update = () => {
      const marker = el.scrollLeft + el.clientWidth * 0.35;
      let current = 0;
      el.querySelectorAll<HTMLElement>('[data-frame]').forEach((item, n) => {
        if (item.offsetLeft <= marker) current = n;
      });
      setIndex(current);
      setAtStart(el.scrollLeft < 8);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: smooth ? 'smooth' : 'auto' });
  };

  return (
    <div>
      <ul ref={rail} className={RAIL} aria-label={`Photos from ${title}`}>
        <li className="flex h-[300px] w-[70vw] max-w-[320px] shrink-0 snap-start md:h-[440px] md:max-w-[340px]">{card}</li>
        {frames.map((f, i) => {
          return (
            <li key={`${f.src}-${i}`} data-frame className="shrink-0 snap-start">
              <TransitionLink href={href} tabIndex={-1} aria-hidden="true" className="group block">
                <div className="relative h-[300px] overflow-hidden bg-rule md:h-[440px]" style={{ aspectRatio: `${f.width} / ${f.height}` }}>
                  <Image
                    src={f.src}
                    alt={f.alt}
                    fill
                    sizes="(max-width: 767px) 460px, 700px"
                    className="object-cover transition-[filter] duration-300 group-hover:brightness-110"
                  />
                </div>
              </TransitionLink>
            </li>
          );
        })}
        <li aria-hidden="true" className="w-px shrink-0" />
      </ul>

      <div className="mx-auto mt-4 flex max-w-[1280px] items-center justify-between px-4 md:px-6 xl:px-[30px]">
        <p className="font-mono text-[13px] tracking-[0.08em] text-text-main" aria-hidden="true">
          {String(index + 1).padStart(2, '0')} <span className="text-text-muted">/ {String(frames.length).padStart(2, '0')}</span>
        </p>
        <div className="hidden gap-2 md:flex">
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
