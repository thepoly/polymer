'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TimelinePageEditor } from '../TimelinePageEditor';
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
// Shares the Features editor's styles so all section layout editors look the same
import '../FeaturesLayoutEditor/features-layout-editor.css';
import '../TimelinePageEditor/timeline-page-editor.css';
import {
  DEFAULT_LEAD_TEXT_POSITION,
  LEAD_TEXT_POSITIONS,
  isLeadTextPosition,
  type LeadTextPosition,
  type NewsLayout,
} from '@/components/News/newsLayout';
import {
  DEFAULT_STUDENT_GOV_LAYOUT,
  STUDENT_GOV,
  normalizeStudentGovLayout,
  type StudentGovBody,
  type StudentGovBoxConfig,
  type StudentGovLayout,
} from '@/components/News/studentGov';

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
// Helpers
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

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

// ---------------------------------------------------------------------------
// Slot
// ---------------------------------------------------------------------------

function DraggableSlotArticle({ article, slotId }: { article: ArticleData; slotId: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
  });
  const imageUrl = getImageUrl(article);
  const author = getAuthorString(article);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`fle-slot-body ${isDragging ? 'fle-dragging' : ''}`}>
      <div className="fle-slot-preview">
        {imageUrl && (
          <div className="fle-slot-image">
            <img src={imageUrl} alt="" />
          </div>
        )}
        <div className="fle-slot-text">
          <div className="fle-slot-title">{article.plainTitle}</div>
          {author && <div className="fle-slot-author">{author}</div>}
        </div>
      </div>
    </div>
  );
}

