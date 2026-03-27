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
  opinionType?: string | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

type SpotlightEntry = {
  userId: number;
  articleTitle?: string | null;
  articleUrl?: string | null;
};

type UserData = {
  id: number;
  firstName: string;
  lastName: string;
};

type OpinionLayout = {
  column1: (number | null)[];
  column2: (number | null)[];
  column3: (number | null)[];
  editorsChoice: (number | null)[];
  editorsChoiceLabel: string;
  spotlight: SpotlightEntry[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const EMPTY_LAYOUT: OpinionLayout = {
  column1: [null, null, null, null, null],
  column2: [null, null, null, null],
  column3: [null, null, null, null],
  editorsChoice: [null, null, null],
  editorsChoiceLabel: "Opinion\u2019s Choice",
  spotlight: [],
};

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

const extractDocId = (): string | null => {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('opinion-page-layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
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
        <div className="ole-slot-title">{article.title}</div>
        {author && <div className="ole-slot-author">{author}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Slot
// ---------------------------------------------------------------------------

function DropSlot({
  slotId, label, article, showImage, onClear, isImageSlot,
}: {
  slotId: string;
  label: string;
  article: ArticleData | null;
  showImage?: boolean;
  onClear: () => void;
  isImageSlot?: boolean;
}) {
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
        {article && (
          <button className="ole-slot-clear" onClick={onClear} title="Remove article">&times;</button>
        )}
      </div>
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
        <div className="ole-pool-card-title">{article.title}</div>
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
        <div className="ole-drag-overlay-title">{article.title}</div>
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
      return a.title.toLowerCase().includes(q) || getAuthorString(a).toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        borderLeft: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 53px)',
        position: 'sticky',
        top: '53px',
        background: isOver ? 'rgba(59,130,246,0.04)' : undefined,
        outline: isOver ? '2px dashed #3b82f6' : undefined,
        outlineOffset: isOver ? '-2px' : undefined,
      }}
    >
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>Opinion Articles</div>
      <div style={{ padding: '8px 14px 0' }}>
        <input
          type="search"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 10px',
            fontSize: '13px',
            lineHeight: '1.4',
            border: '1px solid #ccc',
            borderRadius: '6px',
            outline: 'none',
            background: '#f5f5f5',
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.3, fontSize: '0.75rem' }}>No articles found</div>
        )}
        {filtered.slice(0, 10).map((article) => (
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
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const docIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const usedIds = collectUsedIds(layout);

  // ---- Fetch ----
  // Fetch users for spotlight picker
  useEffect(() => {
    fetch('/api/users?limit=200&depth=0&select[firstName]=true&select[lastName]=true')
      .then((r) => r.json())
      .then((d) => setUsers(d.docs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Fetch opinion articles
        const artRes = await fetch(
          '/api/articles?where[section][equals]=opinion&where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' +
          '&select[title]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
          '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
          '&select[authors]=true&select[writeInAuthors]=true&select[opinionType]=true',
        );
        const artData = await artRes.json();
        setArticles(artData.docs || []);

        // Find or create the single layout doc
        let id = extractDocId();
        let layoutData: Record<string, unknown> | null = null;

        if (id) {
          const layoutRes = await fetch(`/api/opinion-page-layout/${id}?depth=1`);
          if (layoutRes.ok) { layoutData = await layoutRes.json(); } else { id = null; }
        }
        if (!id) {
          const listRes = await fetch('/api/opinion-page-layout?limit=1&depth=1');
          const listData = await listRes.json();
          if (listData.docs?.length > 0) {
            layoutData = listData.docs[0];
            id = String((layoutData as Record<string, unknown>).id);
          }
        }
        if (!id) {
          const createRes = await fetch('/api/opinion-page-layout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Opinion Layout' }),
          });
          if (createRes.ok) {
            const c = await createRes.json(); id = String(c.doc.id); layoutData = c.doc;
          } else {
            setError('Failed to create layout document. Check your permissions.');
          }
        }
        docIdRef.current = id;

        if (layoutData) {
          const savedLayout = layoutData.layout as OpinionLayout | undefined;
          if (savedLayout && typeof savedLayout === 'object') {
            setLayout({
              column1: padArray(savedLayout.column1, 5),
              column2: padArray(savedLayout.column2, 4),
              column3: padArray(savedLayout.column3, 4),
              editorsChoice: padArray(savedLayout.editorsChoice, 3),
              editorsChoiceLabel: savedLayout.editorsChoiceLabel || "Opinion\u2019s Choice",
              spotlight: (savedLayout as OpinionLayout).spotlight || [],
            });
          } else {
            // Migrate from legacy fields
            const getRelId = (val: unknown): number | null => {
              if (typeof val === 'number') return val;
              if (val && typeof val === 'object' && 'id' in val) return (val as { id: number }).id;
              return null;
            };
            const ec1 = getRelId(layoutData.editorsChoice1);
            const ec2 = getRelId(layoutData.editorsChoice2);
            const ec3 = getRelId(layoutData.editorsChoice3);
            const ecLabel = (layoutData.editorsChoiceLabel as string) || "Opinion\u2019s Choice";
            setLayout({
              ...EMPTY_LAYOUT,
              editorsChoice: [ec1, ec2, ec3],
              editorsChoiceLabel: ecLabel,
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

  const setSlot = useCallback((column: keyof OpinionLayout, index: number, articleId: number | null) => {
    setLayout((prev) => {
      const col = [...(prev[column] as (number | null)[])];
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

  // ---- Spotlight ----
  const addSpotlight = useCallback((userId: number) => {
    setLayout((prev) => {
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
      // Trim trailing nulls from columns
      const trimmed = {
        column1: trimTrailingNulls(layout.column1),
        column2: trimTrailingNulls(layout.column2),
        column3: trimTrailingNulls(layout.column3),
        editorsChoice: trimTrailingNulls(layout.editorsChoice),
        editorsChoiceLabel: layout.editorsChoiceLabel,
        spotlight: layout.spotlight || [],
      };

      const res = await fetch(`/api/opinion-page-layout/${docIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: trimmed }),
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
              disabled={saving || saved}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
            </button>
          </div>
        </div>
        <div className="ole-body" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, minHeight: 'calc(100vh - 53px)' }}>
          {/* Left: canvas */}
          <div className="ole-canvas-wrap">
            {/* 3-column layout canvas */}
            <div className="ole-canvas">
              {/* Column 1 */}
              <div className="ole-column">
                <div className="ole-column-header">
                  <span className="ole-column-title">Column 1</span>
                </div>
                <DropSlot slotId="col1-0" label={COL1_LABELS[0]} article={getArticle('column1', 0)} showImage onClear={() => clearSlot('col1-0')} isImageSlot />
                <DropSlot slotId="col1-1" label={COL1_LABELS[1]} article={getArticle('column1', 1)} onClear={() => clearSlot('col1-1')} />
                <DropSlot slotId="col1-2" label={COL1_LABELS[2]} article={getArticle('column1', 2)} onClear={() => clearSlot('col1-2')} />

                {/* Fixed CTA */}
                <div className="ole-cta-block">
                  <p className="ole-cta-text">
                    Interested in being a guest writer? <span className="ole-cta-link">Learn more.</span>
                  </p>
                </div>

                <DropSlot slotId="col1-3" label={COL1_LABELS[3]} article={getArticle('column1', 3)} onClear={() => clearSlot('col1-3')} />
                <DropSlot slotId="col1-4" label={COL1_LABELS[4]} article={getArticle('column1', 4)} onClear={() => clearSlot('col1-4')} />
              </div>

              {/* Column 2 */}
              <div className="ole-column">
                <div className="ole-column-header">
                  <span className="ole-column-title">Column 2</span>
                </div>
                <DropSlot slotId="col2-0" label={COL2_LABELS[0]} article={getArticle('column2', 0)} onClear={() => clearSlot('col2-0')} />

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
                      onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div className="ole-spotlight-dropdown">
                        {filteredUsers.slice(0, 8).map((u) => (
                          <button
                            key={u.id}
                            className="ole-spotlight-user-option"
                            onMouseDown={() => addSpotlight(u.id)}
                          >
                            {u.firstName} {u.lastName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DropSlot slotId="col2-1" label={COL2_LABELS[1]} article={getArticle('column2', 1)} onClear={() => clearSlot('col2-1')} />
                <DropSlot slotId="col2-2" label={COL2_LABELS[2]} article={getArticle('column2', 2)} showImage onClear={() => clearSlot('col2-2')} isImageSlot />
                <DropSlot slotId="col2-3" label={COL2_LABELS[3]} article={getArticle('column2', 3)} onClear={() => clearSlot('col2-3')} />
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

                <DropSlot slotId="col3-0" label={COL3_LABELS[0]} article={getArticle('column3', 0)} onClear={() => clearSlot('col3-0')} />
                <DropSlot slotId="col3-1" label={COL3_LABELS[1]} article={getArticle('column3', 1)} onClear={() => clearSlot('col3-1')} />
                <DropSlot slotId="col3-2" label={COL3_LABELS[2]} article={getArticle('column3', 2)} onClear={() => clearSlot('col3-2')} />
                <DropSlot slotId="col3-3" label={COL3_LABELS[3]} article={getArticle('column3', 3)} showImage onClear={() => clearSlot('col3-3')} isImageSlot />
              </div>
            </div>
          </div>

          {/* Right: Article pool */}
          <ArticlePool
            articles={articles}
            usedIds={usedIds}
            search={search}
            onSearch={setSearch}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeArticle ? <DragOverlayCard article={activeArticle} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function padArray(arr: (number | null)[] | undefined, len: number): (number | null)[] {
  const result = [...(arr || [])];
  while (result.length < len) result.push(null);
  return result.slice(0, len);
}

function trimTrailingNulls(arr: (number | null)[]): (number | null)[] {
  const result = [...arr];
  while (result.length > 0 && result[result.length - 1] === null) result.pop();
  return result;
}
