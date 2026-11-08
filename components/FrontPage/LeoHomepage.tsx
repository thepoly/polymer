import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import type { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { getSlotNumber } from "@/lib/homepageSlots";
import type { BandColors } from "@/lib/imageBandColor";

/**
 * Leo: a page with no rules and no fixed columns. Stories float in space.
 *
 * Every story with a photo is a card: its text sits on a solid band coloured
 * from the photo, and the band runs under the photo, beside it, above it or
 * below it. Cards are fitted together like puzzle pieces from a small set of
 * interlocking patterns (see PATTERNS), chosen by a random generator seeded
 * with the article id so a given story always lands the same way. Stories
 * without photos (and the opinion slots) are bare text tucked into the
 * notches the cards leave.
 *
 * Reading order is still top to bottom; the photos zigzag down the page.
 */

// ---------------------------------------------------------------------------
// Seeded randomness

const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** mulberry32: tiny, deterministic, good enough for layout dice. */
const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(rng: () => number, options: readonly T[]): T => options[Math.floor(rng() * options.length)];

// ---------------------------------------------------------------------------
// Pieces

const sectionLabel = (article: Article): string => article.kicker || article.section;

const authorText = (article: Article): string | null =>
  article.authorLinks?.length ? article.authorLinks.map((a) => a.name).join(" and ") : article.author;

const hasPhoto = (article: Article): boolean => Boolean(article.image || article.imageFull);

type Side = "left" | "right";
type FloatSize = "s" | "m" | "l" | "xl";
type Placed = { article: Article; slot: number | null };

/** A rectangle of grid cells: 12 columns, rows relative to the pattern. */
type Rect = { col: number; span: number; row: number; rows: number };

/**
 * A card is three pieces placed independently on one shared grid: the photo,
 * the coloured band, and the text that sits on the band. They overlap on
 * purpose — the band runs under the photo, the text keeps to the part of the
 * band the photo doesn't cover. Fillers are bare stories in the leftover cells.
 */
type Piece =
  | { kind: "photo"; card: number; rect: Rect; up?: boolean }
  | { kind: "band"; card: number; rect: Rect; inset?: "top" | "bottom" | "up" }
  | { kind: "text"; card: number; rect: Rect; inset?: "top" | "bottom" | "up"; place?: "above" | "below" }
  | { kind: "filler"; text: number; rect: Rect; align: "start" | "center" | "end" };

type Pattern = { cards: number; fillers: number; rows: number; lastSide: Side; pieces: Piece[] };

const R = (col: number, span: number, row: number, rows = 1): Rect => ({ col, span, row, rows });

/**
 * The puzzle pieces. Each pattern is a few rows of the 12-column grid that
 * fits one or two cards together with the bare stories tucked into the
 * notches they leave. `lastSide` is where the final photo sits so the next
 * pattern can zigzag the other way.
 */
const PATTERNS: Record<string, Pattern> = {
  // Lead: photo right, a wide band from the left with a big title; a bare story in the notch.
  lead: {
    cards: 1, fillers: 1, rows: 2, lastSide: "right",
    pieces: [
      { kind: "photo", card: 0, rect: R(6, 7, 1, 2) },
      { kind: "band", card: 0, rect: R(1, 8, 1), inset: "top" },
      { kind: "text", card: 0, rect: R(1, 5, 1), inset: "top" },
      { kind: "filler", text: 0, rect: R(1, 5, 2), align: "end" },
    ],
  },
  // Narrow photo on the right, roomy band; two bare stories stack in the notch.
  sideRightNarrow: {
    cards: 1, fillers: 2, rows: 3, lastSide: "right",
    pieces: [
      { kind: "photo", card: 0, rect: R(7, 6, 1, 3) },
      { kind: "band", card: 0, rect: R(1, 9, 2), inset: "bottom" },
      { kind: "text", card: 0, rect: R(1, 6, 2), inset: "bottom" },
      { kind: "filler", text: 0, rect: R(1, 6, 1), align: "end" },
      { kind: "filler", text: 1, rect: R(1, 6, 3), align: "start" },
    ],
  },
  sideLeftNarrow: {
    cards: 1, fillers: 2, rows: 3, lastSide: "left",
    pieces: [
      { kind: "photo", card: 0, rect: R(1, 6, 1, 3) },
      { kind: "band", card: 0, rect: R(4, 9, 2), inset: "bottom" },
      { kind: "text", card: 0, rect: R(7, 6, 2), inset: "bottom" },
      { kind: "filler", text: 0, rect: R(7, 6, 1), align: "end" },
      { kind: "filler", text: 1, rect: R(7, 6, 3), align: "start" },
    ],
  },
  // Wide photo across most of the page, a small band hanging off its corner.
  wideRight: {
    cards: 1, fillers: 1, rows: 3, lastSide: "right",
    pieces: [
      { kind: "photo", card: 0, rect: R(3, 10, 1, 2) },
      { kind: "band", card: 0, rect: R(1, 8, 3), inset: "up" },
      { kind: "text", card: 0, rect: R(1, 8, 3), inset: "up", place: "below" },
      { kind: "filler", text: 0, rect: R(9, 4, 3), align: "end" },
    ],
  },
  wideLeft: {
    cards: 1, fillers: 1, rows: 3, lastSide: "left",
    pieces: [
      { kind: "photo", card: 0, rect: R(1, 10, 1, 2) },
      { kind: "band", card: 0, rect: R(5, 8, 3), inset: "up" },
      { kind: "text", card: 0, rect: R(5, 8, 3), inset: "up", place: "below" },
      { kind: "filler", text: 0, rect: R(1, 4, 3), align: "end" },
    ],
  },
  // Photo right, band from the left tucks under it; a bare story fills the notch below the band.
  sideRight: {
    cards: 1, fillers: 1, rows: 2, lastSide: "right",
    pieces: [
      { kind: "photo", card: 0, rect: R(5, 8, 1, 2) },
      { kind: "band", card: 0, rect: R(1, 7, 1), inset: "top" },
      { kind: "text", card: 0, rect: R(1, 4, 1), inset: "top" },
      { kind: "filler", text: 0, rect: R(1, 4, 2), align: "end" },
    ],
  },
  sideLeft: {
    cards: 1, fillers: 1, rows: 2, lastSide: "left",
    pieces: [
      { kind: "photo", card: 0, rect: R(1, 8, 1, 2) },
      { kind: "band", card: 0, rect: R(6, 7, 1), inset: "top" },
      { kind: "text", card: 0, rect: R(9, 4, 1), inset: "top" },
      { kind: "filler", text: 0, rect: R(9, 4, 2), align: "end" },
    ],
  },
  // Title below: the band is wider than the photo and pokes out beside its lower half.
  belowLeft: {
    cards: 1, fillers: 2, rows: 3, lastSide: "left",
    pieces: [
      { kind: "photo", card: 0, rect: R(1, 8, 1, 2) },
      { kind: "band", card: 0, rect: R(1, 10, 3), inset: "up" },
      { kind: "text", card: 0, rect: R(1, 8, 3), inset: "up", place: "below" },
      { kind: "filler", text: 0, rect: R(9, 4, 1), align: "start" },
      { kind: "filler", text: 1, rect: R(9, 4, 2), align: "end" },
    ],
  },
  belowRight: {
    cards: 1, fillers: 2, rows: 3, lastSide: "right",
    pieces: [
      { kind: "photo", card: 0, rect: R(5, 8, 1, 2) },
      { kind: "band", card: 0, rect: R(3, 10, 3), inset: "up" },
      { kind: "text", card: 0, rect: R(5, 8, 3), inset: "up", place: "below" },
      { kind: "filler", text: 0, rect: R(1, 4, 1), align: "start" },
      { kind: "filler", text: 1, rect: R(1, 4, 2), align: "end" },
    ],
  },
  // Title above: band across the top, photo drops out of its right side; a tab of band shows left of the photo.
  aboveRight: {
    cards: 1, fillers: 2, rows: 3, lastSide: "right",
    pieces: [
      { kind: "band", card: 0, rect: R(1, 11, 1) },
      { kind: "text", card: 0, rect: R(1, 11, 1), place: "above" },
      { kind: "photo", card: 0, rect: R(5, 8, 2, 2), up: true },
      { kind: "filler", text: 0, rect: R(1, 4, 2), align: "start" },
      { kind: "filler", text: 1, rect: R(1, 4, 3), align: "end" },
    ],
  },
  aboveLeft: {
    cards: 1, fillers: 2, rows: 3, lastSide: "left",
    pieces: [
      { kind: "band", card: 0, rect: R(2, 11, 1) },
      { kind: "text", card: 0, rect: R(2, 11, 1), place: "above" },
      { kind: "photo", card: 0, rect: R(1, 8, 2, 2), up: true },
      { kind: "filler", text: 0, rect: R(9, 4, 2), align: "start" },
      { kind: "filler", text: 1, rect: R(9, 4, 3), align: "end" },
    ],
  },
  // Two cards locked together: A's band comes out from under its photo to the right,
  // B's band runs back left under B's photo, bare stories in the two outer corners.
  zigLeft: {
    cards: 2, fillers: 2, rows: 4, lastSide: "right",
    pieces: [
      { kind: "photo", card: 0, rect: R(1, 7, 1, 2) },
      { kind: "band", card: 0, rect: R(5, 8, 2), inset: "bottom" },
      { kind: "text", card: 0, rect: R(8, 5, 2), inset: "bottom" },
      { kind: "filler", text: 0, rect: R(8, 5, 1), align: "center" },
      { kind: "photo", card: 1, rect: R(6, 7, 3, 2) },
      { kind: "band", card: 1, rect: R(1, 9, 3), inset: "top" },
      { kind: "text", card: 1, rect: R(1, 5, 3), inset: "top" },
      { kind: "filler", text: 1, rect: R(1, 5, 4), align: "center" },
    ],
  },
  zigRight: {
    cards: 2, fillers: 2, rows: 4, lastSide: "left",
    pieces: [
      { kind: "photo", card: 0, rect: R(6, 7, 1, 2) },
      { kind: "band", card: 0, rect: R(1, 8, 2), inset: "bottom" },
      { kind: "text", card: 0, rect: R(1, 5, 2), inset: "bottom" },
      { kind: "filler", text: 0, rect: R(1, 5, 1), align: "center" },
      { kind: "photo", card: 1, rect: R(1, 7, 3, 2) },
      { kind: "band", card: 1, rect: R(4, 9, 3), inset: "top" },
      { kind: "text", card: 1, rect: R(8, 5, 3), inset: "top" },
      { kind: "filler", text: 1, rect: R(8, 5, 4), align: "center" },
    ],
  },
};

const PATTERNS_AFTER: Record<Side, string[]> = {
  // After a photo on the right, prefer the next photo on the left.
  right: ["sideLeft", "sideLeftNarrow", "belowLeft", "aboveLeft", "zigLeft", "wideLeft"],
  left: ["sideRight", "sideRightNarrow", "belowRight", "aboveRight", "zigRight", "wideRight"],
};

type PlacedPiece =
  | { kind: "photo"; card: Placed; rect: Rect; priority: boolean; up?: boolean }
  | { kind: "band"; card: Placed; rect: Rect; inset?: "top" | "bottom" | "up" }
  | { kind: "text"; card: Placed; rect: Rect; inset?: "top" | "bottom" | "up"; place?: "above" | "below"; size: "m" | "l" | "xl"; priority: boolean }
  | { kind: "filler"; text: Placed; rect: Rect; align: "start" | "center" | "end"; size: FloatSize };

/** Lay the cards out: chain patterns down the grid, zigzagging, until the cards run out. */
function tile(cards: Placed[], texts: Placed[]): PlacedPiece[] {
  const out: PlacedPiece[] = [];
  const cardQ = [...cards];
  const textQ = [...texts];
  let row = 1;
  let side: Side = "left"; // so the lead goes photo-right
  let first = true;
  while (cardQ.length) {
    const rng = seeded(hashString(`tile:${cardQ[0].article.id}`));
    let name: string = first ? "lead" : pick(rng, PATTERNS_AFTER[side]);
    if (PATTERNS[name].cards > cardQ.length) name = side === "right" ? "sideLeft" : "sideRight";
    const pat: Pattern = PATTERNS[name];
    const batchCards = cardQ.splice(0, pat.cards);
    for (const piece of pat.pieces) {
      const rect = { ...piece.rect, row: piece.rect.row + row - 1 };
      if (piece.kind === "filler") {
        const text = textQ.shift();
        if (!text) continue;
        out.push({ kind: "filler", text, rect, align: piece.align, size: pick(rng, ["s", "m", "m", "l", piece.rect.span >= 5 ? "xl" : "m"] as const) });
      } else if (piece.kind === "photo") {
        out.push({ kind: "photo", card: batchCards[piece.card], rect, priority: first, up: piece.up });
      } else if (piece.kind === "band") {
        out.push({ kind: "band", card: batchCards[piece.card], rect, inset: piece.inset });
      } else {
        // Titles run bigger when they have room: the lead, and any text piece spanning most of the width.
        const size = first ? "xl" : piece.rect.span >= 8 ? pick(rng, ["l", "xl"] as const) : pick(rng, ["m", "m", "l"] as const);
        out.push({ kind: "text", card: batchCards[piece.card], rect, inset: piece.inset, place: piece.place, size, priority: first });
      }
    }
    row += pat.rows;
    side = pat.lastSide;
    first = false;
  }
  // Leftover bare stories: loose rows of two or three.
  while (textQ.length) {
    const rng = seeded(hashString(`loose:${textQ[0].article.id}`));
    const n = Math.min(textQ.length, pick(rng, [2, 3, 3]));
    const lanes = n === 1 ? [[2, 6]] : n === 2 ? pick(rng, [[[1, 5], [8, 4]], [[2, 4], [7, 5]]]) : [[1, 4], [5, 4], [9, 4]];
    textQ.splice(0, n).forEach((text, j) => {
      out.push({ kind: "filler", text, rect: R(lanes[j][0], lanes[j][1], row), align: pick(rng, ["start", "center", "end"] as const), size: pick(rng, ["s", "m", "m", "l"] as const) });
    });
    row += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rendering

const gridArea = (r: Rect): React.CSSProperties => ({ gridColumn: `${r.col} / span ${r.span}`, gridRow: `${r.row} / span ${r.rows}` });

/** How a piece shifts out of its cells so it overlaps a neighbour: top/bottom make a photo overhang a band; up pulls a band over a photo's lower edge. */
const INSET = { top: "md:mt-10", bottom: "md:mb-10", up: "md:-mt-16", none: "" } as const;
/** Extra padding so text keeps clear of the photo it overlaps. */
const TEXT_PAD = { up: "md:pt-24", above: "md:pb-20", none: "" } as const;

function Photo({ piece, slot }: { piece: Extract<PlacedPiece, { kind: "photo" }>; slot: number | null }) {
  const a = piece.card.article;
  return (
    <TransitionLink
      href={getArticleUrl(a)}
      style={gridArea(piece.rect)}
      data-homepage-layout="leo"
      data-homepage-slot={slot ?? undefined}
      className={`relative z-10 block min-w-0 self-start ${piece.up ? "md:-mt-16" : ""}${a.isFollytechnic ? " follytechnic" : ""}`}
    >
      <Image
        src={(a.imageFull || a.image)!}
        alt={a.imageTitle || ""}
        width={0}
        height={0}
        priority={piece.priority}
        sizes="(max-width: 768px) 100vw, 800px"
        className="block h-auto w-full"
      />
    </TransitionLink>
  );
}

function Band({ piece, band }: { piece: Extract<PlacedPiece, { kind: "band" }>; band: BandColors | null | undefined }) {
  return (
    <div
      aria-hidden
      style={{ ...gridArea(piece.rect), "--band": band?.light ?? "#000", "--band-dark": band?.dark ?? "#fff" } as React.CSSProperties}
      className={`hidden md:block relative z-0 bg-[var(--band)] dark:bg-[var(--band-dark)] ${INSET[piece.inset ?? "none"]}`}
    />
  );
}

function BandText({
  piece,
  band,
  showSubdeck,
  slot,
}: {
  piece: Extract<PlacedPiece, { kind: "text" }>;
  band: BandColors | null | undefined;
  showSubdeck: boolean;
  slot: number | null;
}) {
  const a = piece.card.article;
  const wide = piece.place === "above"; // text runs the band's full width: let the title breathe
  return (
    <TransitionLink
      href={getArticleUrl(a)}
      style={{ ...gridArea(piece.rect), "--band": band?.light ?? "#000", "--band-dark": band?.dark ?? "#fff" } as React.CSSProperties}
      data-homepage-layout="leo"
      data-homepage-slot={slot ?? undefined}
      className={`group relative z-20 flex min-w-0 flex-col justify-center bg-[var(--band)] px-6 py-7 text-white dark:bg-[var(--band-dark)] dark:text-black md:bg-transparent md:px-8 md:py-8 md:dark:bg-transparent ${
        INSET[piece.inset ?? "none"]
      } ${TEXT_PAD[piece.inset === "up" ? "up" : piece.place === "above" ? "above" : "none"]}${a.isFollytechnic ? " follytechnic" : ""}`}
    >
      <div className="font-meta font-bold uppercase text-[13px] md:text-[14px] tracking-[0.04em] leading-none">{sectionLabel(a)}</div>
      <h2
        data-marauders-title={piece.priority ? true : undefined}
        className={`mt-3 font-copy font-normal leading-[1.08] tracking-[-0.015em] [overflow-wrap:anywhere] group-hover:underline decoration-1 underline-offset-4 ${
          wide ? "max-w-[22ch] " : ""
        }${
          piece.size === "xl"
            ? "text-[32px] md:text-[40px] xl:text-[52px] leading-[1.02]"
            : piece.size === "l"
              ? "text-[28px] md:text-[32px] xl:text-[38px]"
              : "text-[24px] xl:text-[27px]"
        }`}
      >
        {a.richTitle || a.title}
      </h2>
      {showSubdeck && a.excerpt && (
        <p className={`mt-3 font-meta text-[16px] xl:text-[17px] leading-[1.45] [text-wrap:pretty] ${wide ? "max-w-[60ch]" : ""}`}>{a.excerpt}</p>
      )}
      {authorText(a) && <p className="mt-4 font-ui text-[13px] md:text-[14px]">{authorText(a)}</p>}
    </TransitionLink>
  );
}

/** A story without a photo: bare text, no background, floating in a notch. */
function FloatItem({ piece, slot }: { piece: Extract<PlacedPiece, { kind: "filler" }>; slot: number | null }) {
  const a = piece.text.article;
  const isOpinion = a.section === "opinion";
  const size = piece.size;
  const align = { start: "md:justify-start", center: "md:justify-center", end: "md:justify-end" }[piece.align];
  return (
    <div style={gridArea(piece.rect)} className={`flex min-w-0 flex-col px-6 py-6 md:px-7 ${align}`} data-homepage-layout="leo" data-homepage-slot={slot ?? undefined}>
      <TransitionLink href={getArticleUrl(a)} className={`group block min-w-0 cursor-pointer${a.isFollytechnic ? " follytechnic" : ""}`}>
        <div className="font-meta font-bold uppercase text-accent dark:text-white text-[12px] md:text-[13px] tracking-[0.06em] leading-none">
          {isOpinion ? (authorText(a) ?? "Opinion") : sectionLabel(a)}
        </div>
        <h3
          className={`mt-2 font-copy font-normal text-text-main leading-[1.12] tracking-[-0.01em] [overflow-wrap:anywhere] group-hover:underline decoration-1 underline-offset-4 ${
            isOpinion ? "italic" : ""
          } ${
            size === "xl"
              ? "text-[30px] xl:text-[40px] leading-[1.05]"
              : size === "l"
                ? "text-[26px] xl:text-[30px]"
                : size === "m"
                  ? "text-[22px] xl:text-[25px]"
                  : "text-[19px] xl:text-[21px]"
          }`}
        >
          {a.richTitle || a.title}
        </h3>
        {(size === "l" || size === "xl") && a.excerpt && <p className="mt-3 font-copy text-text-main text-[16px] xl:text-[17px] leading-[1.5] line-clamp-3">{a.excerpt}</p>}
        {!isOpinion && authorText(a) && <p className="mt-2 font-ui text-[13px] text-text-muted">{authorText(a)}</p>}
      </TransitionLink>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function LeoHomepage({
  lead,
  stories,
  opinion,
  railFeatures,
  bands = {},
  showSubdeckLead = true,
  showSubdeckStories = [],
  showSubdeckRail = [],
}: {
  lead: Article;
  stories: Article[];
  opinion: Article[];
  railFeatures: Article[];
  /** Band colours per article id, sampled from each photo. */
  bands?: Record<string, BandColors | null>;
  showSubdeckLead?: boolean;
  showSubdeckStories?: boolean[];
  showSubdeckRail?: boolean[];
  sectionBlocks?: React.ReactNode;
}) {
  // Slot bookkeeping so the admin editor and analytics still line up.
  const slotOf = new Map<string, number | null>([[String(lead.id), getSlotNumber("leo", "lead")]]);
  const subdeckOf = new Map<string, boolean>([[String(lead.id), showSubdeckLead]]);
  stories.forEach((a, i) => {
    slotOf.set(String(a.id), getSlotNumber("leo", `left-${i}`));
    subdeckOf.set(String(a.id), showSubdeckStories[i] !== false);
  });
  railFeatures.forEach((a, i) => {
    slotOf.set(String(a.id), getSlotNumber("leo", `bottom-${i}`));
    subdeckOf.set(String(a.id), showSubdeckRail[i] !== false);
  });
  opinion.forEach((a, i) => slotOf.set(String(a.id), getSlotNumber("leo", `right-${i}`)));

  // Photo stories, lead first, with the rail features spread among them.
  const photoOrder: Article[] = [lead];
  const rail = [...railFeatures];
  stories.forEach((a, i) => {
    photoOrder.push(a);
    if (i % 2 === 1 && rail.length) photoOrder.push(rail.shift()!);
  });
  photoOrder.push(...rail);

  const cards: Placed[] = [];
  const texts: Placed[] = [];
  for (const a of photoOrder) {
    (hasPhoto(a) ? cards : texts).push({ article: a, slot: slotOf.get(String(a.id)) ?? null });
  }
  // Opinion is always bare text, in the notches.
  texts.push(...opinion.map((a) => ({ article: a, slot: slotOf.get(String(a.id)) ?? null })));

  const pieces = tile(cards, texts);

  return (
    <div className="homepage-zodiac w-full bg-bg-main text-text-main transition-colors duration-300">
      <div data-frontpage-top className="mx-auto max-w-[1280px] px-4 pb-24 pt-2 md:px-6 md:pt-4 xl:px-[30px]">
        <div className="flex flex-col gap-8 md:grid md:grid-cols-12 md:gap-x-0 md:gap-y-7">
          {pieces.map((piece, i) => {
            if (piece.kind === "photo") return <Photo key={`p${i}`} piece={piece} slot={piece.card.slot} />;
            if (piece.kind === "band") return <Band key={`b${i}`} piece={piece} band={bands[String(piece.card.article.id)]} />;
            if (piece.kind === "text")
              return (
                <BandText
                  key={`t${i}`}
                  piece={piece}
                  slot={piece.card.slot}
                  band={bands[String(piece.card.article.id)]}
                  showSubdeck={subdeckOf.get(String(piece.card.article.id)) !== false}
                />
              );
            return <FloatItem key={`f${i}`} piece={piece} slot={piece.text.slot} />;
          })}
        </div>
      </div>
    </div>
  );
}

export default LeoHomepage;
