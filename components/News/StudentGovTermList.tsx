"use client";

import React, { useEffect, useRef, useState } from "react";
import TransitionLink from "@/components/TransitionLink";
import StudentGovBodySwitch from "./StudentGovBodySwitch";
import { STUDENT_GOV, type StudentGovBody } from "./studentGov";
import { LEADER_TITLE } from "./studentGovTerms";

/** One covered term in the list, newest first */
export type TermRow = {
  /** Term slug ("senate-56") */
  key: string;
  /** "56th Senate" / "2025–26" */
  name: string;
  /** "2025–26" beside a Senate's number; null for the E-Board, whose name is its years */
  years: string | null;
  /** "Ava Gallagher, then Catherine Philipps (135th)", or null when none is entered */
  leaders: string | null;
  articles: number;
  updates: number;
  /** The term's timeline page */
  href: string;
  /** In session */
  isCurrent: boolean;
  /** The term on this page */
  isViewed: boolean;
};

/** Rows shown before "Show … earlier terms" */
const SHOWN = 4;

/** Print issues, at the Institute Archives (same link as the search pages) */
const PRINT_ARCHIVE_URL = "https://digitalassets.archives.rpi.edu/do/235be3d2-f018-48af-a413-b50e16dd6dc7";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "14 stories · 3 updates" / "1 story" / "Nothing yet" */
function countLine(r: TermRow): string {
  const parts = [r.articles > 0 && plural(r.articles, "story", "stories"), r.updates > 0 && plural(r.updates, "update", "updates")];
  return parts.filter(Boolean).join(" · ") || "Nothing yet";
}

/**
 * Every covered term of one body, newest first, at the foot of its timeline
 * page: name, who chaired it, how much the timeline holds, and a link to its
 * page. The four newest show, plus the term on the page if it's older; the
 * rest open in place.
 *
 * Wide (the stream column from about 600px), it's a four-column table with
 * one header row; narrow, each term is a name with its chair and counts
 * beneath. Each row is a single link; the term on the page isn't one, and is
 * marked with a red rule instead.
 */
export default function StudentGovTermList({
  body,
  rows,
  otherHref,
}: {
  body: StudentGovBody;
  rows: TermRow[];
  /** The other body's same term (or its timeline) */
  otherHref: string;
}) {
  const [open, setOpen] = useState(false);
  // Closed: the newest few, and the term on the page wherever it falls
  const inClosed = (r: TermRow, i: number) => i < SHOWN || r.isViewed;
  const shown = open ? rows : rows.filter(inClosed);
  const hidden = rows.length - rows.filter(inClosed).length;
  const firstHidden = rows.findIndex((r, i) => !inClosed(r, i));

  // Opening the list moves focus to the first term it reveals
  const firstRevealed = useRef<HTMLLIElement>(null);
  const focusRevealed = useRef(false);
  useEffect(() => {
    if (open && focusRevealed.current) {
      focusRevealed.current = false;
      firstRevealed.current?.querySelector<HTMLElement>("a")?.focus();
    }
  }, [open]);

  const listId = `${body}-terms`;
  // One grid for the header and every row, so the columns line up
  const grid = "@[600px]:grid @[600px]:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_10rem_4.5rem] @[600px]:items-baseline @[600px]:gap-x-5";

  return (
    // The anchor: switching bodies with this on screen keeps it in place (pageSwipe.ts)
    <section data-swipe-anchor aria-labelledby={`${listId}-heading`} className="@container font-meta">
      {/* Stays put, rule and all, while the stream around it slides across (pageSwipe.ts) */}
      <div data-swipe-keep className="flex flex-wrap items-end justify-end gap-x-6 gap-y-2 border-b-2 border-text-main pb-2.5">
        {/* Named for screen readers only: on screen the switch and the rows say enough */}
        <h2 id={`${listId}-heading`} className="sr-only">
          Terms
        </h2>
        {/* Which body's terms, with the bar on the rule below */}
        <StudentGovBodySwitch
          id="terms"
          body={body}
          otherHref={otherHref}
          labels={{ senate: STUDENT_GOV.senate.title, eboard: STUDENT_GOV.eboard.title }}
          tone="page"
        />
      </div>

      {/* Column labels: wide only, and only for sighted readers (each row reads in full on its own) */}
      <div
        aria-hidden="true"
        className={`hidden px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted ${grid}`}
      >
        <span>Term</span>
        <span>{LEADER_TITLE[body]}</span>
        <span>On the timeline</span>
      </div>

      <ol id={listId}>
        {shown.map((r) => {
          const name = (
            <span className="flex flex-col gap-0.5">
              <span className="font-copy text-[20px] font-semibold leading-[1.15] text-text-main transition-colors group-hover:text-accent">
                {r.name}
              </span>
              {(r.years || r.isCurrent) && (
                <span className="flex items-center gap-2 text-[12px] text-text-muted">
                  {r.years}
                  {r.isCurrent && (
                    <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-accent">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                      In session
                    </span>
                  )}
                </span>
              )}
            </span>
          );
          const cells = (
            <>
              {name}
              {/* Narrow: under the name, with the title spelt out */}
              <span className="mt-1.5 block text-[14px] leading-[1.45] text-text-main @[600px]:mt-0">
                {r.leaders ? (
                  <>
                    <span className="@[600px]:sr-only">{LEADER_TITLE[body]} </span>
                    {r.leaders}
                  </>
                ) : (
                  // Most older terms have none entered: a dash, not a phrase repeated down the column
                  <span className="text-text-muted">
                    <span aria-hidden="true">&mdash;</span>
                    <span className="sr-only">{LEADER_TITLE[body]} not recorded</span>
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[13px] tabular-nums text-text-muted @[600px]:mt-0">{countLine(r)}</span>
            </>
          );
          return (
            <li
              key={r.key}
              ref={r === rows[firstHidden] ? firstRevealed : undefined}
              className="border-b border-[var(--rule-color)]"
            >
              {r.isViewed ? (
                <div
                  aria-current="page"
                  className={`relative px-3 py-4 pr-24 shadow-[inset_3px_0_0_var(--color-accent)] @[600px]:pr-3 ${grid}`}
                >
                  {cells}
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted @[600px]:static @[600px]:translate-y-0 @[600px]:text-right">
                    Viewing
                  </span>
                </div>
              ) : (
                <TransitionLink
                  href={r.href}
                  className={`group relative block px-3 py-4 pr-9 transition-colors hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent dark:hover:bg-white/[0.04] @[600px]:pr-3 ${grid}`}
                >
                  {cells}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-accent stroke-[1.75] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none @[600px]:static @[600px]:translate-y-0 @[600px]:justify-self-end @[600px]:self-center"
                  >
                    <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </TransitionLink>
              )}
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            focusRevealed.current = !open;
            setOpen(!open);
          }}
          className="group mt-4 inline-flex min-h-11 items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent"
        >
          {open ? "Show fewer" : `Show ${plural(hidden, "earlier term", "earlier terms")}`}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className={`h-3.5 w-3.5 fill-none stroke-current stroke-[1.75] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          >
            <path d="M3.5 6 8 10.5 12.5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <p className="mt-3 text-[13px] leading-[1.5] text-text-muted">
        Earlier {body === "senate" ? "Senates" : "boards"} are in The Polytechnic&rsquo;s{" "}
        <a
          href={PRINT_ARCHIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[var(--rule-color)] underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
        >
          print archive at Folsom Library
        </a>
        .
      </p>
    </section>
  );
}
