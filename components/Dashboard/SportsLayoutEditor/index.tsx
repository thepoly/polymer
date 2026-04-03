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
import './sports-layout-editor.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArticleData = {
  id: number;
  title: string;
  slug: string;
  section: string;
  publishedDate: string | null;
  createdAt: string;
  featuredImage?: { url?: string | null; alt?: string | null } | number | null;
  subdeck?: string | null;
  kicker?: string | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

type SportsLayout = {
  heroArticles: (number | null)[];
  rightColumn: (number | null)[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const EMPTY_LAYOUT: SportsLayout = {
  heroArticles: [null, null, null],
  rightColumn: [null, null, null, null],
};

const HERO_LABELS = ['Hero (large)', 'Bottom Left', 'Bottom Middle'];
const RIGHT_LABELS = ['Right 1', 'Right 2', 'Right 3', 'Right 4'];

type ColumnKey = 'heroArticles' | 'rightColumn';

const parseSlotId = (slotId: string): { column: ColumnKey; index: number } | null => {
  const [prefix, idxStr] = slotId.split('-');
  const index = Number(idxStr);
  if (prefix === 'hero') return { column: 'heroArticles', index };
  if (prefix === 'right') return { column: 'rightColumn', index };
  return null;
};

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

const extractDocId = (): string | null => {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('sports-page-layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
};

const collectUsedIds = (layout: SportsLayout): Set<number> => {
  const ids = new Set<number>();
  for (const id of layout.heroArticles) {
    if (id !== null) ids.add(id);
  }
  for (const id of layout.rightColumn) {
    if (id !== null) ids.add(id);
  }
  return ids;
};

// ---------------------------------------------------------------------------
// Draggable Article in Slot
// ---------------------------------------------------------------------------

function DraggableSlotArticle({ article, slotId }: { article: ArticleData; slotId: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`sle-slot-body ${isDragging ? 'sle-dragging' : ''}`}
    >
      <SlotPreview article={article} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot Preview
// ---------------------------------------------------------------------------

function SlotPreview({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  const author = getAuthorString(article);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' }}>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div className="sle-slot-title">{article.title}</div>
        {author && <div className="sle-slot-author">{author}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Slot
// ---------------------------------------------------------------------------

function DropSlot({
  slotId, label, article, onClear,
}: {
  slotId: string;
  label: string;
  article: ArticleData | null;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${slotId}`,
    data: { slotId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`sle-slot ${isOver ? 'sle-slot-over' : ''} ${article ? 'sle-slot-filled' : ''}`}
    >
      <div className="sle-slot-header">
        <span className="sle-slot-label">{label}</span>
        {article && (
          <button className="sle-slot-clear" onClick={onClear} title="Remove article">&times;</button>
        )}
      </div>
      {article ? (
        <DraggableSlotArticle article={article} slotId={slotId} />
      ) : (
        <div className="sle-slot-empty">
          <div className="sle-slot-empty-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
            </svg>
            <span>Drop article</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool Card
// ---------------------------------------------------------------------------

function DraggablePoolCard({ article, isUsed }: { article: ArticleData; isUsed: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${article.id}`,
    data: { article, source: 'pool' },
  });
  const imageUrl = getImageUrl(article);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`sle-pool-card ${isDragging ? 'sle-dragging' : ''} ${isUsed ? 'sle-used' : ''}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="sle-pool-thumb"><img src={imageUrl} alt="" /></div>
      ) : (
        <div className="sle-pool-thumb sle-pool-thumb-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
      <div className="sle-pool-card-body">
        <div className="sle-pool-card-title">{article.title}</div>
        <div className="sle-pool-card-meta">
          <span className="sle-pool-card-date">{formatDate(article.publishedDate)}</span>
        </div>
      </div>
      {isUsed && <div className="sle-used-badge">In use</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag Overlay
// ---------------------------------------------------------------------------

function DragOverlayCard({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  return (
    <div className="sle-drag-overlay">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imageUrl && <div className="sle-drag-overlay-img"><img src={imageUrl} alt="" /></div>}
      <div className="sle-drag-overlay-body">
        <div className="sle-drag-overlay-title">{article.title}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Article Pool
// ---------------------------------------------------------------------------

function ArticlePool({
  articles, usedIds, search, onSearch,
}: {
  articles: ArticleData[];
  usedIds: Set<number>;
  search: string;
  onSearch: (v: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool-drop-zone', data: { pool: true } });

  const filtered = articles.filter((a) => {
    if (usedIds.has(a.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || getAuthorString(a).toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      ref={setNodeRef}
      className="sle-pool"
      style={{
        background: isOver ? 'rgba(59,130,246,0.04)' : undefined,
        outline: isOver ? '2px dashed #3b82f6' : undefined,
        outlineOffset: isOver ? '-2px' : undefined,
      }}
    >
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>Sports Articles</div>
      <div style={{ padding: '8px 14px 0' }}>
        <input
          type="search"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="sle-pool-search"
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.3, fontSize: '0.75rem' }}>No articles found</div>
        )}
        {filtered.slice(0, 20).map((article) => (
          <DraggablePoolCard key={article.id} article={article} isUsed={usedIds.has(article.id)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pad helper
// ---------------------------------------------------------------------------

const padArray = (arr: unknown[] | undefined, len: number): (number | null)[] => {
  const result: (number | null)[] = [];
  for (let i = 0; i < len; i++) {
    const v = arr?.[i];
    result.push(typeof v === 'number' ? v : null);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function SportsLayoutEditor() {
  const [layout, setLayout] = useState<SportsLayout>(EMPTY_LAYOUT);
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const docIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Build map of all known articles by ID
  const articleMap = new Map<number, ArticleData>();
  for (const a of articles) articleMap.set(a.id, a);

  const usedIds = collectUsedIds(layout);

  // ---- Init ----
  useEffect(() => {
    (async () => {
      try {
        // Fetch sports articles
        const articlesRes = await fetch(
          '/api/articles?where[section][equals]=sports&where[_status][equals]=published&sort=-publishedDate&limit=30&depth=1' +
          '&select[title]=true&select[slug]=true&select[subdeck]=true&select[featuredImage]=true' +
          '&select[section]=true&select[kicker]=true&select[publishedDate]=true&select[createdAt]=true' +
          '&select[authors]=true&select[writeInAuthors]=true'
        );
        const articlesData = await articlesRes.json();
        setArticles(articlesData.docs || []);

        // Load or create layout doc
        let id = extractDocId();
        let layoutData: Record<string, unknown> | null = null;

        if (id) {
          const layoutRes = await fetch(`/api/sports-page-layout/${id}?depth=0`);
          if (layoutRes.ok) { layoutData = await layoutRes.json(); } else { id = null; }
        }
        if (!id) {
          const listRes = await fetch('/api/sports-page-layout?limit=1&depth=0');
          const listData = await listRes.json();
          if (listData.docs?.length > 0) {
            layoutData = listData.docs[0];
            id = String((layoutData as Record<string, unknown>).id);
          }
        }
        if (!id) {
          const createRes = await fetch('/api/sports-page-layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Sports Layout' }),
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

        if (layoutData) {
          const savedLayout = layoutData.layout as SportsLayout | undefined;
          if (savedLayout && typeof savedLayout === 'object') {
            setLayout({
              heroArticles: padArray(savedLayout.heroArticles, 3),
              rightColumn: padArray(savedLayout.rightColumn, 4),
            });
          }
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
  const markDirty = useCallback(() => setSaved(false), []);

  const setSlot = useCallback((column: ColumnKey, index: number, articleId: number | null) => {
    setLayout((prev) => {
      const col = [...prev[column]];
      col[index] = articleId;
      return { ...prev, [column]: col };
    });
    markDirty();
  }, [markDirty]);

  const clearSlot = useCallback((slotId: string) => {
    const parsed = parseSlotId(slotId);
    if (!parsed) return;
    setSlot(parsed.column, parsed.index, null);
  }, [setSlot]);

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
    const targetSlotId = overData.slotId as string;
    const targetParsed = parseSlotId(targetSlotId);
    if (!targetParsed) return;

    // If source was a slot, swap
    if (activeData.source === 'slot' && typeof activeData.slotId === 'string') {
      const sourceParsed = parseSlotId(activeData.slotId);
      if (sourceParsed) {
        const targetOldId = layout[targetParsed.column][targetParsed.index];
        setLayout((prev) => {
          const sourceCol = [...prev[sourceParsed.column]];
          const targetCol = sourceParsed.column === targetParsed.column
            ? sourceCol
            : [...prev[targetParsed.column]];

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
      const res = await fetch(`/api/sports-page-layout/${docIdRef.current}`, {
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
      <div className="sle-loading">
        <div className="sle-loading-spinner" />
        <span>Loading sports layout...</span>
      </div>
    );
  }

  const getArticle = (column: ColumnKey, index: number): ArticleData | null => {
    const id = layout[column][index];
    return id ? articleMap.get(id) || null : null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerThenCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="sle-root">
        {/* Toolbar */}
        <div className="sle-toolbar">
          <div className="sle-toolbar-left">
            <h2 className="sle-toolbar-title">Sports Page Layout</h2>
          </div>
          <div className="sle-toolbar-right">
            {error && <span className="sle-toolbar-error">{error}</span>}
            <button
              className={`sle-save-btn ${saved ? 'sle-save-btn-saved' : 'sle-save-btn-unsaved'}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Body: canvas + pool sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, minHeight: 'calc(100vh - 53px)' }}>
          {/* Canvas area */}
          <div style={{ padding: '20px 24px 40px', minWidth: 0 }}>
            {/* 3-column page grid mirroring the frontend layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto auto auto', gap: '12px' }}>
              {/* Hero (large) — top row, spans left 2 columns */}
              <div style={{ gridColumn: '1 / 3', gridRow: '1' }}>
                <DropSlot
                  slotId="hero-0"
                  label={HERO_LABELS[0]}
                  article={getArticle('heroArticles', 0)}
                  onClear={() => clearSlot('hero-0')}
                />
              </div>

              {/* Right 1 — top-right */}
              <div style={{ gridColumn: '3', gridRow: '1' }}>
                <DropSlot
                  slotId="right-0"
                  label={RIGHT_LABELS[0]}
                  article={getArticle('rightColumn', 0)}
                  onClear={() => clearSlot('right-0')}
                />
              </div>

              {/* Bottom Left */}
              <div style={{ gridColumn: '1', gridRow: '2' }}>
                <DropSlot
                  slotId="hero-1"
                  label={HERO_LABELS[1]}
                  article={getArticle('heroArticles', 1)}
                  onClear={() => clearSlot('hero-1')}
                />
              </div>

              {/* Bottom Middle */}
              <div style={{ gridColumn: '2', gridRow: '2' }}>
                <DropSlot
                  slotId="hero-2"
                  label={HERO_LABELS[2]}
                  article={getArticle('heroArticles', 2)}
                  onClear={() => clearSlot('hero-2')}
                />
              </div>

              {/* Right 2 — bottom-right */}
              <div style={{ gridColumn: '3', gridRow: '2' }}>
                <DropSlot
                  slotId="right-1"
                  label={RIGHT_LABELS[1]}
                  article={getArticle('rightColumn', 1)}
                  onClear={() => clearSlot('right-1')}
                />
              </div>

              {/* Right 3 — third row, right column */}
              <div style={{ gridColumn: '3', gridRow: '3' }}>
                <DropSlot
                  slotId="right-2"
                  label={RIGHT_LABELS[2]}
                  article={getArticle('rightColumn', 2)}
                  onClear={() => clearSlot('right-2')}
                />
              </div>

              {/* Right 4 — fourth row, right column */}
              <div style={{ gridColumn: '3', gridRow: '4' }}>
                <DropSlot
                  slotId="right-3"
                  label={RIGHT_LABELS[3]}
                  article={getArticle('rightColumn', 3)}
                  onClear={() => clearSlot('right-3')}
                />
              </div>
            </div>
          </div>

          {/* Article pool sidebar */}
          <ArticlePool
            articles={articles}
            usedIds={usedIds}
            search={search}
            onSearch={setSearch}
          />
        </div>
      </div>

      <DragOverlay>
        {activeArticle ? <DragOverlayCard article={activeArticle} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
