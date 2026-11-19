'use client';

import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

const desks = [
  { name: 'News', summary: 'Reporting on RPI and Troy', body: 'Student government, administration, and campus and Troy news.', email: 'news@poly.rpi.edu' },
  { name: 'Features', summary: 'Profiles, culture, events', body: 'Profiles, clubs, arts and the events calendar.', email: 'features@poly.rpi.edu' },
  { name: 'Sports', summary: 'Game coverage, athletes', body: 'Game recaps, previews and athlete profiles.', email: 'sports@poly.rpi.edu' },
  { name: 'Opinion', summary: 'Columns and editorials', body: 'Regular columns and staff editorials.', email: 'edop@poly.rpi.edu' },
  { name: 'Photo', summary: 'Assignments and galleries', body: 'Games, events and portraits for stories and galleries.', email: 'photo@poly.rpi.edu' },
  { name: 'Copy', summary: 'Editing and headlines', body: 'Edit every story for accuracy and style, and write headlines.', email: 'editors@poly.rpi.edu' },
  { name: 'Business', summary: 'Ads and budget', body: 'Advertising, budget and outreach.', email: 'business@poly.rpi.edu' },
];

export default function DeskList() {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const rows = Array.from(list.querySelectorAll('details'), details => ({
      details,
      summary: details.querySelector('summary')!,
      content: details.querySelector<HTMLDivElement>(':scope > div')!,
    }));
    type Row = (typeof rows)[number];
    const animations = new Map<HTMLDetailsElement, { animation: Animation; opening: boolean }>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let expanded = rows.find(row => row.details.open) ?? null;

    const finish = (row: Row, open: boolean) => {
      const active = animations.get(row.details);
      if (active) {
        active.animation.onfinish = null;
        active.animation.cancel();
        animations.delete(row.details);
      }
      row.details.open = open;
      row.details.style.removeProperty('height');
      row.details.style.removeProperty('overflow');
      row.summary.setAttribute('aria-expanded', String(open));
      row.content.inert = false;
    };

    const move = (row: Row, open: boolean) => {
      if (animations.get(row.details)?.opening === open) return;
      const height = row.details.getBoundingClientRect().height;
      const active = animations.get(row.details);
      if (active) {
        active.animation.onfinish = null;
        active.animation.cancel();
        animations.delete(row.details);
      }
      if (!open && row.content.contains(document.activeElement)) {
        row.summary.focus({ preventScroll: true });
      }
      row.summary.setAttribute('aria-expanded', String(open));
      row.content.inert = !open;
      row.details.style.height = `${height}px`;
      row.details.style.overflow = 'hidden';
      row.details.open = true;
      const style = getComputedStyle(row.details);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const target = row.summary.getBoundingClientRect().height + border
        + (open ? row.content.getBoundingClientRect().height : 0);
      if (reducedMotion.matches || typeof row.details.animate !== 'function' || Math.abs(target - height) < 0.5) {
        finish(row, open);
        return;
      }
      const animation = row.details.animate([{ height: `${height}px` }, { height: `${target}px` }], {
        duration: 220,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      });
      animations.set(row.details, { animation, opening: open });
      animation.onfinish = () => finish(row, open);
    };

    const handlers = rows.map(row => {
      // Keep native grouping without JavaScript. Once enhanced, allow the
      // previous row to finish closing while the new row starts opening.
      row.details.removeAttribute('name');
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0) return;
        event.preventDefault();
        expanded = expanded === row ? null : row;
        rows.forEach(candidate => {
          if (candidate === expanded || candidate.details.open) move(candidate, candidate === expanded);
        });
      };
      const onToggle = () => {
        // Browser features such as Find can also open native details.
        if (animations.has(row.details) && row.details.open) return;
        const open = row.details.open;
        if (open) {
          expanded = row;
          rows.forEach(candidate => {
            if (candidate !== row && candidate.details.open) move(candidate, false);
          });
        } else if (expanded === row) {
          expanded = null;
        }
        finish(row, open);
      };
      row.summary.addEventListener('click', onClick);
      row.details.addEventListener('toggle', onToggle);
      return { row, onClick, onToggle };
    });
    const settle = () => rows.forEach(row => finish(row, row === expanded));
    let width = list.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - width) < 0.5) return;
      width = entry.contentRect.width;
      settle();
    });
    observer.observe(list);
    const onMotionChange = () => { if (reducedMotion.matches) settle(); };
    reducedMotion.addEventListener('change', onMotionChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', onMotionChange);
      handlers.forEach(({ row, onClick, onToggle }) => {
        row.summary.removeEventListener('click', onClick);
        row.details.removeEventListener('toggle', onToggle);
        finish(row, row === expanded);
        row.summary.removeAttribute('aria-expanded');
        row.content.inert = false;
        row.details.setAttribute('name', 'get-involved-desks');
      });
    };
  }, []);

  return (
    <div ref={listRef} className="mt-6 border-t border-rule-strong">
      {desks.map(desk => (
        <details key={desk.name} name="get-involved-desks" className="group border-b border-rule">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 text-text-main focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="font-copy text-[20px] leading-tight">{desk.name}</span>
            <span className="ml-auto hidden font-meta text-[13px] leading-snug text-text-muted md:block">{desk.summary}</span>
            <span aria-hidden="true" className="ml-auto shrink-0 text-accent md:ml-1">
              <Plus className="h-4 w-4 group-open:hidden" />
              <Minus className="hidden h-4 w-4 group-open:block" />
            </span>
          </summary>
          <div className="pb-4">
            <p className="font-copy text-[18px] leading-[1.55] text-text-main">{desk.body}</p>
            <a href={`mailto:${desk.email}`} className="mt-1 inline-flex min-h-11 max-w-full items-center font-meta text-[13px] font-semibold text-accent underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
              {desk.email}
            </a>
          </div>
        </details>
      ))}
    </div>
  );
}
