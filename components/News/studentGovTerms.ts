/**
 * Student Senate / Executive Board terms: GM Week to GM Week, not September
 * to May. Both bodies change over at GM Week in late March; a term starts at
 * the new body's first meeting (usually April) and runs to the day before the
 * next term's first meeting, so entries between GM Week and that meeting
 * still belong to the outgoing term.
 *
 * Shared by the timeline pages, the shelf, the dashboard editor and the
 * `student-gov-terms` collection. Safe to import from client code.
 */
import { STUDENT_GOV, updateAnchor, type StudentGovBody } from "./studentGov";
import { troyYearMonth } from "./timelinePage";

export type TermLeaderHow = "elected" | "runoff" | "appointed";

export type TermLeader = {
  name: string;
  /** 160 for the 160th Grand Marshal */
  ordinal: number | null;
  how: TermLeaderHow;
  /** Day it began ("2024-02-12"), for a mid-term change */
  startedOn: string | null;
};

export type StudentGovTerm = {
  /** Document id; synthesized terms use their slug */
  id: number | string;
  body: StudentGovBody;
  /** "senate-57" / "eboard-2026-27" */
  slug: string;
  /** Senate number (57th); null for the E-Board */
  number: number | null;
  /** Year the term starts in: 2026 for 2026–27 */
  startYear: number;
  /** First meeting, as a day ("2026-04-09") */
  startsOn: string;
  /** When the election that produced it was decided ("2026-03-27") */
  gmWeekOn: string | null;
  gmWeekStoryId: number | null;
  hasCoverage: boolean;
  leaders: TermLeader[];
  /**
   * Made up from entry dates because no terms have been entered yet: starts
   * April 1, no leaders. Its first-meeting date isn't shown.
   */
  approximate: boolean;
};

export const LEADER_TITLE: Record<StudentGovBody, string> = {
  senate: "Grand Marshal",
  eboard: "President of the Union",
};

/** URL segment per body under /news/student-government */
export const TERM_ROUTE: Record<StudentGovBody, string> = { senate: "senate", eboard: "e-board" };

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Calendar day of a date-only field ("2026-04-09T12:00:00.000Z" →
 * "2026-04-09"). Payload stores the picked day around midday or midnight
 * UTC, so the UTC date is the day that was picked.
 */
export const dateOnlyKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** Calendar day of a timestamp in Troy ("2026-04-09") */
export function troyDayKey(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(date));
}

/** "Apr 9, 2026" for a "2026-04-09" day */
export function formatDay(day: string, month: "short" | "long" = "short"): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const termStartYear = (startsOn: string) => Number(dateOnlyKey(startsOn).slice(0, 4));

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** 57 → "57th" */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** "2026–27" */
export const termYearLabel = (startYear: number) => `${startYear}–${String(startYear + 1).slice(-2)}`;

/** "senate-57" / "eboard-2026-27" (stored, unique) */
export function termSlug(body: StudentGovBody, number: number | null, startYear: number): string {
  return body === "senate" && number !== null
    ? `senate-${number}`
    : `${body}-${startYear}-${String(startYear + 1).slice(-2)}`;
}

/**
 * "57th Senate" / "2026–27" (short), "57th Senate · 2026–27" /
 * "E-Board 2026–27" (full)
 */
export function termName(
  body: StudentGovBody,
  number: number | null,
  startYear: number,
  style: "short" | "full",
): string {
  const year = termYearLabel(startYear);
  if (body === "senate" && number !== null) {
    return style === "short" ? `${ordinal(number)} Senate` : `${ordinal(number)} Senate · ${year}`;
  }
  return style === "short" ? year : `${body === "senate" ? "Senate" : "E-Board"} ${year}`;
}

export const termShortName = (t: StudentGovTerm) => termName(t.body, t.number, t.startYear, "short");
export const termFullName = (t: StudentGovTerm) => termName(t.body, t.number, t.startYear, "full");

