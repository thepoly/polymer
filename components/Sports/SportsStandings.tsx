"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import type { SportStandings, StandingsRow } from "@/lib/standings";
import { MAX_TABS } from "@/lib/standingsSchedule";
import SportsHeading from "./SportsHeading";
import { useScrollEdges } from "./useScrollEdges";
import { useMomentumScroll } from "./useMomentumScroll";

export type StandingsTeam = { logo: string | null; url: string | null };

const TOP = 5;
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isDesktopViewport = () => window.matchMedia(DESKTOP_QUERY).matches;

const CONFERENCE_ABBR: Record<string, string> = {
  "ECAC Hockey": "ECAC",
  "Liberty League": "LL",
};

/** Top five; when RPI is lower it takes the fifth row, keeping its real rank. */
function visibleRows(rows: StandingsRow[]) {
  const rpi = rows.find((r) => r.isRpi);
  if (!rpi || rpi.rank <= TOP) return rows.slice(0, TOP);
  return [...rows.slice(0, TOP - 1), rpi];
}

function TeamCell({ row, team }: { row: StandingsRow; team?: StandingsTeam }) {
  const logo = team?.logo ? (
    <span className="relative h-5 w-5 shrink-0">
      <Image src={team.logo} alt="" fill sizes="20px" className="object-contain" unoptimized />
    </span>
  ) : (
    <span className="h-5 w-5 shrink-0" aria-hidden="true" />
  );

  return (
    <span className="flex min-w-0 items-center gap-2">
      {logo}
      {team?.url ? (
        <a
          href={team.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:text-accent focus-visible:text-accent transition-colors"
        >
          {row.team}
        </a>
      ) : (
        <span className="truncate">{row.team}</span>
      )}
    </span>
  );
}

/**
 * Tabs spread across the full width when they fit. When they don't, the row
 * scrolls sideways (finger or trackpad swipe, or desktop mouse drag), with a
 * desktop fade and arrows on the cut-off edge for mouse users. Past five sports each
 * tab takes at least a fifth of the row, so no more than five show at once.
 */
function SportTabs({
  standings,
  activeSport,
  onSelect,
}: {
  standings: SportStandings[];
  activeSport: string;
  onSelect: (sport: SportStandings["sport"]) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const desktop = useSyncExternalStore(subscribeToDesktop, isDesktopViewport, () => false);
  const { handlers, stopMomentum } = useMomentumScroll(listRef, { mouseDrag: desktop, touchDrag: false });
  const edges = useScrollEdges(listRef);

  // Keep the selected tab in view without scrolling the page itself
  useEffect(() => {
    stopMomentum();
    const el = listRef.current;
    const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !tab) return;
    if (tab.offsetLeft < el.scrollLeft) el.scrollLeft = tab.offsetLeft;
    else if (tab.offsetLeft + tab.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = tab.offsetLeft + tab.offsetWidth - el.clientWidth;
    }
  }, [activeSport, stopMomentum]);

  const scrollBy = (direction: 1 | -1) => {
    stopMomentum();
    listRef.current?.scrollBy({
      left: direction * listRef.current.clientWidth * 0.6,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  // Five tabs and the four gap-x-4 gaps between them fill the row
  const tabWidth = standings.length > MAX_TABS ? { minWidth: "calc((100% - 4rem) / 5)" } : undefined;

  const fade = (side: "left" | "right") => ({
    background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--background) 35%, transparent)`,
  });

  return (
    <div className="relative mb-3">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Sport"
        className="relative flex justify-between gap-x-4 overflow-x-auto overscroll-x-contain px-4 shadow-[inset_0_-1px_0_var(--rule-color)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-0 lg:cursor-grab lg:select-none lg:active:cursor-grabbing lg:[&_button]:cursor-[inherit]"
        {...handlers}
      >
        {standings.map((s) => {
          const selected = s.sport === activeSport;
          return (
            <button
              key={s.sport}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(s.sport)}
              style={tabWidth}
              className={`shrink-0 pb-2 text-left font-meta text-[11px] uppercase tracking-[0.04em] whitespace-nowrap transition-colors xl:text-[12px] xl:tracking-[0.06em] ${
                selected
                  ? "text-text-main"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <span className="relative block w-fit">
                {s.tabLabel}
                {selected && (
                  <span
                    aria-hidden="true"
                    data-slide-bar
                    className="pointer-events-none absolute -bottom-2 left-0 right-0 h-[2px] bg-accent"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {edges.left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 items-center lg:flex" style={fade("left")}>
          <button
            type="button"
            aria-label="Scroll sports left"
            onClick={() => scrollBy(-1)}
            className="pointer-events-auto hidden pb-2.5 pl-0.5 font-meta text-[15px] leading-none text-text-muted transition-colors hover:text-accent [@media(hover:hover)]:block"
          >
            &#8249;
          </button>
        </div>
      )}
      {edges.right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 items-center justify-end lg:flex" style={fade("right")}>
          <button
            type="button"
            aria-label="Scroll sports right"
            onClick={() => scrollBy(1)}
            className="pointer-events-auto hidden pb-2.5 pr-0.5 font-meta text-[15px] leading-none text-text-muted transition-colors hover:text-accent [@media(hover:hover)]:block"
          >
            &#8250;
          </button>
        </div>
      )}
    </div>
  );
}

export default function SportsStandings({
  standings,
  teams,
  defaultSport,
}: {
  standings: SportStandings[];
  teams: Record<string, StandingsTeam>;
  /** Preferred initial sport on desktop; mobile starts at the leftmost tab. */
  defaultSport?: string | null;
}) {
  // Render the first tab on the server too, so mobile never initially jumps
  // to a later sport. Once chosen, the reader's selection survives resizing.
  const desktop = useSyncExternalStore(subscribeToDesktop, isDesktopViewport, () => false);
  const [active, setActive] = useState<string>();
  const preferred = desktop ? standings.find((s) => s.sport === defaultSport && s.confStarted) : undefined;
  const current = standings.find((s) => s.sport === active) ?? preferred ?? standings[0];
  if (!current) return null;

  // Divisional tables show (and rank by) the division record
  const abbr = current.divisionRecords ? "Div" : CONFERENCE_ABBR[current.conference] ?? "Conf";
  const rpi = current.rows.find((r) => r.isRpi);
  const rows = visibleRows(current.rows);

  return (
    <section aria-label="Conference standings" className="-mx-4 md:mx-0">
      <div className="px-4 md:px-0">
        <SportsHeading gap={10}>Standings</SportsHeading>
      </div>

      <SportTabs standings={standings} activeSport={current.sport} onSelect={setActive} />

      {/* Divisional sports show RPI's division */}
      {current.division && (
        <p className="mb-1.5 px-4 font-meta text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted md:px-0">
          {current.division} Division
        </p>
      )}

      {current.confStarted ? (
        <table className="w-full table-fixed font-meta text-[13px] tabular-nums">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.06em] text-text-muted">
              <th className="w-11 pb-1.5 pl-4 text-left font-medium md:w-7 md:pl-0">#</th>
              <th className="pb-1.5 text-left font-medium">Team</th>
              <th className="w-[58px] pb-1.5 text-right font-medium">{abbr}</th>
              {current.hasPoints && <th className="w-9 pb-1.5 text-right font-medium">Pts</th>}
              <th className="w-[78px] pb-1.5 pr-4 text-right font-medium md:w-[62px] md:pr-0">Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.team}
                className={`border-t border-rule ${
                  row.isRpi ? "bg-accent/[0.07] font-semibold text-text-main" : "text-text-main"
                }`}
              >
                <td className="py-2 pl-5 text-text-muted md:pl-1">{row.rank}</td>
                <td className="py-2">
                  <TeamCell row={row} team={teams[row.team]} />
                </td>
                <td className="py-2 text-right">{row.conf}</td>
                {current.hasPoints && <td className="py-2 text-right">{row.pts ?? "–"}</td>}
                <td className="py-2 pr-5 text-right text-text-muted md:pr-1">{row.overall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-4 font-copy text-[16px] leading-[1.35] text-text-main md:px-0">
          {current.conference} play hasn&apos;t started yet.
          {rpi && (
            <>
              {" "}
              RPI is <span className="font-semibold tabular-nums">{rpi.overall}</span> overall.
            </>
          )}
        </p>
      )}

      <a
        href={current.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-4 mt-2.5 inline-block font-meta text-[11px] uppercase tracking-[0.06em] text-text-muted hover:text-accent transition-colors md:mx-0"
      >
        Full standings: {current.conference} &#8599;
      </a>
    </section>
  );
}
