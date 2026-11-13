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
    /** Articles with this kicker belong on the timeline */
    kicker: string;
    href: string;
  }
> = {
  senate: {
    label: "Senate",
    title: "Student Senate",
    kicker: SENATE_KICKER,
    href: "/news/senate",
  },
  eboard: {
    label: "Executive Board",
    title: "Executive Board",
    kicker: EBOARD_KICKER,
    href: "/news/executive-board",
  },
};

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
  /** Bullets shown in "timeline" mode */
  count: 2 | 3;
};

export type StudentGovLayout = {
  /** Which box is on top */
  order: [StudentGovBody, StudentGovBody];
  senate: StudentGovBoxConfig;
  eboard: StudentGovBoxConfig;
};

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
