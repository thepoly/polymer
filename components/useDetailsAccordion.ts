'use client';

import { useEffect, type RefObject } from 'react';

/**
 * One-open-at-a-time <details> rows that animate their height. The rows
 * work as plain native <details name=...> without JavaScript; this enhances
 * them so the previous row can finish closing while the next one opens.
 * Used by the Get involved desk list and the Features section list.
 *
 * Height animation clips with `overflow: hidden`, which doesn't clip a
 * pinned PhotoWindow, so don't put one inside a row.
 */
export function useDetailsAccordion(listRef: RefObject<HTMLElement | null>, name: string) {
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
        row.details.setAttribute('name', name);
      });
    };
  }, [listRef, name]);
}
