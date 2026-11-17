"use client";

import React, { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// Not re-exported from "next/navigation"; it's the type router.prefetch takes
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { slideBar } from "@/components/slidingBar";
import { STUDENT_GOV_BODIES, type StudentGovBody } from "./studentGov";
import { swipeTo, takeBarSpot } from "./pageSwipe";

const TONES = {
  /** On the page: the body you're on in red, with a red bar on the 2px rule below */
  page: {
    active: "text-accent",
    whileSliding: "group-data-[sliding]/bodyswitch:text-text-muted",
    idle: "text-text-muted transition-colors hover:text-accent",
    ink: "text-accent",
    bar: "-bottom-[13px] h-[4px] bg-accent",
  },
  /** On the red photo panel: white, with a white bar under the one you're on */
  panel: {
    active: "text-white",
    whileSliding: "group-data-[sliding]/bodyswitch:text-white/60",
    idle: "text-white/60 transition-colors hover:text-white",
    ink: "text-white",
    bar: "-bottom-[5px] h-[2px] bg-white",
  },
} as const;

/**
 * Senate | Executive Board. The body you're on is marked with a bar, as the
 * masthead marks its section; choosing the other goes to its timeline for
 * the same term, with the bar sliding over (turning each label as it passes)
 * and the page swiping across (pageSwipe.ts).
 *
 * `id` names the switch, so the same switch on the next page knows to slide
 * its bar over from where this one's was.
 */
export default function StudentGovBodySwitch({
  id,
  body,
  otherHref,
  labels,
  tone,
  className = "",
}: {
  id: string;
  body: StudentGovBody;
  /** The other body's same term (or its timeline) */
  otherHref: string;
  labels: Record<StudentGovBody, string>;
  tone: keyof typeof TONES;
  className?: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const t = TONES[tone];

  // Arriving from the other body: slide the bar over from where it was
  useLayoutEffect(() => {
    const from = takeBarSpot(id);
    if (from && navRef.current) slideBar(navRef.current, from);
  }, [id]);

  // Fetch the other timeline in full as soon as it's pointed at, so the swipe
  // usually has the new page at once (a plain hover prefetch only fetches a
  // dynamic page's layout)
  const preloaded = useRef(false);
  const preload = () => {
    if (preloaded.current) return;
    preloaded.current = true;
    try {
      router.prefetch(otherHref, { kind: PrefetchKind.FULL });
    } catch {
      // The click loads it instead
    }
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    // Keyboard and touch may not have pointed at it first
    preload();
    const other = body === "senate" ? "eboard" : "senate";
    // With the Terms list on screen, the new page puts it back in place
    // itself, so Next mustn't scroll to the top
    swipeTo(otherHref, STUDENT_GOV_BODIES.indexOf(other) > STUDENT_GOV_BODIES.indexOf(body) ? 1 : -1, (href, keepScroll) =>
      router.push(href, { scroll: !keepScroll }),
    );
  };

  const label = "py-0.5";
  return (
    <nav
      ref={navRef}
      data-slide-nav={id}
      aria-label="Student Government body"
      className={`group/bodyswitch relative flex items-center gap-5 font-meta text-[12px] font-bold uppercase tracking-[0.12em] ${className}`}
    >
      {/* The labels again in the active colour, shown only while the bar
          slides and cut to its span (slidingBar.ts) */}
      <div
        aria-hidden="true"
        data-slide-ink
        className="pointer-events-none absolute inset-0 z-10 hidden items-center gap-5 group-data-[sliding]/bodyswitch:flex"
      >
        {STUDENT_GOV_BODIES.map((b) => (
          <span key={b} className={`${label} ${t.ink}`}>
            {labels[b]}
          </span>
        ))}
      </div>
      {STUDENT_GOV_BODIES.map((b) =>
        b === body ? (
          // While the bar slides, the active colour comes from the copy above
          <span key={b} aria-current="page" className={`relative ${label} ${t.active} ${t.whileSliding}`}>
            {labels[b]}
            <span aria-hidden="true" data-slide-bar className={`pointer-events-none absolute right-0 left-0 z-20 ${t.bar}`} />
          </span>
        ) : (
          <Link
            key={b}
            href={otherHref}
            onClick={onClick}
            onPointerEnter={preload}
            onFocus={preload}
            onTouchStart={preload}
            className={`relative ${label} ${t.idle}`}
          >
            {labels[b]}
          </Link>
        ),
      )}
    </nav>
  );
}
