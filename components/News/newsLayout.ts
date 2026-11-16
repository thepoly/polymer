/**
 * Shared shape of the news section page layout, stored as JSON in the
 * `news-page-layout` collection (see collections/NewsPageLayout.ts). Used by
 * the dashboard editor, the section route and the page components.
 */
import type { StudentGovLayout } from './studentGov';
import { NEWS_TOPICS, TOPIC_CARDS, type NewsTopicKey } from './newsTopics';
import {
  normalizeFrame,
  type FrameStyle,
  type PhotoFrame,
  type TimelinePagesLayout,
} from './timelinePage';

/**
 * Where the lead story's text (kicker, headline, byline, subdeck) sits
 * relative to its photo on desktop:
 * - north: above the photo
 * - south: below the photo
 * - east: to the right of the photo
 * - west: to the left of the photo
 */
/**
 * Date for a byline on /news: always the full publish date ("November 13,
 * 2026"), unlike the rest of the site, which shows "2 DAYS AGO" for a week
 * and then nothing. Fixed to Troy's time zone so server and browser agree.
 */
export function newsBylineDate(article: { publishedDate?: string | null; isoDate?: string | null }): string | null {
  const iso = article.publishedDate || article.isoDate;
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

/** "Contact" link in the /news header: emails the news editor and the EIC */
export const NEWS_CONTACT_MAILTO =
  'mailto:news@poly.rpi.edu,eic@poly.rpi.edu?subject=News%2C%20Request%2FComment';

export type LeadTextPosition = 'north' | 'south' | 'east' | 'west' | 'overlay';

export const LEAD_TEXT_POSITIONS: { value: LeadTextPosition; label: string; hint: string }[] = [
  { value: 'north', label: 'North', hint: 'Text above the photo' },
  { value: 'south', label: 'South', hint: 'Text below the photo' },
  { value: 'east', label: 'East', hint: 'Text right of the photo' },
  { value: 'west', label: 'West', hint: 'Text left of the photo' },
  { value: 'overlay', label: 'Overlay', hint: 'Text over the photo' },
];

export const DEFAULT_LEAD_TEXT_POSITION: LeadTextPosition = 'west';

export const isLeadTextPosition = (value: unknown): value is LeadTextPosition =>
  LEAD_TEXT_POSITIONS.some((p) => p.value === value);

/**
 * How the lead photo is cropped: the point kept in view and the zoom, for
 * computers and for phones. It belongs to one story's photo (`article`), so a
 * new lead starts from its own photo's focal point again.
 */
export type LeadFrame = {
  article: number;
  /** Computers and tablets; null uses the photo's focal point, not zoomed */
  desktop: PhotoFrame | null;
  /** Phones; null matches the computer framing */
  mobile: PhotoFrame | null;
};

export function normalizeLeadFrame(raw: unknown): LeadFrame | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as { article?: unknown; desktop?: unknown; mobile?: unknown };
  if (typeof v.article !== 'number') return null;
  const desktop = normalizeFrame(v.desktop);
  const mobile = normalizeFrame(v.mobile);
  return desktop || mobile ? { article: v.article, desktop, mobile } : null;
}

/**
 * Framing for the lead photo of `articleId`. `fallback` is the photo's own
 * focal point (CSS object-position), used where the editor set nothing or
 * the saved framing is for another story.
 */
export function leadFrameStyles(
  frame: LeadFrame | null | undefined,
  articleId: number | string,
  fallback: string | null | undefined,
): { desktop: FrameStyle; mobile: FrameStyle } {
  const own = frame && String(frame.article) === String(articleId) ? frame : null;
  const style = (f: PhotoFrame | null | undefined): FrameStyle | null =>
    f ? { position: `${f.x}% ${f.y}%`, zoom: f.zoom } : null;
  const desktop = style(own?.desktop) ?? { position: fallback || '50% 50%', zoom: 1 };
  return { desktop, mobile: style(own?.mobile) ?? desktop };
}

/** Strips under the lead an editor can pin: two at most are ever shown */
export const SECONDARY_SLOTS = 2;

/** Cards in the Featured row */
export const FEATURED_SLOTS = 4;

/** A saved list of pinned article ids, as exactly `slots` entries; null fills automatically */
const normalizeSlots = (raw: unknown, slots: number): (number | null)[] => {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: slots }, (_, i) => (typeof list[i] === 'number' ? (list[i] as number) : null));
};

/** Article ids pinned under the lead, one per slot */
export const normalizeSecondary = (raw: unknown) => normalizeSlots(raw, SECONDARY_SLOTS);

/** Article ids pinned in the Featured row, one per slot */
export const normalizeFeatured = (raw: unknown) => normalizeSlots(raw, FEATURED_SLOTS);

/** How the topic row's cards look */
export type TopicCardStyle = {
  /** Headline and byline over the bottom of the photo, white on a dark gradient */
  overlay: boolean;
  /** With the headline under the photo: show the subdeck under the byline */
  subdeck: boolean;
};

export const DEFAULT_TOPIC_CARDS: TopicCardStyle = { overlay: true, subdeck: false };

export function normalizeTopicCards(raw: unknown): TopicCardStyle {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TopicCardStyle, unknown>>;
  return {
    overlay: typeof v.overlay === 'boolean' ? v.overlay : DEFAULT_TOPIC_CARDS.overlay,
    subdeck: typeof v.subdeck === 'boolean' ? v.subdeck : DEFAULT_TOPIC_CARDS.subdeck,
  };
}

/**
 * Stories an editor chose for one topic tab. With `manual` off the tab shows
 * the topic's newest stories; the picks are kept so turning it back on
 * restores them. A null slot takes the next newest story in the topic.
 */
export type TopicPicks = { manual: boolean; articles: (number | null)[] };

export function normalizeTopicPicks(raw: unknown): Record<NewsTopicKey, TopicPicks> {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    NEWS_TOPICS.map((t) => {
      const p = (v[t.key] && typeof v[t.key] === 'object' ? v[t.key] : {}) as { manual?: unknown; articles?: unknown };
      return [t.key, { manual: p.manual === true, articles: normalizeSlots(p.articles, TOPIC_CARDS) }];
    }),
  ) as Record<NewsTopicKey, TopicPicks>;
}

export type NewsLayout = {
  /** Lead story, top left (two thirds of the page width). Null auto-fills. */
  lead: number | null;
  leadTextPosition: LeadTextPosition;
  /** Crop of the lead photo, set in the editor */
  leadFrame?: LeadFrame | null;
  /**
   * Stories pinned under the lead, first slot first. A null slot takes the
   * next newest story. How many slots show depends on the lead's layout.
   */
  secondary?: (number | null)[];
  /**
   * Stories pinned in the Featured row, left to right. A null slot takes the
   * next newest story with a photo.
   */
  featured?: (number | null)[];
  /** Topic row card style */
  topicCards?: TopicCardStyle;
  /** Per topic tab: the six newest, or stories the editor chose */
  topicPicks?: Partial<Record<NewsTopicKey, TopicPicks>>;
  /**
   * Senate and Executive Board bullets as larger headlines with no summary
   * (both boxes). Off: headline plus a two-line summary.
   */
  bulletsHeadlinesOnly?: boolean;
  /** Right column: Senate and Executive Board boxes */
  studentGov: StudentGovLayout;
  /** Senate and Executive Board timeline pages: photos, hidden entries, layouts */
  timelinePages?: TimelinePagesLayout;
};
