import { NO_PITCH_POSITIONS, pitchPositionsOf, validatePitchPositions, type PitchPositions } from './pitchPhoto';

export const OPINION_LAYOUT_NAME = 'Opinion Layout';
export const MAX_OPINION_SLOTS = 20;
export const MAX_SPOTLIGHT_AUTHORS = 16;
export const columnKeys = ['column1', 'column2', 'column3'] as const;
export type OpinionColumn = typeof columnKeys[number];
export type OpinionSlotColumn = OpinionColumn | 'editorsChoice';
export type SpotlightEntry = { userId: number; articleTitle?: string | null; articleUrl?: string | null };
export type OpinionLayout = Record<OpinionColumn, (number | null)[]> & {
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
  for (const [i, key] of columnKeys.entries()) {
    const imagesKey = `${key}Images` as const;
    const pins = raw[key]; const images = raw[imagesKey];
    const length = Math.min(MAX_OPINION_SLOTS, Math.max(i === 0 ? 5 : 4, Array.isArray(pins) ? pins.length : 0, Array.isArray(images) ? images.length : 0));
    result[key] = ids(pins, length);
    result[imagesKey] = Array.from({ length }, (_, index) => Array.isArray(images) ? images[index] === true : index === [0, 2, 3][i]);
  }
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

export function fillOpinionSlots<T extends { id: number | string }>(columns: (T | null)[][], pool: T[], excluded: T[] = []): (T | null)[][] {
  const used = new Set([...columns.flat(), ...excluded].filter((a): a is T => a !== null).map((a) => String(a.id)));
  const available = pool.filter((a) => !used.has(String(a.id)));
  let next = 0;
  return columns.map((column) => column.map((pin) => pin || available[next++] || null));
}

export function canManageOpinion(user: { roles?: string[] | null; section?: string | null } | null | undefined): boolean {
  return !!user?.roles?.some((role) => role === 'admin' || role === 'eic' || (role === 'editor' && user.section === 'opinion'));
}
