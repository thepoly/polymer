'use client';

/*
 * The Features Layout editor (features-page-layout). The Features page fills
 * itself from the newest stories (lib/featuresFront.ts); editors can pin five
 * things, and each pin holds while it's fresh:
 *
 *   Cover                 any story with a featured image
 *   Campus Life lead      a Campus Life story (it goes first in the row)
 *   Arts & Culture lead   an Arts & Culture story with a featured image
 *   People lead           a People story (it goes first in the row)
 *   Photo Short Story     a photo story, shown in the reel (it needs 3+ photos)
 *
 * And one photo, not a story: the Pitch photo, behind "Have a suggestion? Tell
 * Features about it" in the top's right column. Drop any story with a
 * featured image on it to use that photo; without one, the page uses the
 * newest photo story's photo. A picked photo is placed per screen size (phone,
 * tablet, computer) in previews of the real page, with the same drag, zoom
 * and reset as the Get Involved and Senate / E-Board photo editors
 * (components/admin/PinnedPhotoPreview).
 *
 * Saved as the v3 layout (FeaturesLayoutV3) in the same JSON field; an older
 * layout is read through normalizeFeaturesLayout, and the first save rewrites it.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import './features-layout-editor.css';
import { FEATURES_DEPARTMENTS, departmentOf, type FeaturesDepartmentKey } from '@/lib/featuresDepartments';
import {
  PIN_STALE_DAYS,
  SECTION_WINDOW_DAYS,
  isWithin,
  normalizeFeaturesLayout,
  NO_PITCH_POSITIONS,
  type FeaturesLayoutV3,
  type SectionKey,
} from '@/lib/featuresFront';
import { PitchPositionsEditor, pitchInfoOf, type PitchPhotoInfo } from '@/components/admin/PitchPositionsEditor';

// ---------------------------------------------------------------------------
// Types and slots
// ---------------------------------------------------------------------------

type ArticleData = {
  id: number;
  title: Record<string, unknown>;
  plainTitle?: string;
  slug: string;
  section: string;
  publishedDate: string | null;
  createdAt: string;
  featuredImage?:
    | { id?: number; url?: string | null; alt?: string | null; width?: number | null; height?: number | null; focalX?: number | null; focalY?: number | null }
    | number
    | null;
  subdeck?: string | null;
  kicker?: string | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

type SlotKey = 'cover' | SectionKey | 'reel';

type SlotSpec = {
  key: SlotKey;
  label: string;
  /** What the page does without a pin, or once the pin is stale */
  fallback: string;
  /** Which stories the slot takes */
  dept?: FeaturesDepartmentKey;
  needsImage: boolean;
  /** How long the pin holds, in days from the newest Features story */
  holdsDays: number;
};

const deptName = (key: FeaturesDepartmentKey) => FEATURES_DEPARTMENTS.find((d) => d.key === key)!.name;

const SLOTS: Record<SlotKey, SlotSpec> = {
  cover: {
    key: 'cover',
    label: 'Cover story',
    fallback: 'Falls back to the newest story with a photo after 6 weeks.',
    needsImage: true,
    holdsDays: PIN_STALE_DAYS,
  },
  campus: {
    key: 'campus',
    label: `${deptName('campus')} lead`,
    dept: 'campus',
    fallback: `Goes first in the row. Falls back to the newest ${deptName('campus')} stories after 6 weeks.`,
    needsImage: false,
    holdsDays: PIN_STALE_DAYS,
  },
  arts: {
    key: 'arts',
    label: `${deptName('arts')} lead`,
    dept: 'arts',
    fallback: `Falls back to the newest ${deptName('arts')} story with a photo after 6 weeks.`,
    needsImage: true,
    holdsDays: PIN_STALE_DAYS,
  },
  people: {
    key: 'people',
    label: `${deptName('people')} lead`,
    dept: 'people',
    fallback: `Goes first in the row. Falls back to the newest ${deptName('people')} stories after 6 weeks.`,
    needsImage: false,
    holdsDays: PIN_STALE_DAYS,
  },
  reel: {
    key: 'reel',
    label: 'Photo Short Story (the reel)',
    dept: 'photo',
    fallback: 'Needs at least 3 photos in the story. Falls back to the newest photo story that has them.',
    needsImage: true,
    holdsDays: SECTION_WINDOW_DAYS,
  },
};

const SECTION_SLOTS: SectionKey[] = ['campus', 'arts', 'people'];

