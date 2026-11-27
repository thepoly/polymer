import { NO_PITCH_POSITIONS, pitchPositionsOf, validatePitchPositions, type PitchPositions } from './pitchPhoto';

export const OPINION_LAYOUT_NAME = 'Opinion Layout';
export const MAX_OPINION_SLOTS = 20;
export const MAX_SPOTLIGHT_AUTHORS = 16;
/** Story slots each column starts with (editors can add more, up to MAX_OPINION_SLOTS) */
export const OPINION_COLUMN_SLOTS = 3;
/** Which slot shows its photo by default: column 1's lead, columns 2 and 3's last (column 3 must have one) */
const DEFAULT_IMAGE_SLOT = [0, 2, 2];
/**
 * 2: three slots per column. Layouts saved without it are from the 5/4/4
 * days and lose their trailing automatic slots when read.
 */
export const OPINION_LAYOUT_VERSION = 2;
export const columnKeys = ['column1', 'column2', 'column3'] as const;
export type OpinionColumn = typeof columnKeys[number];
export type OpinionSlotColumn = OpinionColumn | 'editorsChoice';
export type SpotlightEntry = { userId: number; articleTitle?: string | null; articleUrl?: string | null };
export type OpinionLayout = Record<OpinionColumn, (number | null)[]> & {
  version: typeof OPINION_LAYOUT_VERSION;
  column1Images: boolean[]; column2Images: boolean[]; column3Images: boolean[];
  editorsChoice: (number | null)[];
  editorsChoiceLabel: string;
  spotlight: SpotlightEntry[];
  /** A media id: the photo behind the guest-writer box. Not a story pin; without one the page uses the newest opinion photo. */
  pitch: number | null;
  /** Where that photo sits on each screen (lib/pitchPhoto); null follows its focal point */
  pitchPositions: PitchPositions;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const validId = (id: unknown): id is number => Number.isSafeInteger(id) && Number(id) > 0;
export const safeSpotlightUrl = (url: unknown): string | null => {
  if (typeof url !== 'string' || url.length > 2048 || /[\s\\]/.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? url : null; } catch { return null; }
};

/** Defensive read path for legacy, missing, and malformed saved data. */
export function normalizeOpinionLayout(value: unknown): OpinionLayout {
  const raw = record(value);
  const result = { editorsChoiceLabel: typeof raw.editorsChoiceLabel === 'string' ? raw.editorsChoiceLabel.slice(0, 100) : 'Opinion’s Choice' } as OpinionLayout;
  const seen = new Set<number>();
  const ids = (input: unknown, count: number) => Array.from({ length: count }, (_, i) => {
    const id = Array.isArray(input) ? input[i] : null;
    if (!validId(id) || seen.has(id)) return null;
    seen.add(id); return id;
  });
  // A layout saved before the columns went to three slots each (no version)
  // still carries the old 5/4/4 automatic slots: those trailing empty slots
  // are dropped, down to the new count. A slot with a pin is kept.
  const legacy = raw.version !== OPINION_LAYOUT_VERSION;
  for (const [i, key] of columnKeys.entries()) {
    const imagesKey = `${key}Images` as const;
    const pins = raw[key]; const images = raw[imagesKey];
    let length = Math.min(MAX_OPINION_SLOTS, Math.max(OPINION_COLUMN_SLOTS, Array.isArray(pins) ? pins.length : 0, Array.isArray(images) ? images.length : 0));
    result[key] = ids(pins, length);
    if (legacy) {
      while (length > OPINION_COLUMN_SLOTS && result[key][length - 1] === null) length--;
      result[key] = result[key].slice(0, length);
    }
    result[imagesKey] = Array.from({ length }, (_, index) => Array.isArray(images) ? images[index] === true : index === DEFAULT_IMAGE_SLOT[i]);
  }
  result.column3Images = ensureColumn3Photo(result.column3Images);
  result.version = OPINION_LAYOUT_VERSION;
  result.editorsChoice = ids(raw.editorsChoice, 3);
  const users = new Set<number>();
  result.spotlight = (Array.isArray(raw.spotlight) ? raw.spotlight : []).slice(0, MAX_SPOTLIGHT_AUTHORS).flatMap((item) => {
    const entry = record(item);
    if (!validId(entry.userId) || users.has(entry.userId)) return [];
    users.add(entry.userId);
    return [{ userId: entry.userId, articleTitle: typeof entry.articleTitle === 'string' ? entry.articleTitle.slice(0, 300) : null, articleUrl: safeSpotlightUrl(entry.articleUrl) }];
  });
  result.pitch = validId(raw.pitch) ? raw.pitch : null;
  result.pitchPositions = result.pitch ? pitchPositionsOf(raw.pitchPositions) : { ...NO_PITCH_POSITIONS };
  return result;
}

export function readOpinionLayoutDocument(value: unknown): OpinionLayout {
  const doc = record(value);
  const relationId = (value: unknown) => validId(value) ? value : validId(record(value).id) ? record(value).id : null;
  return normalizeOpinionLayout(doc.layout ?? {
    editorsChoice: [doc.editorsChoice1, doc.editorsChoice2, doc.editorsChoice3].map(relationId),
    editorsChoiceLabel: doc.editorsChoiceLabel,
  });
}

/** Reject invalid new writes instead of persisting data that breaks rendering. */
export function validateOpinionLayout(value: unknown): true | string {
  if (value == null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return 'Layout must be an object.';
  const raw = record(value);
  const seen = new Set<number>();
  for (const key of [...columnKeys, 'editorsChoice'] as const) {
    const arr = raw[key];
    if (arr === undefined) continue;
    if (!Array.isArray(arr) || arr.length > (key === 'editorsChoice' ? 3 : MAX_OPINION_SLOTS)) return `Invalid ${key} slots.`;
    for (const id of arr) {
      if (id === null) continue;
      if (!validId(id) || seen.has(id)) return 'Pins must be unique positive article IDs or null.';
      seen.add(id);
    }
  }
  for (const key of columnKeys) {
    const images = raw[`${key}Images`];
    if (images !== undefined && (!Array.isArray(images) || images.length > MAX_OPINION_SLOTS || images.some((v) => typeof v !== 'boolean'))) return 'Invalid image settings.';
  }
  const column3Images = raw.column3Images;
  if (Array.isArray(column3Images) && column3Images.length > 0 && !column3Images.includes(true)) return 'Column 3 needs one story with a photo: switch on IMG for one of its slots.';
  if (raw.editorsChoiceLabel !== undefined && (typeof raw.editorsChoiceLabel !== 'string' || raw.editorsChoiceLabel.length > 100)) return 'Choice label must be at most 100 characters.';
  if (raw.spotlight !== undefined) {
    if (!Array.isArray(raw.spotlight) || raw.spotlight.length > MAX_SPOTLIGHT_AUTHORS) return 'Too many spotlight authors.';
    const users = new Set<number>();
    for (const item of raw.spotlight) {
      const entry = record(item);
      if (!validId(entry.userId) || users.has(entry.userId)) return 'Invalid or duplicate spotlight author.';
      users.add(entry.userId);
      if (entry.articleTitle != null && (typeof entry.articleTitle !== 'string' || entry.articleTitle.length > 300)) return 'Spotlight titles must be at most 300 characters.';
      if (entry.articleUrl != null && entry.articleUrl !== '' && !safeSpotlightUrl(entry.articleUrl)) return 'Spotlight links must be site paths or HTTPS URLs.';
    }
  }
  if (raw.pitch != null && !validId(raw.pitch)) return 'The guest-writer photo must be a media ID or null.';
  const positions = validatePitchPositions(raw.pitchPositions);
  if (positions !== true) return positions;
  return true;
}

/**
 * The order the columns' slots are read in, newest story first: row by row,
 * the direction alternating (a snake). Row 1 left to right, row 2 right to
 * left, row 3 left to right, and so on. A column with fewer slots is skipped
 * in the rows it doesn't reach. Returns [column, slot] pairs.
 *
 *   1 ▣ | 2   | 3
 *   6   | 5   | 4
 *   7   | 8 ▣ | 9 ▣
 */
export function snakeOrder(lengths: number[]): [number, number][] {
  const order: [number, number][] = [];
  const rows = Math.max(0, ...lengths);
  for (let row = 0; row < rows; row++) {
    const columns = lengths.map((_, c) => c);
    if (row % 2 === 1) columns.reverse();
    for (const c of columns) if (row < lengths[c]) order.push([c, row]);
  }
  return order;
}

/**
 * The page's default for every empty slot: stories go in newest first, each
 * into the next free slot along the snake (snakeOrder) that takes it. A photo
 * slot (its image switch on, `photos`) takes only a story with a photo, so if
 * the newest story has none it skips the lead and lands at the top of the
 * middle column, and the newest story with a photo takes the lead. A story
 * without a photo that only photo slots are left for goes unused. Photo slots
 * nothing with a photo could fill then take any stories left, newest first.
 *
 * Pinned slots stay as they are, and pinned and `excluded` stories (Opinion's
 * Choice) aren't used again. Shared by the page and the layout editor's
 * "Auto:" previews.
 */
export function planOpinionColumns<T extends { id: number | string }>(
  columns: (T | null)[][],
  pool: T[],
  { excluded = [], photos, hasPhoto }: { excluded?: T[]; photos?: boolean[][]; hasPhoto?: (story: T) => boolean } = {},
): (T | null)[][] {
  const used = new Set([...columns.flat(), ...excluded].filter((a): a is T => a !== null).map((a) => String(a.id)));
  const filled = columns.map((column) => [...column]);
  const open = snakeOrder(filled.map((column) => column.length)).filter(([c, s]) => !filled[c][s]);
  const needsPhoto = ([c, s]: [number, number]) => Boolean(hasPhoto && photos?.[c]?.[s]);
  for (const story of pool) {
    if (open.length === 0) break;
    if (used.has(String(story.id))) continue;
    const i = open.findIndex((slot) => !needsPhoto(slot) || hasPhoto!(story));
    if (i < 0) continue;
    const [c, s] = open.splice(i, 1)[0];
    filled[c][s] = story;
    used.add(String(story.id));
  }
  for (const [c, s] of open) {
    const story = pool.find((a) => !used.has(String(a.id)));
    if (!story) break;
    filled[c][s] = story;
    used.add(String(story.id));
  }
  return filled;
}

/** The columns' stories in snake order (newest first), with each one's slot: phones and tablets show them this way */
export function inSnakeOrder<T>(columns: (T | null)[][]): { story: T; column: number; slot: number }[] {
  return snakeOrder(columns.map((column) => column.length)).flatMap(([column, slot]) => {
    const story = columns[column][slot];
    return story ? [{ story, column, slot }] : [];
  });
}

/**
 * A column pin lapses once its story is this many days older than the newest
 * opinion story, and the slot goes back to the default. Measured from the
 * newest story, not today, so pins don't all lapse over a break (as on
 * Features, which uses 42 days). Opinion's Choice picks don't lapse.
 */
export const OPINION_PIN_STALE_DAYS = 14;

export function isOpinionPinStale(pinnedIso: string | null | undefined, newestIso: string | null | undefined): boolean {
  if (!pinnedIso || !newestIso) return false;
  const pinned = Date.parse(pinnedIso);
  const newest = Date.parse(newestIso);
  if (Number.isNaN(pinned) || Number.isNaN(newest)) return false;
  return newest - pinned > OPINION_PIN_STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * The right column always shows a photo: at least one of its slots has its
 * image switched on. A layout without one (or an older one whose photo slot
 * was trimmed) gets its last slot's switched on.
 */
export const ensureColumn3Photo = (images: boolean[]): boolean[] =>
  images.some(Boolean) ? images : images.map((_, i) => i === images.length - 1);

export function canManageOpinion(user: { roles?: string[] | null; section?: string | null } | null | undefined): boolean {
  return !!user?.roles?.some((role) => role === 'admin' || role === 'eic' || (role === 'editor' && user.section === 'opinion'));
}
