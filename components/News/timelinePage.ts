/**
 * Settings for the Student Senate / Executive Board timeline pages, set in
 * the dashboard (News Layout ▸ Senate / Executive Board) and stored in the
 * `news-page-layout` JSON under `timelinePages`. Safe to import from client
 * code.
 */
import type { StudentGovBody } from "./studentGov";

/**
 * How a panel photo is framed on one kind of screen: the point kept in view
 * (percent, as CSS object-position) and how far it's zoomed in toward it.
 */
export type PhotoFrame = { x: number; y: number; zoom: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

/** Existing red duotone strength, used for layouts saved before this control. */
export const DEFAULT_PANEL_TINT = 78;

export function normalizePanelTint(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : DEFAULT_PANEL_TINT;
}

/** Shared by the public panel and both editor previews. Zero restores the photo's colors. */
export function panelTintStyles(tint: number) {
  const amount = Math.min(normalizePanelTint(tint) / DEFAULT_PANEL_TINT, 1);
  return {
    opacity: normalizePanelTint(tint) / 100,
    filter: `grayscale(${amount}) contrast(${1 + 0.15 * amount})`,
    backgroundColor: `rgb(${22 + 20 * amount}, ${22 - 12 * amount}, ${22 - 6 * amount})`,
  };
}

/** A photo for the left panel, framed separately for computers and phones */
export type TimelinePhoto = {
  /** `media` id */
  media: number;
  /** Computer framing; null uses the photo's focal point, not zoomed */
  desktop: PhotoFrame | null;
  /** Phone framing; null matches the computer framing */
  mobile: PhotoFrame | null;
};

/** CSS for a frame: object-position plus a zoom toward that same point */
export type FrameStyle = { position: string; zoom: number };

// ---------------------------------------------------------------------------
// Per-entry layout in the stream
// ---------------------------------------------------------------------------

export type EntrySize = "small" | "medium" | "large" | "full";
/** Where an article's photo sits in its card on desktop (phones always put it on top) */
export type EntryImage = "left" | "right" | "top" | "none";

export const ENTRY_SIZES: { value: EntrySize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "full", label: "Full width" },
];

export const ENTRY_IMAGES: { value: EntryImage; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top", label: "Top" },
  { value: "none", label: "No photo" },
];

/** Overrides set in the page editor; anything missing uses the default */
export type TimelineEntryLayout = {
  size?: EntrySize;
  image?: EntryImage;
  /**
   * Across the stream: 0 = flush left, 100 = flush right. Missing means
   * automatic, the zig-zag.
   */
  position?: number;
};

/**
 * Automatic positions (percent across), picked by an entry's place in the
 * stream so the zig-zag carries on as entries are added.
 */
export const AUTO_POSITIONS = [80, 0, 40, 10, 65, 25];

/** Widest a card gets at each size (px); full width fills the column */
export const ENTRY_WIDTHS: Record<"photo" | "text" | "update", Record<EntrySize, number | null>> = {
  photo: { small: 440, medium: 580, large: 700, full: null },
  text: { small: 400, medium: 520, large: 640, full: null },
  update: { small: 340, medium: 450, large: 600, full: null },
};

/** Headline size (px) on desktop */
export const HEADLINE_SIZES: Record<"article" | "update", Record<EntrySize, number>> = {
  article: { small: 22, medium: 26, large: 32, full: 40 },
  update: { small: 20, medium: 22, large: 26, full: 30 },
};

/** Photo width (px) when it's beside the text */
export const IMAGE_SIDE_WIDTHS: Record<EntrySize, number> = { small: 150, medium: 190, large: 250, full: 340 };
/** Photo height (px) when it's above the text */
export const IMAGE_TOP_HEIGHTS: Record<EntrySize, number> = { small: 170, medium: 220, large: 260, full: 300 };

export type ResolvedEntryLayout = {
  size: EntrySize;
  image: EntryImage;
  /** 0–100; ignored at full width */
  position: number;
  /** Max width in px, or null for full width */
  width: number | null;
  /** True when anything was set in the editor */
  custom: boolean;
  /** Position follows the zig-zag */
  autoPosition: boolean;
};

/**
 * What an entry looks like: the editor's overrides on top of the defaults.
 * Defaults: the newest article is a full-width card with its photo on top;
 * other articles are medium with the photo on the left; updates are medium.
 */
