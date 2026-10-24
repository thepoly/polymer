"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { GameTeam } from "@/components/FrontPage/types";
import type { ScheduleGame, SportSchedule } from "@/lib/schedule";
import { sportLabel } from "@/lib/sports";

/* ── Dates ── */

// Feed dates are Troy local times without an offset, so they're formatted as
// written (read as UTC) and the server and browser always agree
const asDate = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`);
const monthDay = (date: string) =>
  asDate(date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const weekday = (date: string) => asDate(date).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" });

/** "Final/OT · Oct 21" or "Sat, Oct 24 · 7:05 PM" */
function gameHeading(game: ScheduleGame) {
  if (game.result) {
    return `Final${game.result.note ? `/${game.result.note}` : ""} · ${monthDay(game.date)}`;
  }
  return `${weekday(game.date)}, ${monthDay(game.date)} · ${game.time ?? "TBA"}`;
}

/* ── One game ── */

type Side = { name: string; logo: string | null; rank: string | null; score: number | null; winner: boolean };

function TeamRow({ side, dimLoser }: { side: Side; dimLoser: boolean }) {
  // A decided final dims the loser; a tie or an upcoming game shows both plainly
  const tone = dimLoser && !side.winner ? "text-text-muted" : "text-text-main";
  return (
    <div className="flex h-5 items-center gap-2 leading-5">
      {side.logo ? (
        <span className="relative h-5 w-5 shrink-0">
          {/* Logos are small, already-sized transparent images */}
          <Image src={side.logo} alt="" fill sizes="20px" className="object-contain" unoptimized />
        </span>
      ) : (
        <span className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <span className={`min-w-0 flex-1 truncate font-meta text-[14px] ${tone} ${side.winner ? "font-semibold" : ""}`}>
        {side.rank && <span className="mr-1 text-[11px] font-normal text-text-muted">{side.rank}</span>}
        {side.name}
      </span>
      {side.score !== null && (
        <span className={`font-meta text-[15px] tabular-nums ${tone} ${side.winner ? "font-semibold" : ""}`}>
          {side.score}
        </span>
      )}
    </div>
  );
}

function GameCell({ game, rpiTeam }: { game: ScheduleGame; rpiTeam: GameTeam }) {
  const r = game.result;
  const rpi: Side = {
    name: rpiTeam.shortName,
    logo: rpiTeam.logo,
    rank: null,
    score: r?.rpiScore ?? null,
    winner: r?.outcome === "W",
  };
  const opponent: Side = {
    name: game.opponent.shortName,
    logo: game.opponent.logo,
    rank: game.opponent.rank,
    score: r?.opponentScore ?? null,
    winner: r?.outcome === "L",
  };
  // Away team on top, home below; RPI is "home" at neutral sites
  const [top, bottom] = game.homeAway === "away" ? [rpi, opponent] : [opponent, rpi];
  const decided = r?.outcome === "W" || r?.outcome === "L";

  const body = (
    <>
      {/* Whole-pixel line heights keep the strip's height, and the red bar on
          its bottom rule, on whole pixels, so the bar renders crisp */}
      <div className="mb-2 whitespace-nowrap font-meta text-[11px] leading-4 uppercase tracking-[0.06em] text-text-main">
        {gameHeading(game)}
      </div>
      <div className="flex flex-col gap-1.5">
        <TeamRow side={top} dimLoser={decided} />
        <TeamRow side={bottom} dimLoser={decided} />
      </div>
    </>
  );
  const className = "block w-[176px] shrink-0 snap-start border-l border-rule px-3 py-2.5 sm:w-[190px]";

  return game.link ? (
    <a
      href={game.link}
      target="_blank"
      rel="noopener noreferrer"
      title="Recap and box score on RPI Athletics"
      className={`${className} transition-colors hover:bg-text-main/[0.04]`}
    >
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* ── Strip ── */

/**
 * RPI's last two finals and next game in each standings sport (see
 * lib/schedule.ts for how gaps are filled), one group per sport. The row scrolls sideways (finger or trackpad swipe), with a fade on
 * the cut-off edge and arrows for mouse users, who can't swipe sideways.
 */
export default function SportsScoreStrip({ schedule, rpiTeam }: { schedule: SportSchedule[]; rpiTeam: GameTeam }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  // Visible part of the strip, as fractions of its full width, for the red
  // progress bar along the bottom rule
  const [view, setView] = useState({ start: 0, size: 1 });
  // The bar stays hidden until the reader first points at or scrolls the
  // strip, then fills in once and stays
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el || revealed) return;
    const reveal = () => setRevealed(true);
    el.addEventListener("scroll", reveal, { passive: true, once: true });
    return () => el.removeEventListener("scroll", reveal);
  }, [revealed]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      setEdges({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
      setView({ start: el.scrollLeft / el.scrollWidth, size: el.clientWidth / el.scrollWidth });
    };
    // Fires once on observe, then on every resize
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const scrollBy = (direction: 1 | -1) =>
    listRef.current?.scrollBy({ left: direction * listRef.current.clientWidth * 0.8, behavior: "smooth" });

  // A full-height tab built into the strip's edge, for mouse users (touch
  // devices swipe and see only the fade). Red chevron; fills red on hover.
  const arrow = (side: "left" | "right") => (
    <div
      // Stops inside the rules so they run the full width
      className={`pointer-events-none absolute top-px bottom-px flex lg:top-0 ${side === "left" ? "left-0" : "right-0 flex-row-reverse"}`}
    >
      <button
        type="button"
        aria-label={side === "left" ? "Scroll scores left" : "Scroll scores right"}
        onClick={() => scrollBy(side === "left" ? -1 : 1)}
        className={`pointer-events-auto hidden w-9 items-center justify-center border-rule bg-bg-main text-accent transition-colors duration-200 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white [@media(hover:hover)]:flex ${side === "left" ? "border-r" : "border-l"}`}
      >
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={side === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"} />
        </svg>
      </button>
      {/* Softens the cut-off cell next to the tab */}
      <div
        className="w-8"
        style={{ background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--background), transparent)` }}
      />
    </div>
  );

  return (
    <section
      aria-label="RPI scores and schedule"
      className="relative mb-8 sm:mb-10"
      onMouseEnter={() => setRevealed(true)}
    >
      <div
        ref={listRef}
        // On desktop the strip sits right under the header's rule, which serves
        // as its top one; the phone header has no such rule, so it gets its own
        className="flex snap-x snap-proximity overflow-x-auto overscroll-x-contain border-y border-rule lg:border-t-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {schedule.map((s, i) => (
          <div key={s.sport} role="group" aria-label={sportLabel(s.sport) ?? s.sport} className="flex shrink-0">
            <a
              href={s.scheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Full schedule on RPI Athletics"
              className={`flex w-[92px] shrink-0 snap-start items-center justify-center bg-text-main/[0.04] px-2 text-center font-meta text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-text-main transition-colors hover:text-accent ${i > 0 ? "border-l border-rule" : ""}`}
            >
              {sportLabel(s.sport)}
            </a>
            {s.games.map((g) => (
              <GameCell key={g.id} game={g} rpiTeam={rpiTeam} />
            ))}
          </div>
        ))}
      </div>
      {edges.left && arrow("left")}
      {edges.right && arrow("right")}
      {/* Red progress bar on the bottom rule, filled from the left edge to the
          end of what's in view. Hidden until the first hover or scroll. */}
      {view.size < 1 && revealed && (
        <div
          aria-hidden="true"
          // score-strip-fill: fills in from the left once (globals.css)
          className="score-strip-fill pointer-events-none absolute bottom-0 left-0 h-[2px] origin-left bg-accent"
          style={{ width: `${(view.start + view.size) * 100}%` }}
        />
      )}
    </section>
  );
}