/** "56" / "2025-26": the term's part of the URL */
export const termSegment = (t: StudentGovTerm) => t.slug.slice(t.body.length + 1);

/** Timeline page for a term; the current term lives at the body's own URL */
export const termHref = (t: StudentGovTerm, isCurrent: boolean) =>
  isCurrent ? STUDENT_GOV[t.body].href : `${STUDENT_GOV[t.body].href}/${termSegment(t)}`;

const lastName = (name: string) => name.trim().split(/\s+/).pop() ?? name;

/**
 * "Grand Marshal Jordan Krishnayah (160th)", or with a mid-term change
 * "President of the Union Ava Gallagher, then Catherine Philipps (135th)".
 * Each number shows when it's entered. Null when no leader has been entered.
 */
export function leaderLine(t: StudentGovTerm): string | null {
  const names = leaderNames(t);
  return names && `${LEADER_TITLE[t.body]} ${names}`;
}

/** leaderLine without the title: "Ava Gallagher, then Catherine Philipps (135th)" */
export function leaderNames(t: StudentGovTerm): string | null {
  const names = t.leaders
    .filter((l) => l.name.trim())
    .map((l) => (l.ordinal ? `${l.name.trim()} (${ordinal(l.ordinal)})` : l.name.trim()));
  return names.length > 0 ? names.join(", then ") : null;
}

/** "Kate Goldstein elected President of the Union" (GM Week marker) */
export function electedLine(t: StudentGovTerm): string {
  const leader = t.leaders[0];
  const title = LEADER_TITLE[t.body];
  if (!leader) return `New ${title} elected`;
  return `${leader.name} elected ${title}${leader.how === "runoff" ? " in a runoff" : ""}`;
}

/** "Philipps appointed 135th President of the Union" (mid-term divider) */
export function leaderChangeLine(t: StudentGovTerm, leader: TermLeader): string {
  const verb = leader.how === "appointed" ? "appointed" : "elected";
  const nth = leader.ordinal ? `${ordinal(leader.ordinal)} ` : "";
  return `${lastName(leader.name)} ${verb} ${nth}${LEADER_TITLE[t.body]}`;
}

// ---------------------------------------------------------------------------
// Loading and assignment
// ---------------------------------------------------------------------------

type RelationValue = number | { id: number } | null | undefined;
const relId = (v: RelationValue) => (v && typeof v === "object" ? v.id : typeof v === "number" ? v : null);

/** A `student-gov-terms` document (REST or local API, depth 0 or more) as a term */
export function normalizeTerm(doc: Record<string, unknown>): StudentGovTerm | null {
  const body = doc.body === "senate" || doc.body === "eboard" ? doc.body : null;
  if (!body || typeof doc.startsOn !== "string") return null;
  const startYear = termStartYear(doc.startsOn);
  const number = typeof doc.number === "number" ? doc.number : null;
  const leaders = Array.isArray(doc.leaders) ? (doc.leaders as Record<string, unknown>[]) : [];
  return {
    id: doc.id as number,
    body,
    slug: typeof doc.slug === "string" && doc.slug ? doc.slug : termSlug(body, number, startYear),
    number,
    startYear,
    startsOn: dateOnlyKey(doc.startsOn),
    gmWeekOn: typeof doc.gmWeekOn === "string" ? dateOnlyKey(doc.gmWeekOn) : null,
    gmWeekStoryId: relId(doc.gmWeekStory as RelationValue),
    hasCoverage: doc.hasCoverage !== false,
    leaders: leaders
      .filter((l) => typeof l.name === "string" && l.name.trim())
      .map((l) => ({
        name: (l.name as string).trim(),
        ordinal: typeof l.ordinal === "number" ? l.ordinal : null,
        how: l.how === "runoff" || l.how === "appointed" ? l.how : "elected",
        startedOn: typeof l.startedOn === "string" ? dateOnlyKey(l.startedOn) : null,
      })),
    approximate: false,
  };
}

