import { NO_PITCH_POSITIONS, pitchPositionsOf, validatePitchPositions, type PitchPositions } from './pitchPhoto';

export const OPINION_LAYOUT_NAME = 'Opinion Layout';
export const MAX_OPINION_SLOTS = 20;
export const MAX_SPOTLIGHT_AUTHORS = 16;
/** Story slots each column starts with (editors can add more, up to MAX_OPINION_SLOTS) */
export const OPINION_COLUMN_SLOTS = 2;
/** Which slot shows its photo by default: column 1's lead, columns 2 and 3's last (column 3 must have one) */
const DEFAULT_IMAGE_SLOT = [0, 1, 1];
/**
 * 3: two slots per column (2026-11-27, when the author spotlight began
 * showing each columnist's latest piece). Read from version 2 (three slots),
 * each column drops one automatic slot without a photo. Layouts saved without
 * a version are from the 5/4/4 days and lose their trailing automatic slots.
 */
export const OPINION_LAYOUT_VERSION = 3;
/**
 * How Opinion's Choice is set off (components/Opinion/EditorsChoice.tsx),
 * picked in the Opinion Layout editor: a 1px frame with the label in its top
 * edge (the default), a vertical rule down the left of the picks, or the label
 * over a 2px rule like the group titles.
 */
export const CHOICE_STYLES = ['keyline', 'margin', 'rule'] as const;
export type ChoiceStyle = typeof CHOICE_STYLES[number];
export const DEFAULT_CHOICE_STYLE: ChoiceStyle = 'keyline';
const isChoiceStyle = (value: unknown): value is ChoiceStyle => CHOICE_STYLES.includes(value as ChoiceStyle);
export const columnKeys = ['column1', 'column2', 'column3'] as const;
export type OpinionColumn = typeof columnKeys[number];
export type OpinionSlotColumn = OpinionColumn | 'editorsChoice';
export type SpotlightEntry = { userId: number; articleTitle?: string | null; articleUrl?: string | null };
export type OpinionLayout = Record<OpinionColumn, (number | null)[]> & {
  version: typeof OPINION_LAYOUT_VERSION;
  column1Images: boolean[]; column2Images: boolean[]; column3Images: boolean[];
  editorsChoice: (number | null)[];
  editorsChoiceLabel: string;
  editorsChoiceStyle: ChoiceStyle;
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
  // Older layouts are brought down to the current slot count, dropping
  // automatic slots without a photo first (shrinkColumn), so pins and photo
  // slots stay. Version 2 (three slots each) loses one such slot per column;
  // a layout with no version (5/4/4) goes down to the current count.
  const fromThreeSlots = raw.version === 2;
  const unversioned = raw.version === undefined || raw.version === null;
  for (const [i, key] of columnKeys.entries()) {
    const imagesKey = `${key}Images` as const;
    const pins = raw[key]; const images = raw[imagesKey];
    const length = Math.min(MAX_OPINION_SLOTS, Math.max(OPINION_COLUMN_SLOTS, Array.isArray(pins) ? pins.length : 0, Array.isArray(images) ? images.length : 0));
    let slots = ids(pins, length);
    let photos: boolean[] | null = Array.isArray(images) ? slots.map((_, index) => images[index] === true) : null;
    if (fromThreeSlots || unversioned) {
      ({ slots, photos } = shrinkColumn(slots, photos, fromThreeSlots ? 1 : Infinity));
    }
    result[key] = slots;
    result[imagesKey] = photos ?? slots.map((_, index) => index === DEFAULT_IMAGE_SLOT[i]);
  }
  result.column3Images = ensureColumn3Photo(result.column3Images);
  result.version = OPINION_LAYOUT_VERSION;
  result.editorsChoice = ids(raw.editorsChoice, 3);
  result.editorsChoiceStyle = isChoiceStyle(raw.editorsChoiceStyle) ? raw.editorsChoiceStyle : DEFAULT_CHOICE_STYLE;
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

/**
 * Brings an older column down toward OPINION_COLUMN_SLOTS, removing at most
 * `limit` slots: first automatic slots without a photo (the last such each
 * time), then trailing automatic slots. A pinned slot is never removed.
 */
function shrinkColumn(slots: (number | null)[], photos: boolean[] | null, limit: number) {
  let removed = 0;
  const removeAt = (index: number) => {
    slots = slots.filter((_, s) => s !== index);
    photos = photos && photos.filter((_, s) => s !== index);
    removed++;
  };
  while (slots.length > OPINION_COLUMN_SLOTS && removed < limit) {
    let index = -1;
    for (let s = slots.length - 1; s >= 0; s--) if (slots[s] === null && !photos?.[s]) { index = s; break; }
    if (index < 0) break;
    removeAt(index);
  }
  while (slots.length > OPINION_COLUMN_SLOTS && removed < limit && slots[slots.length - 1] === null) removeAt(slots.length - 1);
  return { slots, photos };
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
  if (raw.editorsChoiceStyle !== undefined && !isChoiceStyle(raw.editorsChoiceStyle)) return 'Choice style must be keyline, margin or rule.';
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
 *   6   | 5 ▣ | 4 ▣
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
