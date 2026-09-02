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
import {
  BOTTOM_SLOTS,
  COLUMN_COUNT,
  COLUMN_SLOTS,
  DEFAULT_COLUMN_LABELS,
  EMPTY_NEWS_LAYOUT_JSON,
  TOP_ROW_SLOTS,
  type NewsLayoutJson,
} from '@/components/News/newsLayout';
import './news-layout-editor.css';

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
  featuredImage?: { url?: string | null; alt?: string | null } | number | null;
  subdeck?: string | null;
  kicker?: string | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

// Slot ID format: "top-0", "sg-1", "col0-2", "bottom-3"
type SlotTarget =
  | { kind: 'topStory'; index: number }
  | { kind: 'studentGov'; index: number }
  | { kind: 'column'; column: number; index: number }
  | { kind: 'bottom'; index: number };

const parseSlotId = (slotId: string): SlotTarget | null => {
  const [prefix, idxStr] = slotId.split('-');
  const index = Number(idxStr);
  if (Number.isNaN(index)) return null;
  if (prefix === 'top') return { kind: 'topStory', index };
  if (prefix === 'sg') return { kind: 'studentGov', index };
  if (prefix === 'bottom') return { kind: 'bottom', index };
  if (prefix.startsWith('col')) {
    const column = Number(prefix.slice(3));
    if (Number.isNaN(column)) return null;
    return { kind: 'column', column, index };
  }
  return null;
};

// Read/write a single slot without caring which region it lives in.
const readSlot = (layout: NewsLayoutJson, target: SlotTarget): number | null => {
  if (target.kind === 'topStory') return layout.topStory[target.index] ?? null;
  if (target.kind === 'studentGov') return layout.studentGov[target.index] ?? null;
  if (target.kind === 'bottom') return layout.bottom[target.index] ?? null;
  return layout.columns[target.column]?.articles[target.index] ?? null;
};

const writeSlot = (layout: NewsLayoutJson, target: SlotTarget, value: number | null): NewsLayoutJson => {
  if (target.kind === 'topStory') {
    const topStory = [...layout.topStory];
    topStory[target.index] = value;
    return { ...layout, topStory };
  }
  if (target.kind === 'studentGov') {
    const studentGov = [...layout.studentGov];
    studentGov[target.index] = value;
    return { ...layout, studentGov };
  }
  if (target.kind === 'bottom') {
    const bottom = [...layout.bottom];
    bottom[target.index] = value;
    return { ...layout, bottom };
  }
  const columns = layout.columns.map((col, i) => {
    if (i !== target.column) return col;
    const articles = [...col.articles];
    articles[target.index] = value;
    return { ...col, articles };
  });
  return { ...layout, columns };
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
  const idx = parts.indexOf('news-page-layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
};

const collectUsedIds = (layout: NewsLayoutJson): Set<number> => {
  const ids = new Set<number>();
  const add = (list: (number | null)[]) => {
    for (const id of list) if (id !== null) ids.add(id);
  };
  add(layout.topStory);
  add(layout.studentGov);
  add(layout.bottom);
  for (const col of layout.columns) add(col.articles);
  return ids;
};

function padArray(arr: (number | null)[] | undefined, len: number): (number | null)[] {
  const result = [...(arr || [])];
  while (result.length < len) result.push(null);
  return result.slice(0, len);
}

function padBooleans(arr: boolean[] | undefined, len: number): boolean[] {
  const result = [...(arr || [])];
  while (result.length < len) result.push(false);
  return result.slice(0, len);
}

// ---------------------------------------------------------------------------
// Draggable Article in Slot
// ---------------------------------------------------------------------------

function DraggableSlotArticle({
  article,
  slotId,
  showImage,
}: {
  article: ArticleData;
  slotId: string;
  showImage?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`nle-slot-body ${isDragging ? 'nle-dragging' : ''}`}
    >
      <SlotPreview article={article} showImage={showImage} />
    </div>
  );
}