const EMPTY_LAYOUT: FeaturesLayoutV3 = normalizeFeaturesLayout(null);

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ARTICLE_FIELDS =
  '&select[title]=true&select[plainTitle]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
  '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
  '&select[authors]=true&select[writeInAuthors]=true';

const getImageUrl = (article: ArticleData): string | null => {
  if (!article.featuredImage || typeof article.featuredImage === 'number') return null;
  return article.featuredImage.url || null;
};

const getAuthorString = (article: ArticleData): string => {
  const staff = (article.authors || [])
    .filter((a): a is { firstName: string; lastName: string } => typeof a !== 'number')
    .map((a) => `${a.firstName} ${a.lastName}`);
  const writeIns = (article.writeInAuthors || []).map((a) => a.name);
  return [...staff, ...writeIns].join(', ') || '';
};

const formatDate = (d: string | null): string => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const extractDocId = (): string | null => {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('features-page-layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
};

const pinOf = (layout: FeaturesLayoutV3, slot: SlotKey): number | null =>
  slot === 'cover' ? layout.cover : slot === 'reel' ? layout.reel : layout.leads[slot];

const withPin = (layout: FeaturesLayoutV3, slot: SlotKey, id: number | null): FeaturesLayoutV3 =>
  slot === 'cover'
    ? { ...layout, cover: id }
    : slot === 'reel'
      ? { ...layout, reel: id }
      : { ...layout, leads: { ...layout.leads, [slot]: id } };

const usedIdsOf = (layout: FeaturesLayoutV3): Set<number> =>
  new Set([layout.cover, layout.reel, ...Object.values(layout.leads)].filter((id): id is number => id != null));

/** Why a story can't go in a slot, or null when it can */
function rejection(article: ArticleData, slot: SlotSpec): string | null {
  if (slot.dept && departmentOf(article.kicker) !== slot.dept) {
    const actual = departmentOf(article.kicker);
    const where = actual ? `a ${deptName(actual)} story` : 'in no section';
    return `"${article.plainTitle}" is ${where} (kicker: ${article.kicker || 'none'}), so it can't be the ${slot.label}.`;
  }
  if (slot.needsImage && !getImageUrl(article)) {
    return `"${article.plainTitle}" has no featured image, so it can't be the ${slot.label}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Draggable article in a slot
// ---------------------------------------------------------------------------

function DraggableSlotArticle({ article, slotId }: { article: ArticleData; slotId: SlotKey }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`fle-slot-body ${isDragging ? 'fle-dragging' : ''}`}>
      <SlotPreview article={article} />
    </div>
  );
}

function SlotPreview({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  const author = getAuthorString(article);
  return (
    <div className="fle-slot-preview">
      {imageUrl && (
        <div className="fle-slot-image">
          <img src={imageUrl} alt="" />
        </div>
      )}
      <div className="fle-slot-text">
        <div className="fle-slot-title">{article.plainTitle}</div>
        <div className="fle-slot-author">
          {[author, formatDate(article.publishedDate)].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable slot
// ---------------------------------------------------------------------------

const noteStyle: React.CSSProperties = { fontSize: '0.68rem', lineHeight: 1.4, opacity: 0.55, margin: '6px 2px 0' };
const staleStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  lineHeight: 1.35,
  fontWeight: 600,
  color: '#b45309',
  background: 'rgba(245, 158, 11, 0.12)',
  borderRadius: 4,
  padding: '4px 8px',
  margin: '6px 0 0',
};

/** The pitch's photo: drop a story to use its featured photo */
function PitchPhotoSlot({
  preview,
  missing,
  onClear,
}: {
  preview: { url: string; title?: string } | null;
  /** The saved photo couldn't be loaded (deleted from Media); the page falls back */
  missing: boolean;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'drop-pitch', data: { slotId: 'pitch' } });
  return (
    <div>
      <div ref={setNodeRef} className={`fle-slot ${isOver ? 'fle-slot-over' : ''} ${preview ? 'fle-slot-filled' : ''}`}>
        <div className="fle-slot-header">
          <span className="fle-slot-label">Pitch photo</span>
          {(preview || missing) && (
            <button className="fle-slot-clear" onClick={onClear} title="Remove photo">
              &times;
            </button>
          )}
        </div>
        {preview ? (
          <div className="fle-slot-body">
            <div className="fle-slot-preview">
              <div className="fle-slot-image">
                <img src={preview.url} alt="" />
              </div>
              {preview.title && (
                <div className="fle-slot-text">
                  <div className="fle-slot-author">From: {preview.title}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="fle-slot-empty">
            <div className="fle-slot-empty-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
              </svg>
              <span>{missing ? 'The picked photo was deleted: the page uses the newest photo story’s photo' : 'Drop a story to use its photo'}</span>
            </div>
          </div>
        )}
      </div>
      <p style={noteStyle}>
        Behind &ldquo;Have a suggestion? Tell Features about it&rdquo; in the top&rsquo;s right column. Without one, the
        page uses the newest photo story&rsquo;s photo.
      </p>
    </div>
  );
}

function DropSlot({
  slot,
  article,
  missing,
  stale,
  invalid,
  onClear,
}: {
  slot: SlotSpec;
  article: ArticleData | null;
  /** A pinned story that couldn't be loaded (unpublished or deleted) */
  missing: boolean;
  stale: boolean;
  /** Why the slot no longer takes its saved pin (say, an Arts lead without a photo); the page ignores it */
  invalid: string | null;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop-${slot.key}`, data: { slotId: slot.key } });

  return (
    <div>
      <div ref={setNodeRef} className={`fle-slot ${isOver ? 'fle-slot-over' : ''} ${article ? 'fle-slot-filled' : ''}`}>
        <div className="fle-slot-header">
          <span className="fle-slot-label">{slot.label}</span>
          {(article || missing) && (
            <button className="fle-slot-clear" onClick={onClear} title="Remove pin">
              &times;
            </button>
          )}
        </div>
        {article ? (
          <DraggableSlotArticle article={article} slotId={slot.key} />
        ) : (
          <div className="fle-slot-empty">
            <div className="fle-slot-empty-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{missing ? 'Pinned story is unpublished or deleted' : 'No pin: the page fills this itself'}</span>
            </div>
          </div>
        )}
      </div>
      {invalid ? (
        <p style={staleStyle}>{invalid} The page is using the newest story instead.</p>
      ) : (
        stale && <p style={staleStyle}>Stale, the page is using the newest story instead.</p>
      )}
      <p style={noteStyle}>{slot.fallback}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

function DraggablePoolCard({ article }: { article: ArticleData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${article.id}`,
    data: { article, source: 'pool' },
  });
  const imageUrl = getImageUrl(article);
  const dept = departmentOf(article.kicker);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`fle-pool-card ${isDragging ? 'fle-dragging' : ''}`}>
      {imageUrl ? (
        <div className="fle-pool-thumb">
          <img src={imageUrl} alt="" />
        </div>
      ) : (
        <div className="fle-pool-thumb fle-pool-thumb-empty" title="No featured image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
      <div className="fle-pool-card-body">
        <div className="fle-pool-card-title">{article.plainTitle}</div>
        <div className="fle-pool-card-meta">
          <span className="fle-pool-card-date">
            {formatDate(article.publishedDate)} · {dept ? deptName(dept) : 'No section'}
          </span>
        </div>
      </div>
    </div>
  );
}

function DragOverlayCard({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  return (
    <div className="fle-drag-overlay">
      {imageUrl && (
        <div className="fle-drag-overlay-img">
          <img src={imageUrl} alt="" />
        </div>
      )}
      <div className="fle-drag-overlay-body">
        <div className="fle-drag-overlay-title">{article.plainTitle}</div>
      </div>
    </div>
  );
}

type PoolFilter = 'all' | FeaturesDepartmentKey;

function ArticlePool({
  articles,
  usedIds,
  search,
  onSearch,
  filter,
  onFilter,
}: {
  articles: ArticleData[];
  usedIds: Set<number>;
  search: string;
  onSearch: (v: string) => void;
  filter: PoolFilter;
  onFilter: (f: PoolFilter) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool-drop-zone', data: { pool: true } });

  const filtered = articles.filter((a) => {
    if (usedIds.has(a.id)) return false;
    if (filter !== 'all' && departmentOf(a.kicker) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (a.plainTitle || '').toLowerCase().includes(q) || getAuthorString(a).toLowerCase().includes(q);
    }
    return true;
  });

  const chip = (key: PoolFilter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => onFilter(key)}
      aria-pressed={filter === key}
      style={{
        fontSize: '0.68rem',
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 999,
        border: '1px solid var(--theme-elevation-250, #555)',
        background: filter === key ? 'var(--theme-text, #fff)' : 'transparent',
        color: filter === key ? 'var(--theme-bg, #000)' : 'inherit',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      className="fle-pool"
      style={{
        background: isOver ? 'rgba(59,130,246,0.04)' : undefined,
        outline: isOver ? '2px dashed #3b82f6' : undefined,
        outlineOffset: isOver ? '-2px' : undefined,
      }}
    >
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>Features Articles</div>
      <div style={{ padding: '8px 14px 0' }}>
        <input type="search" placeholder="Search articles..." value={search} onChange={(e) => onSearch(e.target.value)} className="fle-pool-search" />
      </div>
      <div style={{ padding: '8px 14px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {chip('all', 'All')}
        {FEATURES_DEPARTMENTS.map((d) => chip(d.key, d.name))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.3, fontSize: '0.75rem' }}>No articles found</div>
        )}
        {filtered.slice(0, 40).map((article) => (
          <DraggablePoolCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function FeaturesLayoutEditor() {
  const [layout, setLayout] = useState<FeaturesLayoutV3>(EMPTY_LAYOUT);
  const [articles, setArticles] = useState<ArticleData[]>([]);
  // Pinned stories older than the pool, fetched on their own
  const [extra, setExtra] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PoolFilter>('all');
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const [pitchPreview, setPitchPreview] = useState<PitchPhotoInfo | null>(null);
  const docIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const articleMap = new Map([...extra, ...articles].map((a) => [a.id, a]));
  const usedIds = usedIdsOf(layout);
  // Pins go stale measured from the newest Features story, as on the page
  const anchor = articles.reduce((max, a) => Math.max(max, a.publishedDate ? Date.parse(a.publishedDate) : 0), 0);

  // ---- Fetch ----
  useEffect(() => {
    (async () => {
      try {
        const artRes = await fetch(
          '/api/articles?where[section][equals]=features&where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' + ARTICLE_FIELDS,
        );
        const artData = await artRes.json();
        const pool: ArticleData[] = artData.docs || [];
        setArticles(pool);

        let id = extractDocId();
        let layoutData: Record<string, unknown> | null = null;

        if (id) {
          const layoutRes = await fetch(`/api/features-page-layout/${id}?depth=0`);
          if (layoutRes.ok) {
            layoutData = await layoutRes.json();
          } else {
            id = null;
          }
        }
        if (!id) {
          const listRes = await fetch('/api/features-page-layout?limit=1&depth=0');
          const listData = await listRes.json();
          if (listData.docs?.length > 0) {
            layoutData = listData.docs[0];
            id = String((layoutData as Record<string, unknown>).id);
          }
        }
        if (!id) {
          const createRes = await fetch('/api/features-page-layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Features Layout' }),
          });
          if (createRes.ok) {
            const c = await createRes.json();
            id = String(c.doc.id);
            layoutData = c.doc;
          } else {
            setError('Failed to create layout document. Check your permissions.');
          }
        }
        docIdRef.current = id;

        const loaded = normalizeFeaturesLayout(layoutData?.layout);
        setLayout(loaded);
        if (loaded.pitch != null) {
          const mediaRes = await fetch(`/api/media/${loaded.pitch}?depth=0`);
          const media = mediaRes.ok ? await mediaRes.json() : null;
          if (media) setPitchPreview(pitchInfoOf(media));
        }

        // A pin older than the pool still needs its card (and its stale note)
        const inPool = new Set(pool.map((a) => a.id));
        const missing = [...usedIdsOf(loaded)].filter((pinId) => !inPool.has(pinId));
        if (missing.length) {
          const where = missing.map((m, i) => `where[id][in][${i}]=${m}`).join('&');
          const res = await fetch(`/api/articles?${where}&where[_status][equals]=published&limit=${missing.length}&depth=1${ARTICLE_FIELDS}`);
          if (res.ok) setExtra((await res.json()).docs || []);
        }
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- Mutations ----
  const setPin = useCallback((slot: SlotKey, id: number | null) => {
    setLayout((prev) => withPin(prev, slot, id));
    setSaved(false);
  }, []);

  // ---- DnD ----
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.article) setActiveArticle(data.article);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveArticle(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData?.article) return;
    const dragged = activeData.article as ArticleData;
    const source = activeData.source === 'slot' ? (activeData.slotId as SlotKey) : null;

    // Dropped on the pool: unpin
    if (overData?.pool === true) {
      if (source) setPin(source, null);
      return;
    }
    // The pitch photo takes the story's featured photo; the story stays where it is
    if (overData?.slotId === 'pitch') {
      const image = dragged.featuredImage;
      const info = image && typeof image === 'object' && image.id ? pitchInfoOf(image, dragged.plainTitle) : null;
      if (!image || typeof image === 'number' || !image.id || !info) {
        setNotice(`"${dragged.plainTitle}" has no featured image, so it can't give the pitch its photo.`);
        return;
      }
      setNotice(null);
      // A new photo starts from its own focal point on every screen
      setLayout((prev) => ({ ...prev, pitch: image.id!, pitchPositions: prev.pitch === image.id ? prev.pitchPositions : { ...NO_PITCH_POSITIONS } }));
      setPitchPreview(info);
      setSaved(false);
      return;
    }
    const target = overData?.slotId as SlotKey | undefined;
    if (!target || target === source) return;

    const why = rejection(dragged, SLOTS[target]);
    if (why) {
      setNotice(why);
      return;
    }
    setNotice(null);

    setLayout((prev) => {
      let next = withPin(prev, target, dragged.id);
      if (source) {
        // Moving between slots: swap when the other story fits the source slot, else clear it
        const displacedId = pinOf(prev, target);
        const displaced = displacedId != null ? articleMap.get(displacedId) : undefined;
        next = withPin(next, source, displaced && !rejection(displaced, SLOTS[source]) ? displaced.id : null);
      }
      return next;
    });
    setSaved(false);
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!docIdRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/features-page-layout/${docIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch (err) {
      setError('Failed to save');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="fle-loading">
        <div className="fle-loading-spinner" />
        <span>Loading features layout...</span>
      </div>
    );
  }

  const slotProps = (key: SlotKey) => {
    const id = pinOf(layout, key);
    const article = id != null ? articleMap.get(id) ?? null : null;
    return {
      slot: SLOTS[key],
      article,
      missing: id != null && !article,
      stale: Boolean(article && anchor && !isWithin(article.publishedDate, anchor, SLOTS[key].holdsDays)),
      invalid: article ? rejection(article, SLOTS[key]) : null,
      onClear: () => setPin(key, null),
    };
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerThenCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="fle-root">
        <div className="fle-toolbar">
          <div className="fle-toolbar-left">
            <h2 className="fle-toolbar-title">Features Page Layout</h2>
          </div>
          <div className="fle-toolbar-right">
            {error && <span className="fle-toolbar-error">{error}</span>}
            <button className={`fle-save-btn ${saved ? 'fle-save-btn-saved' : 'fle-save-btn-unsaved'}`} onClick={handleSave} disabled={saving || saved}>
              {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
            </button>
          </div>
        </div>

        <div className="fle-body">
          <div className="fle-canvas-wrap">
            <div style={{ fontSize: '0.78rem', lineHeight: 1.5, opacity: 0.75, margin: '0 0 16px', maxWidth: 720 }}>
              <strong>How this page fills itself.</strong> Beside the cover, the top shows the next six newest stories
              from any section. Each section below shows its newest stories from the past year (counted back from the newest
              Features story), sorted into sections by kicker. A pin puts a story in its place and holds
              for 6 weeks; after that the page goes back to the newest story. Every story appears once on the page.
            </div>
            {notice && (
              <div role="status" style={{ ...staleStyle, margin: '0 0 12px', maxWidth: 720 }}>
                {notice}
              </div>
            )}

            <div style={{ maxWidth: 520 }}>
              <DropSlot {...slotProps('cover')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
              {SECTION_SLOTS.map((key) => (
                <DropSlot key={key} {...slotProps(key)} />
              ))}
            </div>

            <div style={{ maxWidth: 520, marginTop: 20 }}>
              <DropSlot {...slotProps('reel')} />
            </div>

            <div style={{ maxWidth: 520, marginTop: 20 }}>
              <PitchPhotoSlot
                preview={pitchPreview}
                missing={layout.pitch != null && !pitchPreview}
                onClear={() => {
                  setLayout((prev) => ({ ...prev, pitch: null, pitchPositions: { ...NO_PITCH_POSITIONS } }));
                  setPitchPreview(null);
                  setSaved(false);
                }}
              />
            </div>
            {layout.pitch != null && pitchPreview && (
              <PitchPositionsEditor
                photo={pitchPreview}
                positions={layout.pitchPositions}
                page="/features"
                pageName="Features"
                labelClassName="fle-slot-label"
                onChange={(next) => {
                  setLayout((prev) => ({ ...prev, pitchPositions: next }));
                  setSaved(false);
                }}
              />
            )}
          </div>

          <ArticlePool articles={articles} usedIds={usedIds} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
        </div>

        <DragOverlay dropAnimation={null}>{activeArticle ? <DragOverlayCard article={activeArticle} /> : null}</DragOverlay>
      </div>
    </DndContext>
  );
}
