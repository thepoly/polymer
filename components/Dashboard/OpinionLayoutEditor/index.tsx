'use client';

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
import './opinion-layout-editor.css';
import { normalizeOpinionLayout, readOpinionLayoutDocument, validateOpinionLayout, OPINION_LAYOUT_NAME, MAX_OPINION_SLOTS, MAX_SPOTLIGHT_AUTHORS, type OpinionLayout, type SpotlightEntry } from '@/lib/opinionLayout';
import { NO_PITCH_POSITIONS } from '@/lib/pitchPhoto';
import { PitchPositionsEditor, pitchInfoOf, type PitchPhotoInfo } from '@/components/admin/PitchPositionsEditor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArticleData = {
  id: number;
  title: Record<string, unknown>;
  plainTitle?: string;
  slug: string;
  section: string;
  publishedDate: string | null;
  createdAt: string;
  featuredImage?: { id?: number; url?: string | null; alt?: string | null; width?: number | null; height?: number | null; focalX?: number | null; focalY?: number | null } | number | null;
  subdeck?: string | null;
  kicker?: string | null;
  opinionType?: string | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

type UserData = {
  id: number;
  firstName: string;
  lastName: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const EMPTY_LAYOUT = normalizeOpinionLayout(null);

// Column labels
const COL1_LABELS = ['Lead (with image)', 'Article', 'Article', 'Article', 'Article'];
const COL2_LABELS = ['Article', 'Article', 'Article (with image)', 'Article'];
const COL3_LABELS = ['Article', 'Article', 'Article', 'Article (with image)'];
const EC_LABELS = ['Pick 1', 'Pick 2', 'Pick 3'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const collectUsedIds = (layout: OpinionLayout): Set<number> => {
  const ids = new Set<number>();
  for (const col of [layout.column1, layout.column2, layout.column3, layout.editorsChoice]) {
    for (const id of col) {
      if (id !== null) ids.add(id);
    }
  }
  return ids;
};

// Slot ID format: "col1-0", "col2-2", "ec-1"
const parseSlotId = (slotId: string): { column: keyof OpinionLayout; index: number } | null => {
  const [prefix, idxStr] = slotId.split('-');
  const index = Number(idxStr);
  if (prefix === 'col1') return { column: 'column1', index };
  if (prefix === 'col2') return { column: 'column2', index };
  if (prefix === 'col3') return { column: 'column3', index };
  if (prefix === 'ec') return { column: 'editorsChoice', index };
  return null;
};

// ---------------------------------------------------------------------------
// Draggable Article in Slot
// ---------------------------------------------------------------------------

function DraggableSlotArticle({ article, slotId, showImage }: { article: ArticleData; slotId: string; showImage?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`ole-slot-body ${isDragging ? 'ole-dragging' : ''}`}
    >
      <SlotPreview article={article} showImage={showImage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot Preview (article card inside a slot)
// ---------------------------------------------------------------------------

function SlotPreview({ article, showImage }: { article: ArticleData; showImage?: boolean }) {
  const imageUrl = getImageUrl(article);
  const author = getAuthorString(article);

  return (
    <div className="ole-slot-preview">
      {showImage && imageUrl && (
        <div className="ole-slot-image">
          <img src={imageUrl} alt="" />
        </div>
      )}
      <div className="ole-slot-text">
        <div className="ole-slot-title">{article.plainTitle}</div>
        {author && <div className="ole-slot-author">{author}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Slot
// ---------------------------------------------------------------------------

const SlotPickerContext = React.createContext<{
  articles: ArticleData[];
  layout: OpinionLayout;
  assign: (slot: string, id: number | null) => void;
} | null>(null);

function DropSlot({
  slotId, label, article, showImage, onClear, isImageSlot, imageToggle,
}: {
  slotId: string;
  label: string;
  article: ArticleData | null;
  showImage?: boolean;
  onClear: () => void;
  isImageSlot?: boolean;
  imageToggle?: React.ReactNode;
}) {
  const picker = React.useContext(SlotPickerContext);
  const parsed = parseSlotId(slotId);
  const pinnedId = picker && parsed ? (picker.layout[parsed.column] as (number | null)[])[parsed.index] : null;
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${slotId}`,
    data: { slotId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`ole-slot ${isOver ? 'ole-slot-over' : ''} ${article ? 'ole-slot-filled' : ''}`}
    >
      <div className="ole-slot-header">
        <span className="ole-slot-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {imageToggle}
          {pinnedId != null && (
            <button className="ole-slot-clear" onClick={onClear} title="Remove article">&times;</button>
          )}
        </div>
      </div>
      {picker && <select aria-label={`Article for ${slotId}`} value={pinnedId || ''}
        onChange={(e) => picker.assign(slotId, e.target.value ? Number(e.target.value) : null)}
        style={{ width: '100%', maxWidth: '100%' }}>
        <option value="">Automatic / no pin</option>
        {pinnedId && !article && <option value={pinnedId}>Unavailable article #{pinnedId}</option>}
        {[...new Map([...(article ? [article] : []), ...picker.articles].map((a) => [a.id, a])).values()].map((a) =>
          <option key={a.id} value={a.id}>{a.plainTitle || a.slug}</option>)}
      </select>}
      {article ? (
        <DraggableSlotArticle article={article} slotId={slotId} showImage={showImage} />
      ) : (
        <div className="ole-slot-empty">
          <div className="ole-slot-empty-inner">
            {isImageSlot ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
                </svg>
                <span>Drop article (with image)</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Drop article</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guest-writer photo slot (drop a story to use its featured photo)
// ---------------------------------------------------------------------------

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
      <div ref={setNodeRef} className={`ole-slot ${isOver ? 'ole-slot-over' : ''} ${preview ? 'ole-slot-filled' : ''}`}>
        <div className="ole-slot-header">
          <span className="ole-slot-label">Guest writer photo</span>
          {(preview || missing) && (
            <button className="ole-slot-clear" onClick={onClear} title="Remove photo">&times;</button>
          )}
        </div>
        {preview ? (
          <div className="ole-slot-body">
            <div className="ole-slot-preview">
              <div className="ole-slot-image"><img src={preview.url} alt="" /></div>
              {preview.title && (
                <div className="ole-slot-text">
                  <div className="ole-slot-author">From: {preview.title}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ole-slot-empty">
            <div className="ole-slot-empty-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
              </svg>
              <span>{missing ? 'The picked photo was deleted: the page uses the newest opinion photo' : 'Drop a story to use its photo'}</span>
            </div>
          </div>
        )}
      </div>
      <p className="ole-pitch-note">
        Behind &ldquo;Have an opinion? Submit an op-ed&rdquo;, which links to the submission form. Without
        one, the page uses the newest opinion story&rsquo;s photo.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool Card (draggable from article library)
// ---------------------------------------------------------------------------

function DraggablePoolCard({ article, isUsed }: { article: ArticleData; isUsed: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${article.id}`,
    data: { article, source: 'pool' },
  });
  const imageUrl = getImageUrl(article);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`ole-pool-card ${isDragging ? 'ole-dragging' : ''} ${isUsed ? 'ole-used' : ''}`}
    >
      {imageUrl ? (
        <div className="ole-pool-thumb"><img src={imageUrl} alt="" /></div>
      ) : (
        <div className="ole-pool-thumb ole-pool-thumb-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
      <div className="ole-pool-card-body">
        <div className="ole-pool-card-title">{article.plainTitle}</div>
        <div className="ole-pool-card-meta">
          <span className="ole-pool-card-date">{formatDate(article.publishedDate)}</span>
        </div>
      </div>
      {isUsed && <div className="ole-used-badge">In use</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag Overlay
// ---------------------------------------------------------------------------

function DragOverlayCard({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  return (
    <div className="ole-drag-overlay">
      {imageUrl && <div className="ole-drag-overlay-img"><img src={imageUrl} alt="" /></div>}
      <div className="ole-drag-overlay-body">
        <div className="ole-drag-overlay-title">{article.plainTitle}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Article Pool (right sidebar with search + drag source)
// ---------------------------------------------------------------------------

function ArticlePool({
  articles,
  usedIds,
  search,
  onSearch, hasMore, onMore, busy,
}: {
  articles: ArticleData[];
  usedIds: Set<number>;
  search: string;
  onSearch: (v: string) => void;
  hasMore: boolean; onMore: () => void; busy: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool-drop-zone', data: { pool: true } });

  const filtered = articles.filter((a) => !usedIds.has(a.id));

  return (
    <div
      ref={setNodeRef}
      className="ole-pool"
      style={{
        background: isOver ? 'rgba(59,130,246,0.04)' : undefined,
        outline: isOver ? '2px dashed #3b82f6' : undefined,
        outlineOffset: isOver ? '-2px' : undefined,
      }}
    >
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>Opinion Articles</div>
      <p style={{ padding: '0 14px', fontSize: '0.75rem' }}>Drag a story or choose it from an article slot menu.</p>
      <div style={{ padding: '8px 14px 0' }}>
        <input
          type="search"
          placeholder="Search all opinion titles..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="ole-pool-search"
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {busy && <p role="status">Searching...</p>}
        {hasMore && <button onClick={onMore} disabled={busy}>Load more articles</button>}
        {filtered.length === 0 && !busy && (
          <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.3, fontSize: '0.75rem' }}>No articles found</div>
        )}
        {filtered.map((article) => (
          <DraggablePoolCard key={article.id} article={article} isUsed={usedIds.has(article.id)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function OpinionLayoutEditor() {
  const [layout, setLayout] = useState<OpinionLayout>({ ...EMPTY_LAYOUT });
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [poolIds, setPoolIds] = useState<number[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const revision = useRef(0);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const [pitchPreview, setPitchPreview] = useState<PitchPhotoInfo | null>(null);
  const docIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const usedIds = collectUsedIds(layout);

  const mergeArticles = useCallback((incoming: ArticleData[]) => {
    setArticles((previous) => [...new Map([...previous, ...incoming].map((a) => [a.id, a])).values()]);
  }, []);
  const poolArticles = poolIds.map((id) => articleMap.get(id)).filter((a): a is ArticleData => !!a);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch('/api/opinion/articles?' + new URLSearchParams({ q: search, page: String(searchPage) }), { signal: controller.signal });
        if (!res.ok) throw new Error('Unable to search opinion articles.');
        const data = await res.json();
        mergeArticles(data.docs);
        setPoolIds((prev) => searchPage === 1 ? data.docs.map((a: ArticleData) => a.id) : [...new Set([...prev, ...data.docs.map((a: ArticleData) => a.id)])]);
        setHasMore(data.hasNextPage);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Search failed');
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, searchPage, mergeArticles]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/opinion/staff?q=' + encodeURIComponent(userSearch), { signal: controller.signal });
        if (!res.ok) throw new Error('Unable to search staff.');
        const data = await res.json();
        setUsers((prev) => [...new Map([...prev, ...data.docs as UserData[]].map((u) => [u.id, u])).values()]);
      } catch { if (!controller.signal.aborted) setError('Unable to load staff directory.'); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [userSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listUrl = '/api/opinion-page-layout?' + new URLSearchParams({ 'where[name][equals]': OPINION_LAYOUT_NAME, limit: '1', depth: '0' });
        const readLayout = async () => {
          const res = await fetch(listUrl);
          if (!res.ok) throw new Error('Unable to load opinion layout.');
          return (await res.json()).docs[0];
        };
        let doc = await readLayout();
        if (!doc) {
          const res = await fetch('/api/opinion-page-layout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: OPINION_LAYOUT_NAME }),
          });
          // Another editor may have created the singleton while this request was pending.
          doc = res.ok ? (await res.json()).doc : await readLayout();
          if (!doc) throw new Error('Unable to create opinion layout. Check your permissions.');
        }
        if (cancelled) return;
        const next = readOpinionLayoutDocument(doc);
        docIdRef.current = String(doc.id);
        setLayout(next);
        if (next.pitch != null) {
          const mediaRes = await fetch(`/api/media/${next.pitch}?depth=0`);
          const media = mediaRes.ok ? await mediaRes.json() : null;
          if (media && !cancelled) setPitchPreview(pitchInfoOf(media));
        }
        const ids = [...collectUsedIds(next)];
        if (ids.length) {
          const res = await fetch('/api/opinion/articles?ids=' + ids.join(','));
          if (!res.ok) throw new Error('Unable to load pinned articles.');
          const data = await res.json();
          if (!cancelled) mergeArticles(data.docs);
        }
        if (next.spotlight.length) {
          const res = await fetch('/api/opinion/staff?ids=' + next.spotlight.map((e) => e.userId).join(','));
          if (!res.ok) throw new Error('Unable to load spotlight authors.');
          const data = await res.json();
          if (!cancelled) setUsers((prev) => [...new Map([...prev, ...data.docs as UserData[]].map((u) => [u.id, u])).values()]);
        }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [mergeArticles]);

  // ---- Mutations ----
  const markDirty = useCallback(() => { revision.current++; setSaved(false); }, []);

  const setSlot = useCallback((column: keyof OpinionLayout, index: number, articleId: number | null) => {
    setLayout((prev) => {
      const next = { ...prev };
      for (const key of ['column1', 'column2', 'column3', 'editorsChoice'] as const) {
        next[key] = prev[key].map((id) => articleId !== null && id === articleId ? null : id);
      }
      (next[column] as (number | null)[])[index] = articleId;
      return next;
    });
    markDirty();
  }, [markDirty]);

  const clearSlot = useCallback((slotId: string) => {
    const parsed = parseSlotId(slotId);
    if (!parsed) return;
    setSlot(parsed.column, parsed.index, null);
  }, [setSlot]);

  const toggleColumnImage = useCallback((column: 'column1' | 'column2' | 'column3', index: number) => {
    const imagesKey = (column + 'Images') as 'column1Images' | 'column2Images' | 'column3Images';
    setLayout((prev) => {
      const imgs = [...prev[imagesKey]];
      while (imgs.length <= index) imgs.push(false);
      imgs[index] = !imgs[index];
      return { ...prev, [imagesKey]: imgs };
    });
    markDirty();
  }, [markDirty]);

  const addSlot = useCallback((column: 'column1' | 'column2' | 'column3') => {
    if (layout[column].length >= MAX_OPINION_SLOTS) return;
    const imagesKey = (column + 'Images') as 'column1Images' | 'column2Images' | 'column3Images';
    setLayout((prev) => ({
      ...prev,
      [column]: [...prev[column], null],
      [imagesKey]: [...prev[imagesKey], false],
    }));
    markDirty();
  }, [markDirty, layout]);

  // ---- Spotlight ----
  const addSpotlight = useCallback((userId: number) => {
    setLayout((prev) => {
      if (prev.spotlight.length >= MAX_SPOTLIGHT_AUTHORS) return prev;
      if ((prev.spotlight || []).some((e) => e.userId === userId)) return prev;
      return { ...prev, spotlight: [...(prev.spotlight || []), { userId, articleTitle: null, articleUrl: null }] };
    });
    setUserSearch('');
    setShowUserDropdown(false);
    markDirty();
  }, [markDirty]);

  const removeSpotlight = useCallback((index: number) => {
    setLayout((prev) => {
      const next = [...(prev.spotlight || [])];
      next.splice(index, 1);
      return { ...prev, spotlight: next };
    });
    markDirty();
  }, [markDirty]);

  const moveSpotlight = useCallback((index: number, dir: -1 | 1) => {
    setLayout((prev) => {
      const next = [...(prev.spotlight || [])];
      const swap = index + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return { ...prev, spotlight: next };
    });
    markDirty();
  }, [markDirty]);

  const updateSpotlightEntry = useCallback((index: number, patch: Partial<SpotlightEntry>) => {
    setLayout((prev) => {
      const next = [...(prev.spotlight || [])];
      next[index] = { ...next[index], ...patch };
      return { ...prev, spotlight: next };
    });
    markDirty();
  }, [markDirty]);

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

    const draggedArticle = activeData.article as ArticleData;

    // Drop onto pool = remove from source
    if (overData?.pool === true) {
      if (activeData.source === 'slot' && typeof activeData.slotId === 'string') {
        clearSlot(activeData.slotId);
      }
      return;
    }

    if (!overData?.slotId) return;

    // The guest-writer photo takes the story's featured photo; the story stays where it is
    if (overData.slotId === 'pitch') {
      const image = draggedArticle.featuredImage;
      const info = image && typeof image === 'object' && image.id ? pitchInfoOf(image, draggedArticle.plainTitle) : null;
      if (!image || typeof image === 'number' || !image.id || !info) {
        setError(`"${draggedArticle.plainTitle}" has no featured image, so it can't give the guest-writer box its photo.`);
        return;
      }
      const mediaId = image.id;
      setError(null);
      // A new photo starts from its own focal point on every screen
      setLayout((prev) => ({ ...prev, pitch: mediaId, pitchPositions: prev.pitch === mediaId ? prev.pitchPositions : { ...NO_PITCH_POSITIONS } }));
      setPitchPreview(info);
      markDirty();
      return;
    }

    const targetSlotId = overData.slotId as string;
    const targetParsed = parseSlotId(targetSlotId);
    if (!targetParsed) return;

    // If source was a slot, swap
    if (activeData.source === 'slot' && typeof activeData.slotId === 'string') {
      const sourceParsed = parseSlotId(activeData.slotId);
      if (sourceParsed) {
        const targetOldId = (layout[targetParsed.column] as (number | null)[])[targetParsed.index];
        setLayout((prev) => {
          const sourceCol = [...(prev[sourceParsed.column] as (number | null)[])];
          const targetCol = sourceParsed.column === targetParsed.column
            ? sourceCol
            : [...(prev[targetParsed.column] as (number | null)[])];

          sourceCol[sourceParsed.index] = targetOldId;
          if (sourceParsed.column === targetParsed.column) {
            sourceCol[targetParsed.index] = draggedArticle.id;
            return { ...prev, [sourceParsed.column]: sourceCol };
          } else {
            targetCol[targetParsed.index] = draggedArticle.id;
            return { ...prev, [sourceParsed.column]: sourceCol, [targetParsed.column]: targetCol };
          }
        });
        markDirty();
        return;
      }
    }

    // Drop from pool
    setSlot(targetParsed.column, targetParsed.index, draggedArticle.id);
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!docIdRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const validation = validateOpinionLayout(layout);
      if (validation !== true) throw new Error(validation);
      const submittedRevision = revision.current;
      const res = await fetch(`/api/opinion-page-layout/${docIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(revision.current === submittedRevision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };


  // ---- Render ----
  if (loading) {
    return (
      <div className="ole-loading">
        <div className="ole-loading-spinner" />
        <span>Loading opinion layout...</span>
      </div>
    );
  }

  const getArticle = (column: keyof OpinionLayout, index: number): ArticleData | null => {
    const id = (layout[column] as (number | null)[])[index];
    return id ? articleMap.get(id) || null : null;
  };

  const userMap = new Map(users.map((u) => [u.id, u]));
  const spotlightUserIds = new Set((layout.spotlight || []).map((e) => e.userId));
  const filteredUsers = users.filter((u) => {
    if (spotlightUserIds.has(u.id)) return false;
    if (!userSearch) return false;
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase());
  });

  return (
    <SlotPickerContext.Provider value={{ articles: poolArticles, layout, assign: (slot, id) => {
      const parsed = parseSlotId(slot); if (parsed) setSlot(parsed.column, parsed.index, id);
    } }}>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerThenCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="ole-root">
        {/* Toolbar */}
        <div className="ole-toolbar">
          <div className="ole-toolbar-left">
            <h2 className="ole-toolbar-title">Opinion Page Layout</h2>
          </div>
          <div className="ole-toolbar-right">
            {error && <span className="ole-toolbar-error">{error}</span>}
            <button
              className={`ole-save-btn ${saved ? 'ole-save-btn-saved' : 'ole-save-btn-unsaved'}`}
              onClick={handleSave}
              disabled={saving || saved || !docIdRef.current}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
            </button>
          </div>
        </div>
        <div className="ole-body">
          {/* Left: canvas */}
          <div className="ole-canvas-wrap">
            {/* 3-column layout canvas */}
            <div className="ole-canvas">
              {/* Column 1 */}
              <div className="ole-column">
                <div className="ole-column-header">
                  <span className="ole-column-title">Column 1</span>
                </div>
                {layout.column1.slice(0, 3).map((_, i) => (
                  <DropSlot
                    key={`col1-${i}`}
                    slotId={`col1-${i}`}
                    label={COL1_LABELS[i] ?? 'Article'}
                    article={getArticle('column1', i)}
                    showImage={layout.column1Images[i]}
                    isImageSlot={layout.column1Images[i]}
                    onClear={() => clearSlot(`col1-${i}`)}
                    imageToggle={
                      <label className="ole-image-toggle" title="Toggle image">
                        <input type="checkbox" checked={!!layout.column1Images[i]} onChange={() => toggleColumnImage('column1', i)} style={{ position: 'relative', top: '1px' }} />
                        <span style={{ textTransform: 'uppercase', color: '#999', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', position: 'relative', top: '-1px' }}>IMG</span>
                      </label>
                    }
                  />
                ))}

                {/* The guest-writer box's photo */}
                <PitchPhotoSlot
                  preview={pitchPreview}
                  missing={layout.pitch != null && !pitchPreview}
                  onClear={() => {
                    setLayout((prev) => ({ ...prev, pitch: null, pitchPositions: { ...NO_PITCH_POSITIONS } }));
                    setPitchPreview(null);
                    markDirty();
                  }}
                />

                {layout.column1.slice(3).map((_, ii) => {
                  const i = ii + 3;
                  return (
                    <DropSlot
                      key={`col1-${i}`}
                      slotId={`col1-${i}`}
                      label={COL1_LABELS[i] ?? 'Article'}
                      article={getArticle('column1', i)}
                      showImage={layout.column1Images[i]}
                      isImageSlot={layout.column1Images[i]}
                      onClear={() => clearSlot(`col1-${i}`)}
                      imageToggle={
                        <label className="ole-image-toggle" title="Toggle image">
                          <input type="checkbox" checked={!!layout.column1Images[i]} onChange={() => toggleColumnImage('column1', i)} style={{ position: 'relative', top: '1px' }} />
                          <span style={{ textTransform: 'uppercase', color: '#999', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', position: 'relative', top: '-1px' }}>IMG</span>
                        </label>
                      }
                    />
                  );
                })}
                <button className="ole-add-slot-btn" onClick={() => addSlot('column1')} disabled={layout.column1.length >= MAX_OPINION_SLOTS}>+ Add slot</button>
              </div>

              {/* Column 2 */}
              <div className="ole-column">
                <div className="ole-column-header">
                  <span className="ole-column-title">Column 2</span>
                </div>
                <DropSlot
                  slotId="col2-0"
                  label={COL2_LABELS[0]}
                  article={getArticle('column2', 0)}
                  showImage={layout.column2Images[0]}
                  isImageSlot={layout.column2Images[0]}
                  onClear={() => clearSlot('col2-0')}
                  imageToggle={
                    <label className="ole-image-toggle" title="Toggle image">
                      <input type="checkbox" checked={!!layout.column2Images[0]} onChange={() => toggleColumnImage('column2', 0)} style={{ position: 'relative', top: '1px' }} />
                      <span style={{ textTransform: 'uppercase', color: '#999', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', position: 'relative', top: '-1px' }}>IMG</span>
                    </label>
                  }
                />

                {/* Author Spotlight Carousel — inline editor */}
                <div className="ole-spotlight-section">
                  <div className="ole-spotlight-header">
                    <h3 className="ole-spotlight-title">Author Spotlight Carousel</h3>
                    <span className="ole-spotlight-count">{(layout.spotlight || []).length} in rotation</span>
                  </div>

                  <div className="ole-spotlight-list">
                    {(layout.spotlight || []).map((entry, i) => {
                      const user = userMap.get(entry.userId);
                      const name = user ? `${user.firstName} ${user.lastName}` : `User #${entry.userId}`;
                      const spotlight = layout.spotlight || [];
                      return (
                        <div key={entry.userId} className="ole-spotlight-entry">
                          <span className="ole-spotlight-entry-name">{name}</span>
                          <input
                            type="text"
                            className="ole-spotlight-input"
                            placeholder="Article title override"
                            value={entry.articleTitle || ''}
                            onChange={(e) => updateSpotlightEntry(i, { articleTitle: e.target.value || null })}
                          />
                          <input
                            type="text"
                            className="ole-spotlight-input"
                            placeholder="Article URL override"
                            value={entry.articleUrl || ''}
                            onChange={(e) => updateSpotlightEntry(i, { articleUrl: e.target.value || null })}
                          />
                          <div className="ole-spotlight-entry-actions">
                            <button className="ole-spotlight-btn" onClick={() => moveSpotlight(i, -1)} disabled={i === 0} title="Move up">↑</button>
                            <button className="ole-spotlight-btn" onClick={() => moveSpotlight(i, 1)} disabled={i === spotlight.length - 1} title="Move down">↓</button>
                            <button className="ole-spotlight-btn ole-spotlight-remove" onClick={() => removeSpotlight(i)} title="Remove">×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="ole-spotlight-add">
                    <input
                      type="text"
                      className="ole-spotlight-search"
                      placeholder="Search users to add…"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}

                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div className="ole-spotlight-dropdown">
                        {filteredUsers.slice(0, 8).map((u) => (
                          <button
                            key={u.id}
                            className="ole-spotlight-user-option"
                            onClick={() => addSpotlight(u.id)}
                          >
                            {u.firstName} {u.lastName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {layout.column2.slice(1).map((_, ii) => {
                  const i = ii + 1;
                  return (
                    <DropSlot
                      key={`col2-${i}`}
                      slotId={`col2-${i}`}
                      label={COL2_LABELS[i] ?? 'Article'}
                      article={getArticle('column2', i)}
                      showImage={layout.column2Images[i]}
                      isImageSlot={layout.column2Images[i]}
                      onClear={() => clearSlot(`col2-${i}`)}
                      imageToggle={
                        <label className="ole-image-toggle" title="Toggle image">
                          <input type="checkbox" checked={!!layout.column2Images[i]} onChange={() => toggleColumnImage('column2', i)} style={{ position: 'relative', top: '1px' }} />
                          <span style={{ textTransform: 'uppercase', color: '#999', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', position: 'relative', top: '-1px' }}>IMG</span>
                        </label>
                      }
                    />
                  );
                })}
                <button className="ole-add-slot-btn" onClick={() => addSlot('column2')} disabled={layout.column2.length >= MAX_OPINION_SLOTS}>+ Add slot</button>
              </div>

              {/* Column 3 */}
              <div className="ole-column">
                <div className="ole-column-header">
                  <span className="ole-column-title">Column 3</span>
                </div>

                {/* Editor's Choice slots */}
                <div className="ole-ec-section">
                  <div className="ole-ec-header">{layout.editorsChoiceLabel}</div>
                  {EC_LABELS.map((label, i) => (
                    <DropSlot
                      key={`ec-${i}`}
                      slotId={`ec-${i}`}
                      label={label}
                      article={getArticle('editorsChoice', i)}
                      onClear={() => clearSlot(`ec-${i}`)}
                    />
                  ))}
                </div>

                {layout.column3.map((_, i) => (
                  <DropSlot
                    key={`col3-${i}`}
                    slotId={`col3-${i}`}
                    label={COL3_LABELS[i] ?? 'Article'}
                    article={getArticle('column3', i)}
                    showImage={layout.column3Images[i]}
                    isImageSlot={layout.column3Images[i]}
                    onClear={() => clearSlot(`col3-${i}`)}
                    imageToggle={
                      <label className="ole-image-toggle" title="Toggle image">
                        <input type="checkbox" checked={!!layout.column3Images[i]} onChange={() => toggleColumnImage('column3', i)} style={{ position: 'relative', top: '1px' }} />
                        <span style={{ textTransform: 'uppercase', color: '#999', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', position: 'relative', top: '-1px' }}>IMG</span>
                      </label>
                    }
                  />
                ))}
                <button className="ole-add-slot-btn" onClick={() => addSlot('column3')} disabled={layout.column3.length >= MAX_OPINION_SLOTS}>+ Add slot</button>
              </div>
            </div>

            {layout.pitch != null && pitchPreview && (
              <PitchPositionsEditor
                photo={pitchPreview}
                positions={layout.pitchPositions}
                onChange={(next) => {
                  setLayout((prev) => ({ ...prev, pitchPositions: next }));
                  markDirty();
                }}
                page="/opinion"
                pageName="Opinion"
                heading="Guest writer photo position"
                labelClassName="ole-slot-label"
              />
            )}
          </div>

          {/* Right: Article pool */}
          <ArticlePool
            articles={poolArticles}
            usedIds={usedIds}
            search={search}
            onSearch={(value) => { setSearch(value); setSearchPage(1); }}
            hasMore={hasMore} busy={searching} onMore={() => setSearchPage((page) => page + 1)}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeArticle ? <DragOverlayCard article={activeArticle} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
    </SlotPickerContext.Provider>
  );
}
