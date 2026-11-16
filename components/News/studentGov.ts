/**
 * Student Government (Senate / Executive Board) shared definitions, used by
 * the /news box, the timeline pages, the dashboard editor and the server
 * loader in lib/studentGovTimeline.ts. Safe to import from client code.
 */
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { newsCategories } from "./newsCategories";

export type StudentGovBody = "senate" | "eboard";

export const STUDENT_GOV_BODIES: StudentGovBody[] = ["senate", "eboard"];

const [SENATE_KICKER, EBOARD_KICKER] = newsCategories.studentGov.kickers;

export const STUDENT_GOV: Record<
  StudentGovBody,
  {
    /** Heading in the /news box */
    label: string;
    /** Full name: timeline page title */
    title: string;
    /** The kicker as editors write it now */
    kicker: string;
    /**
     * News articles whose whole kicker matches go on the timeline on their
     * own. Any capitalisation: the archive has "STUDENT SENATE", "SENATE",
     * "EXECUTIVE BOARD", "E-BOARD" and so on. "Faculty Senate" doesn't match.
     */
    kickerPattern: RegExp;
    /** Words a matching kicker contains, to narrow the database query first */
    kickerQuery: string[];
    /**
     * What the archive finder searches for when no search is typed: stories
     * about this body filed under other kickers, which editors add by hand
     */
    archiveTerms: string[];
    /** Finder results to leave out unless their kicker matches */
    archiveExclude: RegExp | null;
    href: string;
    /** When and where the body meets, beside the top month on its timeline */
    meets: string;
  }
> = {
  senate: {
    label: "Senate",
    title: "Student Senate",
    kicker: SENATE_KICKER,
    kickerPattern: /^\s*(student\s+)?senate\s*$/i,
    kickerQuery: ["senate"],
    archiveTerms: ["student senate", "senate", "senator", "grand marshal"],
    archiveExclude: /faculty senate/i,
    href: "/news/student-government/senate",
    meets: "Mondays · 7 p.m. · Shelnutt Gallery",
  },
  eboard: {
    label: "Executive Board",
    title: "Executive Board",
    kicker: EBOARD_KICKER,
    kickerPattern: /^\s*(executive\s+board|e-?board)\s*$/i,
    kickerQuery: ["board"],
    archiveTerms: ["executive board", "e-board", "eboard", "president of the union"],
    archiveExclude: null,
    href: "/news/student-government/e-board",
    meets: "Tuesdays · 7 p.m. · Union 3202",
  },
};

/** True when a kicker puts an article on this body's timeline by itself */
export const matchesKicker = (body: StudentGovBody, kicker: string | null | undefined) =>
  Boolean(kicker && STUDENT_GOV[body].kickerPattern.test(kicker));

/** Anchor for an update on its timeline page, so bullets can link to it */
export const updateAnchor = (id: number | string) => `update-${id}`;

/** Section id for a month on a timeline page ("2026-11" → "month-2026-11") */
export const monthSectionId = (key: string) => `month-${key}`;

/** One entry on a timeline: an article with the body's kicker, or an update */
export type TimelineItem =
  | { kind: "article"; id: number | string; date: string; article: ComponentArticle }
  | { kind: "update"; id: number | string; date: string; title: string; blurb: string };

/** What a box in the Student Government column shows */
export type StudentGovBoxMode = "timeline" | "article";

export type StudentGovBoxConfig = {
  /** "timeline": latest bullets from the timeline; "article": one pinned story */
  mode: StudentGovBoxMode;
  /** Pinned story for "article" mode */
  article: number | null;
  /**
   * Entries always shown in "timeline" mode. With 2, a third appears when
   * the column would otherwise end short of the lead's.
   */
  count: 2 | 3;
};

export type StudentGovLayout = {
  /** Which box is on top */
  order: [StudentGovBody, StudentGovBody];
  senate: StudentGovBoxConfig;
  eboard: StudentGovBoxConfig;
};

/** Most entries a box shows; the editor's `count` is how many it always shows */
export const STUDENT_GOV_BOX_MAX = 3;

export const DEFAULT_BOX: StudentGovBoxConfig = { mode: "timeline", article: null, count: 3 };

export const DEFAULT_STUDENT_GOV_LAYOUT: StudentGovLayout = {
  order: ["senate", "eboard"],
  senate: DEFAULT_BOX,
  eboard: DEFAULT_BOX,
};

/** Fills in defaults for anything missing or invalid in a saved layout */
export function normalizeStudentGovLayout(raw: unknown): StudentGovLayout {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<string, unknown>>;
  const box = (b: unknown): StudentGovBoxConfig => {
    const v = (b && typeof b === "object" ? b : {}) as Partial<StudentGovBoxConfig>;
    return {
      mode: v.mode === "article" ? "article" : "timeline",
      article: typeof v.article === "number" ? v.article : null,
      count: v.count === 2 ? 2 : 3,
    };
  };
  const order: [StudentGovBody, StudentGovBody] =
    Array.isArray(value.order) && value.order[0] === "eboard" ? ["eboard", "senate"] : ["senate", "eboard"];
  return { order, senate: box(value.senate), eboard: box(value.eboard) };
}