/** Spring-to-spring year a date falls in, cutting over on April 1 */
function springYearOf(date: Date | string): number {
  const { year, month } = troyYearMonth(date);
  return month >= 4 ? year : year - 1;
}

/**
 * Stand-in terms for a body with none entered: one per spring-to-spring
 * year from the oldest entry to now, starting April 1. Senate numbers follow
 * the 47th (2016–17) and 57th (2026–27).
 */
export function synthesizeTerms(body: StudentGovBody, entryDates: string[], now: Date): StudentGovTerm[] {
  const current = springYearOf(now);
  const oldest = Math.min(current, ...entryDates.map(springYearOf));
  const terms: StudentGovTerm[] = [];
  for (let y = oldest; y <= current; y += 1) {
    const number = body === "senate" ? y - 1969 : null;
    const slug = termSlug(body, number, y);
    terms.push({
      id: slug,
      body,
      slug,
      number,
      startYear: y,
      startsOn: `${y}-04-01`,
      gmWeekOn: null,
      gmWeekStoryId: null,
      hasCoverage: true,
      leaders: [],
      approximate: true,
    });
  }
  return terms;
}

/**
 * Terms to use for a body, oldest first: the stored ones, or stand-ins when
 * none has started yet. May end with terms that haven't started (a new body
 * elected but not yet met).
 */
export function resolveTerms(
  stored: StudentGovTerm[],
  body: StudentGovBody,
  entryDates: string[],
  now: Date,
): StudentGovTerm[] {
  const today = troyDayKey(now);
  const own = stored.filter((t) => t.body === body).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return own.some((t) => t.startsOn <= today) ? own : synthesizeTerms(body, entryDates, now);
}

/**
 * Index of the term a date belongs to (terms oldest first): the last one
 * whose first meeting is on or before that day. -1 before the oldest term.
 */
export function termIndexOf(terms: StudentGovTerm[], date: Date | string): number {
  const day = troyDayKey(date);
  for (let i = terms.length - 1; i >= 0; i -= 1) {
    if (terms[i].startsOn <= day) return i;
  }
  return -1;
}

/** A docket update must link to the term that actually contains its anchor. */
export function updateTermHref(terms: StudentGovTerm[], date: string, id: number | string, now: Date): string | null {
  const today = troyDayKey(now);
  const term = terms[termIndexOf(terms, date)];
  if (!term || !term.hasCoverage || term.startsOn > today) return null;
  const current = terms.filter((t) => t.startsOn <= today).at(-1);
  return `${termHref(term, term === current)}#${updateAnchor(id)}`;
}


// ---------------------------------------------------------------------------
// Duplicate stories
// ---------------------------------------------------------------------------

/**
 * Identity of a story for spotting the archive's duplicate copies: the same
 * title (ignoring case and spacing) published the same day in Troy. The
 * legacy import left some stories in twice, often with different kicker
 * capitalisation.
 */
export const storyKey = (title: string, date: string) =>
  `${troyDayKey(date)}|${title.trim().replace(/\s+/g, " ").toLowerCase()}`;

/**
 * Keeps one copy of each story: the one with a photo, then the lowest id.
 * Order doesn't matter, so the page and the dashboard editor always keep the
 * same copy. Items `info` returns null for (updates) are always kept.
 */
export function dropDuplicateStories<T>(
  items: T[],
  info: (item: T) => { id: number; title: string; date: string; hasImage: boolean } | null,
): T[] {
  const best = new Map<string, { item: T; id: number; hasImage: boolean }>();
  for (const item of items) {
    const i = info(item);
    if (!i) continue;
    const key = storyKey(i.title, i.date);
    const prev = best.get(key);
    if (!prev || (i.hasImage && !prev.hasImage) || (i.hasImage === prev.hasImage && i.id < prev.id)) {
      best.set(key, { item, id: i.id, hasImage: i.hasImage });
    }
  }
  const keep = new Set([...best.values()].map((b) => b.item));
  return items.filter((item) => info(item) === null || keep.has(item));
}
