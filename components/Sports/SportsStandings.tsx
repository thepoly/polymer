"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { SportStandings, StandingsRow } from "@/lib/standings";

export type StandingsTeam = { logo: string | null; url: string | null };

const TOP = 5;

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
 * scrolls sideways (finger or trackpad swipe), with a fade on the cut-off edge
 * and arrows for mouse users, who can't swipe sideways.
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
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    // Fires once on observe, then on every resize
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  // Keep the selected tab in view without scrolling the page itself
  useEffect(() => {
    const el = listRef.current;
    const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !tab) return;
    if (tab.offsetLeft < el.scrollLeft) el.scrollLeft = tab.offsetLeft;
    else if (tab.offsetLeft + tab.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = tab.offsetLeft + tab.offsetWidth - el.clientWidth;
    }
  }, [activeSport]);

  const scrollBy = (direction: 1 | -1) =>
    listRef.current?.scrollBy({ left: direction * listRef.current.clientWidth * 0.6, behavior: "smooth" });

  const fade = (side: "left" | "right") => ({
    background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--background) 35%, transparent)`,
  });

  return (
    <div className="relative mb-3">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Sport"
        className="relative flex justify-between gap-x-4 overflow-x-auto overscroll-x-contain shadow-[inset_0_-1px_0_var(--rule-color)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              className={`shrink-0 border-b-2 pb-1.5 font-meta text-[11px] uppercase tracking-[0.04em] whitespace-nowrap transition-colors xl:text-[12px] xl:tracking-[0.06em] ${
                selected
                  ? "border-accent text-text-main"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              {s.tabLabel}
            </button>
          );
        })}
      </div>

      {edges.left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center" style={fade("left")}>
          <button
            type="button"
            aria-label="Scroll sports left"
            onClick={() => scrollBy(-1)}
            className="pointer-events-auto hidden pb-1.5 pl-0.5 font-meta text-[15px] leading-none text-text-muted transition-colors hover:text-accent [@media(hover:hover)]:block"
          >
            &#8249;
          </button>
        </div>
      )}
      {edges.right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end" style={fade("right")}>
          <button
            type="button"
            aria-label="Scroll sports right"
            onClick={() => scrollBy(1)}
            className="pointer-events-auto hidden pb-1.5 pr-0.5 font-meta text-[15px] leading-none text-text-muted transition-colors hover:text-accent [@media(hover:hover)]:block"
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
  defaultSport?: string | null;
}) {
  const [active, setActive] = useState(
    // The lead story's sport, unless its conference play hasn't started
    () => standings.find((s) => s.sport === defaultSport && s.confStarted)?.sport ?? standings[0]?.sport,
  );
  const current = standings.find((s) => s.sport === active) ?? standings[0];
  if (!current) return null;

  // Divisional tables show (and rank by) the division record
  const abbr = current.divisionRecords ? "Div" : CONFERENCE_ABBR[current.conference] ?? "Conf";
  const rpi = current.rows.find((r) => r.isRpi);
  const rows = visibleRows(current.rows);

  return (
    <section aria-label="Conference standings">
      <div style={{ borderTop: "2px solid var(--accent-color)", paddingTop: 4, marginBottom: 10 }}>
        <h2
          className="font-meta uppercase text-accent dark:text-white"
          style={{ fontSize: 21, letterSpacing: "0.08em", fontWeight: 500, margin: "0 0 2px" }}
        >
          Standings
        </h2>
      </div>

      <SportTabs standings={standings} activeSport={current.sport} onSelect={setActive} />

      {/* Divisional sports show RPI's division */}
      {current.division && (
        <p className="mb-1.5 font-meta text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          {current.division} Division
        </p>
      )}

      {current.confStarted ? (
        <table className="w-full table-fixed font-meta text-[13px] tabular-nums">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.06em] text-text-muted">
              <th className="w-7 pb-1.5 text-left font-medium">#</th>
              <th className="pb-1.5 text-left font-medium">Team</th>
              <th className="w-[58px] pb-1.5 text-right font-medium">{abbr}</th>
              {current.hasPoints && <th className="w-9 pb-1.5 text-right font-medium">Pts</th>}
              <th className="w-[62px] pb-1.5 text-right font-medium">Overall</th>
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
                <td className="py-2 pl-1 text-text-muted">{row.rank}</td>
                <td className="py-2">
                  <TeamCell row={row} team={teams[row.team]} />
                </td>
                <td className="py-2 text-right">{row.conf}</td>
                {current.hasPoints && <td className="py-2 text-right">{row.pts}</td>}
                <td className="py-2 pr-1 text-right text-text-muted">{row.overall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="font-copy text-[16px] leading-[1.35] text-text-main">
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
        className="mt-2.5 inline-block font-meta text-[11px] uppercase tracking-[0.06em] text-text-muted hover:text-accent transition-colors"
      >
        Full standings: {current.conference} &#8599;
      </a>
    </section>
  );
}
