"use client";

import React, { useLayoutEffect, useRef } from "react";

/**
 * Grows type to fill blank space, by the same amount across a group of
 * stories so they read as a set.
 *
 * Each story in the group marks three things:
 * - `data-fit-item`: the story
 * - `data-fit-target`: the box whose height the text should fill, usually the
 *   photo beside it (its height must not depend on the text)
 * - `data-fit-content`: the text block that grows. It must not be stretched
 *   to the row's height (in a grid or flex row, give it `self-start`).
 *
 * The group sets one CSS variable, `--fit`, on itself: a scale from `min` to
 * `max`. Text opts in by multiplying its font size by it, e.g.
 * `font-size: calc(24px * var(--fit, 1))`, or less for body text
 * (`calc(15px * (1 + (var(--fit, 1) - 1) * 0.5))`), so headlines do most of
 * the growing. Spacing, kickers and bylines can stay fixed.
 *
 * `--fit` is the largest step at which every story's text still fits its
 * box. The wordiest story fills its box exactly; the rest take the same size
 * and keep a little space, rather than each story getting its own size. If a
 * story doesn't fit even at `min`, the group stays at `min` and that story
 * runs long. Stories without a target (no photo) are left out of the sum.
 *
 * Refits when the group's width changes, when `when` starts or stops
 * matching, and once web fonts have loaded. Where `when` doesn't match (say,
 * phones, where text sits under the photo) `--fit` is 1.
 *
 * The text is hidden until its first fit, so readers don't see it jump size
 * (see `[data-fit-group]` in globals.css). If scripts never run, it appears
 * anyway at its base size after a moment.
 */
export default function FitGroup({
  min = 1,
  max = 1.4,
  step = 0.02,
  when,
  className,
  children,
}: {
  /** Smallest scale; 1 keeps the base size as the floor */
  min?: number;
  /** Largest scale, so a short headline doesn't become a banner */
  max?: number;
  /** Scales are whole steps of this, so sizes stay consistent between groups */
  step?: number;
  /** Media query the fitting applies under, e.g. "(min-width: 640px)" */
  when?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const query = when ? window.matchMedia(when) : null;
    const set = (scale: number) => group.style.setProperty("--fit", scale.toFixed(3));

    const fit = () => {
      const items = Array.from(group.querySelectorAll<HTMLElement>("[data-fit-item]"))
        .map((item) => ({
          target: item.querySelector<HTMLElement>("[data-fit-target]"),
          content: item.querySelector<HTMLElement>("[data-fit-content]"),
        }))
        .filter((i): i is { target: HTMLElement; content: HTMLElement } => Boolean(i.target && i.content));

      if ((query && !query.matches) || items.length === 0) {
        set(1);
      } else {
        // Every story's text no taller than its box (half a pixel for rounding)
        const fitsAt = (scale: number) => {
          set(scale);
          return items.every(
            ({ target, content }) =>
              content.getBoundingClientRect().height <= target.getBoundingClientRect().height + 0.5,
          );
        };
        // Fitting only gets harder as the scale grows, so binary search the
        // steps for the last one that fits
        let lo = 0;
        let hi = Math.max(0, Math.floor((max - min) / step + 1e-9));
        if (!fitsAt(min)) hi = 0;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (fitsAt(min + mid * step)) lo = mid;
          else hi = mid - 1;
        }
        set(min + lo * step);
      }
      group.dataset.fitted = "";
    };

    fit();

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    // Width changes rewrap the text. Height changes are ignored: they're
    // usually this component's own doing.
    let width = group.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (Math.abs(next - width) < 0.5) return;
      width = next;
      schedule();
    });
    observer.observe(group);
    query?.addEventListener("change", schedule);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) schedule();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      query?.removeEventListener("change", schedule);
    };
  }, [min, max, step, when]);

  return (
    <div ref={ref} data-fit-group className={className}>
      {children}
    </div>
  );
}