export function resolveEntryLayout({
  kind,
  hasImage,
  isLead,
  autoIndex,
  saved,
}: {
  kind: "article" | "update";
  hasImage: boolean;
  isLead: boolean;
  /** Place among non-lead entries, for the automatic position */
  autoIndex: number;
  saved: TimelineEntryLayout | undefined;
}): ResolvedEntryLayout {
  const size: EntrySize = saved?.size ?? (isLead ? "full" : "medium");
  const image: EntryImage =
    kind === "update" || !hasImage ? "none" : saved?.image ?? (isLead ? "top" : "left");
  const autoPosition = saved?.position === undefined;
  const position = autoPosition ? (isLead ? 0 : AUTO_POSITIONS[autoIndex % AUTO_POSITIONS.length]) : saved!.position!;
  const widths = kind === "update" ? ENTRY_WIDTHS.update : image === "none" ? ENTRY_WIDTHS.text : ENTRY_WIDTHS.photo;
  return {
    size,
    image,
    position,
    width: widths[size],
    custom: Boolean(saved && (saved.size || saved.image || saved.position !== undefined)),
    autoPosition,
  };
}

/**
 * Layout of every entry in a stream (newest first, hidden entries already
 * removed). The first article is the lead; the rest take automatic positions
 * in order.
 */
export function resolveStream(
  items: { kind: "article" | "update"; id: number | string; hasImage: boolean }[],
  entries: Record<string, TimelineEntryLayout>,
): Map<string, ResolvedEntryLayout & { isLead: boolean }> {
  const leadIndex = items.findIndex((item) => item.kind === "article");
  const out = new Map<string, ResolvedEntryLayout & { isLead: boolean }>();
  let autoIndex = 0;
  items.forEach((item, i) => {
    const key = entryKey(item.kind, item.id);
    const isLead = i === leadIndex;
    out.set(key, {
      ...resolveEntryLayout({ kind: item.kind, hasImage: item.hasImage, isLead, autoIndex, saved: entries[key] }),
      isLead,
    });
    if (!isLead) autoIndex += 1;
  });
  return out;
}

export type TimelinePageConfig = {
  /** Red tint strength (0–100), shared by all terms and screens for this body. */
  panelTint: number;
  /**
   * The photo panel shows one photo for a whole term (year): the term's own,
   * else the default, else none (plain red). Article photos are never used.
   */
  photos: {
    /** For any term without its own photo */
    default: TimelinePhoto | null;
    /** One term's photo, keyed by term slug ("senate-56", "eboard-2025-26") */
    terms: Record<string, TimelinePhoto>;
  };
  /** Entries left off the page (and the /news box), as `entryKey`s */
  hidden: string[];
  /**
   * Article ids added from the archive finder: stories about this body filed
   * under another kicker (or another section). Shown like kicker matches.
   */
  included: number[];
  /** Size, photo placement and position of entries, keyed by `entryKey` */
  entries: Record<string, TimelineEntryLayout>;
};

export type TimelinePagesLayout = Record<StudentGovBody, TimelinePageConfig>;

/** "article-12" / "update-3": how settings refer to one stream entry */
export const entryKey = (kind: "article" | "update", id: number | string) => `${kind}-${id}`;

export const EMPTY_TIMELINE_PAGE: TimelinePageConfig = {
  panelTint: DEFAULT_PANEL_TINT,
  photos: { default: null, terms: {} },
  hidden: [],
  included: [],
  entries: {},
};

const isSize = (v: unknown): v is EntrySize => v === "small" || v === "medium" || v === "large" || v === "full";
const isImage = (v: unknown): v is EntryImage => v === "left" || v === "right" || v === "top" || v === "none";

function normalizeEntryLayout(raw: unknown): TimelineEntryLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const out: TimelineEntryLayout = {};
  if (isSize(v.size)) out.size = v.size;
  if (isImage(v.image)) out.image = v.image;
  if (typeof v.position === "number" && Number.isFinite(v.position)) {
    out.position = Math.min(100, Math.max(0, Math.round(v.position)));
  }
  return Object.keys(out).length > 0 ? out : null;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function normalizeFrame(raw: unknown): PhotoFrame | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as { x?: unknown; y?: unknown; zoom?: unknown };
  if (typeof f.x !== "number" || typeof f.y !== "number") return null;
  return {
    x: clamp(f.x, 0, 100),
    y: clamp(f.y, 0, 100),
    zoom: typeof f.zoom === "number" ? clamp(f.zoom, MIN_ZOOM, MAX_ZOOM) : 1,
  };
}