function DropSlot({
  slotId,
  label,
  article,
  emptyHint,
  onClear,
}: {
  slotId: string;
  label: string;
  article: ArticleData | null;
  emptyHint: string;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop-${slotId}`, data: { slotId } });
  const missingImage = article !== null && !getImageUrl(article);

  return (
    <div ref={setNodeRef} className={`fle-slot ${isOver ? 'fle-slot-over' : ''} ${article ? 'fle-slot-filled' : ''}`}>
      <div className="fle-slot-header">
        <span className="fle-slot-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {missingImage && (
            <span style={{ fontSize: '0.62rem', color: '#C41E3A', fontWeight: 600 }} title="This article has no featured image">
              no image
            </span>
          )}
          {article && (
            <button className="fle-slot-clear" onClick={onClear} title="Remove article">&times;</button>
          )}
        </div>
      </div>
      {article ? (
        <DraggableSlotArticle article={article} slotId={slotId} />
      ) : (
        <div className="fle-slot-empty">
          <div className="fle-slot-empty-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
            </svg>
            <span>{emptyHint}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text position picker: a small diagram per option, text block vs photo
// ---------------------------------------------------------------------------

function PositionDiagram({ position }: { position: LeadTextPosition }) {
  const photo = <div style={{ flex: '1 1 0', minWidth: 0, minHeight: 0, background: 'currentColor', opacity: 0.35, borderRadius: 2 }} />;
  const text = (
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 3, padding: 2, width: position === 'east' || position === 'west' ? '42%' : undefined }}>
      <div style={{ height: 3, width: '40%', background: '#C41E3A', borderRadius: 1 }} />
      <div style={{ height: 5, width: '90%', background: 'currentColor', borderRadius: 1 }} />
      <div style={{ height: 5, width: '70%', background: 'currentColor', borderRadius: 1 }} />
      <div style={{ height: 3, width: '80%', background: 'currentColor', opacity: 0.4, borderRadius: 1 }} />
    </div>
  );
  const horizontal = position === 'east' || position === 'west';
  const textFirst = position === 'north' || position === 'west';
  return (
    <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', gap: 4, width: 84, height: 60 }}>
      {textFirst ? text : photo}
      {textFirst ? photo : text}
    </div>
  );
}

function PositionPicker({ value, onChange }: { value: LeadTextPosition; onChange: (p: LeadTextPosition) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Headline and subdeck position</span>
      <div role="radiogroup" aria-label="Headline and subdeck position" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LEAD_TEXT_POSITIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={opt.hint}
              onClick={() => onChange(opt.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: 8,
                borderRadius: 6,
                cursor: 'pointer',
                background: selected ? 'rgba(196,30,58,0.08)' : 'var(--theme-elevation-50, transparent)',
                border: selected ? '2px solid #C41E3A' : '2px solid var(--theme-elevation-150, #444)',
                color: 'var(--theme-text, inherit)',
              }}
            >
              <PositionDiagram position={opt.value} />
              <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{opt.label}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.55 }}>{opt.hint}</span>
            </button>
          );
        })}
      </div>
      <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
        Applies on desktop and tablets. On phones the text always sits under the photo.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student Government box (Senate or Executive Board)
// ---------------------------------------------------------------------------

const smallButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '6px 8px',
  fontSize: '0.68rem',
  fontWeight: 600,
  borderRadius: 4,
  cursor: 'pointer',
  background: active ? 'rgba(196,30,58,0.08)' : 'var(--theme-elevation-50, transparent)',
  border: active ? '1px solid #C41E3A' : '1px solid var(--theme-elevation-150, #444)',
  color: 'var(--theme-text, inherit)',
});

function StudentGovBoxEditor({
  body,
  position,
  config,
  article,
  onChange,
}: {
  body: StudentGovBody;
  position: 'Top' | 'Bottom';
  config: StudentGovBoxConfig;
  article: ArticleData | null;
  onChange: (next: StudentGovBoxConfig) => void;
}) {
  const meta = STUDENT_GOV[body];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        borderRadius: 6,
        border: '1px solid var(--theme-elevation-150, #333)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{meta.label}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{position}</span>
      </div>
      <div role="radiogroup" aria-label={`${meta.label} box shows`} style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          role="radio"
          aria-checked={config.mode === 'timeline'}
          onClick={() => onChange({ ...config, mode: 'timeline' })}
          style={smallButtonStyle(config.mode === 'timeline')}
        >
          Timeline bullets
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={config.mode === 'article'}
          onClick={() => onChange({ ...config, mode: 'article' })}
          style={smallButtonStyle(config.mode === 'article')}
        >
          One article
        </button>
      </div>
      {config.mode === 'timeline' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem' }}>
            Show the latest
            <select
              value={config.count}
              onChange={(e) => onChange({ ...config, count: e.target.value === '2' ? 2 : 3 })}
              style={{
                padding: '3px 6px',
                fontSize: '0.7rem',
                borderRadius: 4,
                border: '1px solid var(--theme-elevation-200, #333)',
                background: 'var(--theme-elevation-100, #1a1a1a)',
                color: 'var(--theme-text, #fff)',
              }}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
            entries
          </label>
          <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
            Newest articles with the &ldquo;{meta.kicker}&rdquo; kicker and {meta.label} updates, mixed by date.
          </span>
          <span style={{ fontSize: '0.62rem', display: 'flex', gap: 10 }}>
            <Link
              href={`?page=${body === 'senate' ? 'senate' : 'executive-board'}`}
              style={{ color: '#C41E3A', fontWeight: 600 }}
            >
              Edit page &amp; updates
            </Link>
            <a href={meta.href} target="_blank" rel="noreferrer" style={{ opacity: 0.7 }}>
              View timeline
            </a>
          </span>
        </div>
      ) : (
        <>
          <DropSlot
            slotId={`gov-${body}`}
            label={`${meta.label} article`}
            article={article}
            emptyHint="Drop an article (shows timeline bullets until one is placed)"
            onClear={() => onChange({ ...config, article: null })}
          />
        </>
      )}
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

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`fle-pool-card ${isDragging ? 'fle-dragging' : ''}`}>
      {imageUrl ? (
        <div className="fle-pool-thumb"><img src={imageUrl} alt="" /></div>
      ) : (
        <div className="fle-pool-thumb fle-pool-thumb-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
      <div className="fle-pool-card-body">
        <div className="fle-pool-card-title">{article.plainTitle}</div>
        <div className="fle-pool-card-meta">
          {article.kicker && <span>{article.kicker} · </span>}
          <span className="fle-pool-card-date">{formatDate(article.publishedDate)}</span>
        </div>
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
        getAuthorString(a).toLowerCase().includes(q) ||
        (a.kicker || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

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
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>News Articles</div>
      <div style={{ padding: '8px 14px 0' }}>
        <input
          type="search"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="fle-pool-search"
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.3, fontSize: '0.75rem' }}>No articles found</div>
        )}
        {filtered.slice(0, 30).map((article) => (
          <DraggablePoolCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

function DragOverlayCard({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  return (
    <div className="fle-drag-overlay">
      {imageUrl && <div className="fle-drag-overlay-img"><img src={imageUrl} alt="" /></div>}
      <div className="fle-drag-overlay-body">
        <div className="fle-drag-overlay-title">{article.plainTitle}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

/**
 * Edit view for `news-page-layout`. `?page=senate` / `?page=executive-board`
 * (from the dropdown beside News Layout in the sidebar) opens that timeline
 * page's editor instead; it saves into the same document.
 */
export function NewsLayoutEditor() {
  const page = useSearchParams().get('page');
  if (page === 'senate') return <TimelinePageEditor key="senate" body="senate" />;
  if (page === 'executive-board') return <TimelinePageEditor key="eboard" body="eboard" />;
  return <NewsPageEditor />;
}

function NewsPageEditor() {
  const [lead, setLead] = useState<number | null>(null);
  const [leadTextPosition, setLeadTextPosition] = useState<LeadTextPosition>(DEFAULT_LEAD_TEXT_POSITION);
  const [studentGov, setStudentGov] = useState<StudentGovLayout>(DEFAULT_STUDENT_GOV_LAYOUT);
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
  // Slots: "lead-0", "gov-senate", "gov-eboard". A box's pin only counts
  // while the box is in article mode.
  const slotArticleId = (slotId: string): number | null => {
    if (slotId === 'lead-0') return lead;
    if (slotId === 'gov-senate' || slotId === 'gov-eboard') {
      const box = studentGov[slotId === 'gov-senate' ? 'senate' : 'eboard'];
      return box.mode === 'article' ? box.article : null;
    }
    return null;
  };
  const usedIds = new Set<number>(
    ['lead-0', 'gov-senate', 'gov-eboard'].map(slotArticleId).filter((id): id is number => id !== null),
  );

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
          if (layoutRes.ok) { layoutData = await layoutRes.json(); } else { id = null; }
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

        const savedLayout = layoutData?.layout as Partial<NewsLayout> | undefined;
        if (savedLayout && typeof savedLayout === 'object') {
          setLead(savedLayout.lead ?? null);
          setLeadTextPosition(
            isLeadTextPosition(savedLayout.leadTextPosition) ? savedLayout.leadTextPosition : DEFAULT_LEAD_TEXT_POSITION,
          );
          setStudentGov(normalizeStudentGovLayout(savedLayout.studentGov));
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

  const changeLead = useCallback((id: number | null) => {
    setLead(id);
    markDirty();
  }, [markDirty]);

  const changePosition = useCallback((p: LeadTextPosition) => {
    setLeadTextPosition(p);
    markDirty();
  }, [markDirty]);

  const changeBox = useCallback((body: StudentGovBody, next: StudentGovBoxConfig) => {
    setStudentGov((prev) => ({ ...prev, [body]: next }));
    markDirty();
  }, [markDirty]);

  const swapStudentGovOrder = useCallback(() => {
    setStudentGov((prev) => ({ ...prev, order: [prev.order[1], prev.order[0]] }));
    markDirty();
  }, [markDirty]);

  const setSlotArticle = (slotId: string, id: number | null) => {
    if (slotId === 'lead-0') {
      setLead(id);
    } else if (slotId === 'gov-senate' || slotId === 'gov-eboard') {
      const body: StudentGovBody = slotId === 'gov-senate' ? 'senate' : 'eboard';
      setStudentGov((prev) => ({ ...prev, [body]: { ...prev[body], article: id } }));
    }
    markDirty();
  };

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

    const sourceSlot = activeData.source === 'slot' ? (activeData.slotId as string) : null;

    // Dragging a placed article back to the pool clears its slot
    if (overData?.pool === true) {
      if (sourceSlot) setSlotArticle(sourceSlot, null);
      return;
    }
    const targetSlot = overData?.slotId as string | undefined;
    if (!targetSlot || targetSlot === sourceSlot) return;

    // Slot to slot swaps the two; pool to slot replaces
    if (sourceSlot) setSlotArticle(sourceSlot, slotArticleId(targetSlot));
    setSlotArticle(targetSlot, (activeData.article as ArticleData).id);
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!docIdRef.current) return;
    setSaving(true);
    setError(null);
    try {
      // The Senate / Executive Board editors save into the same JSON, so
      // merge over the latest copy instead of replacing it
      const latest = await fetch(`/api/news-page-layout/${docIdRef.current}?depth=0`).then((r) => r.json());
      const layout: NewsLayout = { ...(latest?.layout ?? {}), lead, leadTextPosition, studentGov };
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
      <div className="fle-loading">
        <div className="fle-loading-spinner" />
        <span>Loading news layout...</span>
      </div>
    );
  }

  const leadArticle = lead !== null ? articleMap.get(lead) ?? null : null;

  return (
    <DndContext sensors={sensors} collisionDetection={pointerThenCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="fle-root">
        <div className="fle-toolbar">
          <div className="fle-toolbar-left">
            <h2 className="fle-toolbar-title">News Page Layout</h2>
            <nav className="tpe-tabs" aria-label="News layout pages">
              <span className="tpe-tab tpe-tab-active">News page</span>
              <Link href="?page=senate" className="tpe-tab">
                Senate
              </Link>
              <Link href="?page=executive-board" className="tpe-tab">
                Executive Board
              </Link>
            </nav>
          </div>
          <div className="fle-toolbar-right">
            {error && <span className="fle-toolbar-error">{error}</span>}
            <button
              className={`fle-save-btn ${saved ? 'fle-save-btn-saved' : 'fle-save-btn-unsaved'}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
            </button>
          </div>
        </div>

        <div className="fle-body">
          {/* Canvas mirrors the page: lead takes the left two thirds */}
          <div className="fle-canvas-wrap">
            <div className="fle-canvas" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Lead</span>
                </div>
                <DropSlot
                  slotId="lead-0"
                  label="Lead story (large image)"
                  article={leadArticle}
                  emptyHint="Drop article (empty uses the newest story with a photo)"
                  onClear={() => changeLead(null)}
                />
                <PositionPicker value={leadTextPosition} onChange={changePosition} />
              </div>
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Student Government</span>
                  <button
                    type="button"
                    onClick={swapStudentGovOrder}
                    title="Swap which box is on top"
                    style={{ ...smallButtonStyle(false), flex: 'none' }}
                  >
                    &#8645; Swap order
                  </button>
                </div>
                {studentGov.order.map((body, i) => (
                  <StudentGovBoxEditor
                    key={body}
                    body={body}
                    position={i === 0 ? 'Top' : 'Bottom'}
                    config={studentGov[body]}
                    article={studentGov[body].article !== null ? articleMap.get(studentGov[body].article as number) ?? null : null}
                    onChange={(next) => changeBox(body, next)}
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
