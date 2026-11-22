/**
 * The Features page layout, as stored in the `features-page-layout` JSON
 * field. Shared by the page (server) and the layout editor (client), so it
 * imports nothing from either.
 *
 * Every slot is optional: an empty slot fills from the newest stories. The
 * layout only has to be touched when an editor wants something specific, and
 * the rules in `lib/featuresPage.ts` keep a forgotten pin from freezing the
 * page.
 */

/** A photo in The Lens, picked from a story in the editor */
export type LensPhoto = {
  url: string;
  caption?: string;
  articleTitle?: string;
  articleUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
  /** When the editor added it (ISO). Older saves have none. */
  addedAt?: string;
};

export type FeaturesLayout = {
  version: 2;
  /** Full-width cover story */
  cover: (number | null)[];
  /** The big story beside The Lens */
  second: (number | null)[];
  /** Two wide strips under them */
  strips: (number | null)[];
  /** The Photo Stories row, in order */
  photoStories: (number | null)[];
  /** The photo each Photo Story shows (a URL from that story), else its lead photo */
  photoStoryImages: (string | null)[];
  /** The Lens: one of these shows each day, in turn */
  lens: LensPhoto[];
};

export const FEATURES_SLOT_COUNTS = {
  cover: 1,
  second: 1,
  strips: 2,
  photoStories: 3,
} as const;

export type FeaturesSlotKey = keyof typeof FEATURES_SLOT_COUNTS;

export const EMPTY_FEATURES_LAYOUT: FeaturesLayout = {
  version: 2,
  cover: [null],
  second: [null],
  strips: [null, null],
  photoStories: [null, null, null],
  photoStoryImages: [null, null, null],
  lens: [],
};

const ids = (value: unknown, length: number): (number | null)[] => {
  const list = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, i) => {
    const id = list[i];
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  });
};

const urls = (value: unknown, length: number): (string | null)[] => {
  const list = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, i) => (typeof list[i] === 'string' && list[i] ? (list[i] as string) : null));
};

const photos = (value: unknown): LensPhoto[] =>
  (Array.isArray(value) ? value : []).filter(
    (p): p is LensPhoto => Boolean(p) && typeof p === 'object' && typeof (p as LensPhoto).url === 'string',
  );

/**
 * Reads any saved layout. Layouts saved by the old three-column editor are
 * carried over: its hero and sub-features become the cover, second story and
 * strips, its Photo Spotlight becomes The Lens, and its spotlight stories
 * become Photo Stories. Its On Campus, Latest and Arts pins are dropped.
 */
export function normalizeFeaturesLayout(raw: unknown): FeaturesLayout {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FEATURES_LAYOUT, lens: [] };
  const r = raw as Record<string, unknown>;

  if (r.version === 2) {
    return {
      version: 2,
      cover: ids(r.cover, FEATURES_SLOT_COUNTS.cover),
      second: ids(r.second, FEATURES_SLOT_COUNTS.second),
      strips: ids(r.strips, FEATURES_SLOT_COUNTS.strips),
      photoStories: ids(r.photoStories, FEATURES_SLOT_COUNTS.photoStories),
      photoStoryImages: urls(r.photoStoryImages, FEATURES_SLOT_COUNTS.photoStories),
      lens: photos(r.lens),
    };
  }

  const featured = ids(r.featured, 3);
  const wide = ids(r.wideArticle, 1);
  const subs = ids(r.spotlightSubs, 2);
  return {
    version: 2,
    cover: [featured[0]],
    second: [featured[1]],
    strips: [featured[2], wide[0]],
    photoStories: [subs[0], subs[1], null],
    photoStoryImages: [null, null, null],
    lens: photos(r.photoSpotlight),
  };
}