function normalizePhoto(raw: unknown): TimelinePhoto | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as { media?: unknown; desktop?: unknown; mobile?: unknown; focus?: unknown };
  if (typeof v.media !== "number") return null;
  // Earlier saves had one `focus` for both screens
  return { media: v.media, desktop: normalizeFrame(v.desktop) ?? normalizeFrame(v.focus), mobile: normalizeFrame(v.mobile) };
}

/**
 * The `sizes` hint for a panel photo: how wide the photo is really drawn, so
 * the browser downloads a sharp enough copy (up to the original upload).
 *
 * The panel is tall and narrow and the photo is cover-fit, so a landscape
 * photo is drawn far wider than the panel: about panel height × width/height,
 * times the zoom. Computers: the panel is the window height below the header
 * (about 142px). Phones: the full width by 440px.
 */
export function panelPhotoSizes(aspect: number | null | undefined, desktopZoom: number, mobileZoom: number): string {
  const a = aspect && aspect > 0 ? aspect : 1.5;
  // Below ~0.62 the panel's own width (≤ 464px) is the wider of the two
  const desktop = `calc((100vh - 142px) * ${(Math.max(a, 0.62) * desktopZoom).toFixed(3)})`;
  const mobile =
    440 * a >= 430 ? `${Math.round(440 * a * mobileZoom)}px` : `${Math.round(100 * mobileZoom)}vw`;
  return `(min-width: 860px) ${desktop}, ${mobile}`;
}

/**
 * Computer and phone framing for a chosen photo. `fallback` is the photo's
 * own focal point (object-position), used when nothing was set.
 */
export function photoFrames(photo: TimelinePhoto, fallback: string): { desktop: FrameStyle; mobile: FrameStyle } {
  const style = (f: PhotoFrame | null): FrameStyle | null => (f ? { position: `${f.x}% ${f.y}%`, zoom: f.zoom } : null);
  const desktop = style(photo.desktop) ?? { position: fallback, zoom: 1 };
  return { desktop, mobile: style(photo.mobile) ?? desktop };
}

/** Fills in defaults for anything missing or invalid in a saved config */
export function normalizeTimelinePage(raw: unknown): TimelinePageConfig {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const photos = (value.photos && typeof value.photos === "object" ? value.photos : {}) as Record<string, unknown>;
  // Older saves had a photo per month ("months"); those are dropped
  const terms: Record<string, TimelinePhoto> = {};
  if (photos.terms && typeof photos.terms === "object") {
    for (const [slug, photo] of Object.entries(photos.terms as Record<string, unknown>)) {
      const p = normalizePhoto(photo);
      if (p && /^(senate|eboard)-[\w-]+$/.test(slug)) terms[slug] = p;
    }
  }
  const entries: Record<string, TimelineEntryLayout> = {};
  if (value.entries && typeof value.entries === "object") {
    for (const [key, layout] of Object.entries(value.entries as Record<string, unknown>)) {
      const l = normalizeEntryLayout(layout);
      if (l) entries[key] = l;
    }
  }
  return {
    panelTint: normalizePanelTint(value.panelTint),
    photos: { default: normalizePhoto(photos.default), terms },
    hidden: Array.isArray(value.hidden) ? value.hidden.filter((h): h is string => typeof h === "string") : [],
    included: Array.isArray(value.included)
      ? [...new Set(value.included.filter((id): id is number => typeof id === "number" && Number.isInteger(id)))]
      : [],
    entries,
  };
}

export function normalizeTimelinePages(raw: unknown): TimelinePagesLayout {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { senate: normalizeTimelinePage(value.senate), eboard: normalizeTimelinePage(value.eboard) };
}

// ---------------------------------------------------------------------------
// Months, in Troy's time zone. Terms (GM Week to GM Week) are in
// studentGovTerms.ts.
// ---------------------------------------------------------------------------

const TZ = "America/New_York";

/** Year and month (1–12) of a date in Troy */
export function troyYearMonth(date: Date | string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", timeZone: TZ }).formatToParts(
    new Date(date),
  );
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") };
}

/** "2026-11" for a date in Troy */
export function monthKeyOf(date: Date | string): string {
  const { year, month } = troyYearMonth(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "Nov" / "November 2026" for a "2026-11" key */
export function monthKeyLabel(key: string, style: "short" | "long"): string {
  const [year, month] = key.split("-").map(Number);
  // Midday UTC on the 15th is the same month in every US time zone
  const date = new Date(Date.UTC(year, month - 1, 15, 12));
  return style === "short"
    ? date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
    : date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
