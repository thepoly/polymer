import type { Article as ComponentArticle } from '@/components/FrontPage/types';

/**
 * Shape and defaults for the curated /news layout.
 *
 * Plain module on purpose: the section route (server) and both the page and the
 * News Layout editor (client) all read these. Importing values out of a
 * `"use client"` module from a server component yields client references rather
 * than the values themselves, so the constants have to live here.
 */

/* ── Slot counts — the editor and the page must agree ── */

export const TOP_ROW_SLOTS = 3;
export const COLUMN_COUNT = 3;
export const COLUMN_SLOTS = 4;
export const BOTTOM_SLOTS = 5;

/** Every slot the layout can place, used to size the article pool. */
export const NEWS_LAYOUT_CAPACITY =
  1 + TOP_ROW_SLOTS + COLUMN_COUNT * COLUMN_SLOTS + BOTTOM_SLOTS;

/* ── Default headings ──
   Editors rename these per issue in the News Layout editor; these are only what
   a never-edited layout starts with. */

export const DEFAULT_TOP_ROW_LABEL = 'Student Government';

export const DEFAULT_COLUMN_LABELS = [
  'Campus Infrastructure',
  'Interviews',
  'Press Releases',
];

export const DEFAULT_BOTTOM_LABEL = 'More in News';

/* ── Stored layout (the `layout` JSON column on news-page-layout) ── */

export type NewsLayoutColumn = {
  label: string;
  articles: (number | null)[];
  images: boolean[];
};

export type NewsLayoutJson = {
  topStory: (number | null)[];
  studentGovLabel: string;
  studentGov: (number | null)[];
  studentGovImages: boolean[];
  columns: NewsLayoutColumn[];
  bottomLabel: string;
  bottom: (number | null)[];
};

export const EMPTY_NEWS_LAYOUT_JSON: NewsLayoutJson = {
  topStory: [null],
  studentGovLabel: DEFAULT_TOP_ROW_LABEL,
  studentGov: Array(TOP_ROW_SLOTS).fill(null),
  studentGovImages: Array(TOP_ROW_SLOTS).fill(false),
  columns: DEFAULT_COLUMN_LABELS.map((label) => ({
    label,
    articles: Array(COLUMN_SLOTS).fill(null),
    images: Array(COLUMN_SLOTS).fill(false),
  })),
  bottomLabel: DEFAULT_BOTTOM_LABEL,
  bottom: Array(BOTTOM_SLOTS).fill(null),
};

/* ── Layout resolved by the route: curated articles per region, plus headings ── */

export type NewsLayoutContent = {
  topStory: ComponentArticle | null;
  topRowLabel: string;
  topRow: ComponentArticle[];
  topRowImages: boolean[];
  columns: Array<{ label: string; articles: ComponentArticle[]; images: boolean[] }>;
  bottomLabel: string;
  bottom: ComponentArticle[];
};

export const DEFAULT_NEWS_LAYOUT_CONTENT: NewsLayoutContent = {
  topStory: null,
  topRowLabel: DEFAULT_TOP_ROW_LABEL,
  topRow: [],
  topRowImages: [],
  columns: DEFAULT_COLUMN_LABELS.map((label) => ({ label, articles: [], images: [] })),
  bottomLabel: DEFAULT_BOTTOM_LABEL,
  bottom: [],
};