function SlotPreview({ article, showImage }: { article: ArticleData; showImage?: boolean }) {
  const imageUrl = getImageUrl(article);
  const author = getAuthorString(article);

  return (
    <div className="nle-slot-preview">
      {showImage && imageUrl && (
        <div className="nle-slot-image">
          <img src={imageUrl} alt="" />
        </div>
      )}
      <div className="nle-slot-text">
        <div className="nle-slot-title">{article.plainTitle}</div>
        {author && <div className="nle-slot-author">{author}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Slot
// ---------------------------------------------------------------------------

function DropSlot({
  slotId,
  label,
  article,
  showImage,
  onClear,
  isImageSlot,
  imageToggle,
}: {
  slotId: string;
  label: string;
  article: ArticleData | null;
  showImage?: boolean;
  onClear: () => void;
  isImageSlot?: boolean;
  imageToggle?: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop-${slotId}`, data: { slotId } });

  return (
    <div
      ref={setNodeRef}
      className={`nle-slot ${isOver ? 'nle-slot-over' : ''} ${article ? 'nle-slot-filled' : ''}`}
    >
      <div className="nle-slot-header">
        <span className="nle-slot-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {imageToggle}
          {article && (
            <button className="nle-slot-clear" onClick={onClear} title="Remove article">
              &times;
            </button>
          )}
        </div>
      </div>
      {article ? (
        <DraggableSlotArticle article={article} slotId={slotId} showImage={showImage} />
      ) : (
        <div className="nle-slot-empty">
          <div className="nle-slot-empty-inner">
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
          <span className="nle-slot-autofill">auto-fills if left empty</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

function DraggablePoolCard({ article, isUsed }: { article: ArticleData; isUsed: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${article.id}`,
    data: { article, source: 'pool' },
  });
  const imageUrl = getImageUrl(article);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`nle-pool-card ${isDragging ? 'nle-dragging' : ''} ${isUsed ? 'nle-used' : ''}`}
    >
      {imageUrl ? (
        <div className="nle-pool-thumb">
          <img src={imageUrl} alt="" />
        </div>
      ) : (
        <div className="nle-pool-thumb nle-pool-thumb-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
      <div className="nle-pool-card-body">
        <div className="nle-pool-card-title">{article.plainTitle}</div>
        <div className="nle-pool-card-meta">
          {article.kicker && <span className="nle-pool-card-kicker">{article.kicker}</span>}
          <span className="nle-pool-card-date">{formatDate(article.publishedDate)}</span>
        </div>
      </div>
      {isUsed && <div className="nle-used-badge">In use</div>}
    </div>
  );
}

function DragOverlayCard({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  return (
    <div className="nle-drag-overlay">
      {imageUrl && (
        <div className="nle-drag-overlay-img">
          <img src={imageUrl} alt="" />
        </div>
      )}
      <div className="nle-drag-overlay-body">
        <div className="nle-drag-overlay-title">{article.plainTitle}</div>
      </div>
    </div>
  );
}

function ArticlePool({
  articles,
  usedIds,
  search,
  onSearch,
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
      return (
        (a.plainTitle || '').toLowerCase().includes(q) ||
        (a.kicker || '').toLowerCase().includes(q) ||
        getAuthorString(a).toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      ref={setNodeRef}
      className="nle-pool"
      style={{
        background: isOver ? 'rgba(59,130,246,0.04)' : undefined,
        outline: isOver ? '2px dashed #3b82f6' : undefined,
        outlineOffset: isOver ? '-2px' : undefined,
      }}
    >
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>News Articles</div>
      <div style={{ padding: '8px 14px 0' }}>
        <input
          type="search"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="nle-pool-search"
        />
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
        }}
      >
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.3, fontSize: '0.75rem' }}>
            No articles found
          </div>
        )}
        {filtered.slice(0, 30).map((article) => (
          <DraggablePoolCard key={article.id} article={article} isUsed={usedIds.has(article.id)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function NewsLayoutEditor() {
  const [layout, setLayout] = useState<NewsLayoutJson>({ ...EMPTY_NEWS_LAYOUT_JSON });
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const docIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const usedIds = collectUsedIds(layout);

  // ---- Fetch ----
  useEffect(() => {
    (async () => {
      try {
        const artRes = await fetch(
          '/api/articles?where[section][equals]=news&where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' +
            '&select[title]=true&select[plainTitle]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
            '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
            '&select[authors]=true&select[writeInAuthors]=true',
        );
        const artData = await artRes.json();
        setArticles(artData.docs || []);

        let id = extractDocId();
        let layoutData: Record<string, unknown> | null = null;

        if (id) {
          const layoutRes = await fetch(`/api/news-page-layout/${id}?depth=0`);
          if (layoutRes.ok) {
            layoutData = await layoutRes.json();
          } else {
            id = null;
          }
        }
        if (!id) {
          const listRes = await fetch('/api/news-page-layout?limit=1&depth=0');
          const listData = await listRes.json();
          if (listData.docs?.length > 0) {
            layoutData = listData.docs[0];
            id = String((layoutData as Record<string, unknown>).id);
          }
        }
        if (!id) {
          const createRes = await fetch('/api/news-page-layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'News Layout' }),
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
          const savedLayout = layoutData.layout as Partial<NewsLayoutJson> | undefined;
          if (savedLayout && typeof savedLayout === 'object') {
            const savedColumns = Array.isArray(savedLayout.columns) ? savedLayout.columns : [];
            setLayout({
              topStory: padArray(savedLayout.topStory, 1),
              studentGovLabel: savedLayout.studentGovLabel || EMPTY_NEWS_LAYOUT_JSON.studentGovLabel,
              studentGov: padArray(savedLayout.studentGov, TOP_ROW_SLOTS),
              studentGovImages: padBooleans(savedLayout.studentGovImages, TOP_ROW_SLOTS),
              columns: Array.from({ length: COLUMN_COUNT }, (_, i) => ({
                label: savedColumns[i]?.label ?? DEFAULT_COLUMN_LABELS[i],
                articles: padArray(savedColumns[i]?.articles, COLUMN_SLOTS),
                images: padBooleans(savedColumns[i]?.images, COLUMN_SLOTS),
              })),
              bottomLabel: savedLayout.bottomLabel || EMPTY_NEWS_LAYOUT_JSON.bottomLabel,
              bottom: padArray(savedLayout.bottom, BOTTOM_SLOTS),
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

  const setSlot = useCallback(
    (target: SlotTarget, articleId: number | null) => {
      setLayout((prev) => writeSlot(prev, target, articleId));
      markDirty();
    },
    [markDirty],
  );

  const clearSlot = useCallback(
    (slotId: string) => {
      const parsed = parseSlotId(slotId);
      if (!parsed) return;
      setSlot(parsed, null);
    },
    [setSlot],
  );

  const setColumnLabel = useCallback(
    (columnIndex: number, label: string) => {
      setLayout((prev) => ({
        ...prev,
        columns: prev.columns.map((col, i) => (i === columnIndex ? { ...col, label } : col)),
      }));
      markDirty();
    },
    [markDirty],
  );

  const setStudentGovLabel = useCallback(
    (label: string) => {
      setLayout((prev) => ({ ...prev, studentGovLabel: label }));
      markDirty();
    },
    [markDirty],
  );

  const setBottomLabel = useCallback(
    (label: string) => {
      setLayout((prev) => ({ ...prev, bottomLabel: label }));
      markDirty();
    },
    [markDirty],
  );

  const toggleStudentGovImage = useCallback(
    (index: number) => {
      setLayout((prev) => {
        const studentGovImages = [...prev.studentGovImages];
        studentGovImages[index] = !studentGovImages[index];
        return { ...prev, studentGovImages };
      });
      markDirty();
    },
    [markDirty],
  );

  const toggleColumnImage = useCallback(
    (columnIndex: number, index: number) => {
      setLayout((prev) => ({
        ...prev,
        columns: prev.columns.map((col, i) => {
          if (i !== columnIndex) return col;
          const images = [...col.images];
          const currentCount = images.filter(Boolean).length;
          if (!images[index] && currentCount >= 2) return col;
          images[index] = !images[index];
          return { ...col, images };
        }),
      }));
      markDirty();
    },
    [markDirty],
  );

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

    // Drop onto the pool = remove from its slot
    if (overData?.pool === true) {
      if (activeData.source === 'slot' && typeof activeData.slotId === 'string') {
        clearSlot(activeData.slotId);
      }
      return;
    }

    if (!overData?.slotId) return;
    const targetParsed = parseSlotId(overData.slotId as string);
    if (!targetParsed) return;

    // Slot to slot = swap whatever was there
    if (activeData.source === 'slot' && typeof activeData.slotId === 'string') {
      const sourceParsed = parseSlotId(activeData.slotId);
      if (sourceParsed) {
        setLayout((prev) => {
          const targetOldId = readSlot(prev, targetParsed);
          let next = writeSlot(prev, targetParsed, draggedArticle.id);
          next = writeSlot(next, sourceParsed, targetOldId);
          return next;
        });
        markDirty();
        return;
      }
    }

    setSlot(targetParsed, draggedArticle.id);
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!docIdRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/news-page-layout/${docIdRef.current}`, {
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
      <div className="nle-loading">
        <div className="nle-loading-spinner" />
        <span>Loading news layout...</span>
      </div>
    );
  }

  const getArticle = (target: SlotTarget): ArticleData | null => {
    const id = readSlot(layout, target);
    return id ? articleMap.get(id) || null : null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerThenCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="nle-root">
        {/* Toolbar */}
        <div className="nle-toolbar">
          <div className="nle-toolbar-left">
            <h2 className="nle-toolbar-title">News Page Layout</h2>
            <span className="nle-toolbar-hint">
              Drag articles from the right. Empty slots fill themselves with recent news.
            </span>
          </div>
          <div className="nle-toolbar-right">
            {error && <span className="nle-toolbar-error">{error}</span>}
            <button
              className={`nle-save-btn ${saved ? 'nle-save-btn-saved' : 'nle-save-btn-unsaved'}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
            </button>
          </div>
        </div>

        <div className="nle-body">
          <div className="nle-canvas-wrap">
            {/* ── Top row: Top Story + a row of Student Government articles ── */}
            <div className="nle-top-row">
              <div className="nle-column nle-top-story-column">
                <div className="nle-column-header">
                  <span className="nle-column-title">Top Story</span>
                  <span className="nle-column-note">large lead, top left</span>
                </div>
                <DropSlot
                  slotId="top-0"
                  label="Top Story (large image)"
                  article={getArticle({ kind: 'topStory', index: 0 })}
                  showImage
                  onClear={() => clearSlot('top-0')}
                  isImageSlot
                />
              </div>

              <div className="nle-column nle-top-side-column">
                <div className="nle-column-header">
                  <input
                    className="nle-column-label-input"
                    value={layout.studentGovLabel}
                    onChange={(e) => setStudentGovLabel(e.target.value)}
                    placeholder="Section heading"
                    aria-label="Top row heading"
                  />
                  <span className="nle-column-note">row beside the top story</span>
                </div>
                <div className="nle-slot-row">
                  {Array.from({ length: TOP_ROW_SLOTS }, (_, i) => (
                    <DropSlot
                      key={`sg-${i}`}
                      slotId={`sg-${i}`}
                      label={`Article ${i + 1}`}
                      article={getArticle({ kind: 'studentGov', index: i })}
                      showImage={layout.studentGovImages[i]}
                      onClear={() => clearSlot(`sg-${i}`)}
                      isImageSlot={layout.studentGovImages[i]}
                      imageToggle={
                        <label className="nle-image-toggle" title="Toggle image">
                          <input
                            type="checkbox"
                            checked={layout.studentGovImages[i]}
                            onChange={() => toggleStudentGovImage(i)}
                          />
                          img
                        </label>
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="nle-row-divider" />

            {/* ── Three renamable columns ── */}
            <div className="nle-canvas">
              {layout.columns.map((column, columnIndex) => {
                const imageCount = column.images.filter(Boolean).length;
                return (
                  <div className="nle-column" key={`col-${columnIndex}`}>
                    <div className="nle-column-header">
                      <input
                        className="nle-column-label-input"
                        value={column.label}
                        onChange={(e) => setColumnLabel(columnIndex, e.target.value)}
                        placeholder="Column heading"
                        aria-label={`Column ${columnIndex + 1} heading`}
                      />
                      <span className="nle-column-note">{imageCount}/2 imgs</span>
                    </div>
                    {Array.from({ length: COLUMN_SLOTS }, (_, i) => (
                      <DropSlot
                        key={`col${columnIndex}-${i}`}
                        slotId={`col${columnIndex}-${i}`}
                        label={`Article ${i + 1}`}
                        article={getArticle({ kind: 'column', column: columnIndex, index: i })}
                        showImage={column.images[i]}
                        onClear={() => clearSlot(`col${columnIndex}-${i}`)}
                        isImageSlot={column.images[i]}
                        imageToggle={
                          imageCount >= 2 && !column.images[i] ? (
                            <span className="nle-locked">locked</span>
                          ) : (
                            <label className="nle-image-toggle" title="Toggle image">
                              <input
                                type="checkbox"
                                checked={column.images[i]}
                                onChange={() => toggleColumnImage(columnIndex, i)}
                              />
                              img
                            </label>
                          )
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="nle-row-divider" />

            {/* ── Bottom strip ── */}
            <div className="nle-column nle-bottom-column">
              <div className="nle-column-header">
                <input
                  className="nle-column-label-input"
                  value={layout.bottomLabel}
                  onChange={(e) => setBottomLabel(e.target.value)}
                  placeholder="Bottom heading"
                  aria-label="Bottom strip heading"
                />
                <span className="nle-column-note">drag anything here</span>
              </div>
              <div className="nle-slot-row nle-slot-row-5">
                {Array.from({ length: BOTTOM_SLOTS }, (_, i) => (
                  <DropSlot
                    key={`bottom-${i}`}
                    slotId={`bottom-${i}`}
                    label={`Slot ${i + 1}`}
                    article={getArticle({ kind: 'bottom', index: i })}
                    showImage
                    onClear={() => clearSlot(`bottom-${i}`)}
                    isImageSlot
                  />
                ))}
              </div>
            </div>
          </div>

          <ArticlePool articles={articles} usedIds={usedIds} search={search} onSearch={setSearch} />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeArticle ? <DragOverlayCard article={activeArticle} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
