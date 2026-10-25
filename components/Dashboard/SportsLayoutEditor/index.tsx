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
// Shares the Features editor's styles so both layout editors look the same
import '../FeaturesLayoutEditor/features-layout-editor.css';
import {
  STANDINGS_SPORTS,
  OVERRIDE_DAYS,
  activeOverrides,
  seasonInfo,
  type Phase,
  type StandingsOverride,
} from '@/lib/standingsSchedule';
import type { ScoreboardDate } from '@/components/Sports/SportsSectionPage';
import { FEATURED_COUNT, type FeaturedFocus } from '@/components/Sports/sportsFormat';

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
  featuredImage?: { url?: string | null; alt?: string | null; focalX?: number | null; focalY?: number | null } | number | null;
  subdeck?: string | null;
  kicker?: string | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

// Stored shape (see collections/SportsPageLayout.ts)
type SportsLayout = {
  lead: number | null;
  showScoreboard: boolean;
  /** Day the lead's game was played, shown under the scoreboard */
  scoreboardDate: ScoreboardDate | null;
  belowLead: number | null;
  /** Second wide card, shown only when the scoreboard isn't */
  belowLead2: number | null;
  headlines: (number | null)[];
  featured: (number | null)[];
  featuredFocus: FeaturedFocus;
  /** RPI scores banner at the top; off shows the plain "Sports | Contact" header */
  showScoreStrip: boolean;
  /** Lead title overlaps its photo on desktop; off puts a plain title below */
  leadTitleOverlay: boolean;
  standingsOverrides: StandingsOverride[];
};

// Editor state keeps every slot group as an array so drag/drop is uniform
type SlotLayout = {
  lead: (number | null)[];
  belowLead: (number | null)[];
  headlines: (number | null)[];
  featured: (number | null)[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const HEADLINE_COUNT = 3;

const EMPTY_SLOTS: SlotLayout = {
  lead: [null],
  // [below lead, second below lead]
  belowLead: [null, null],
  headlines: Array(HEADLINE_COUNT).fill(null),
  featured: Array(FEATURED_COUNT).fill(null),
};

// Slot ID format: "lead-0", "below-0", "below-1", "head-2", "feat-6"
type ColumnKey = keyof SlotLayout;

const parseSlotId = (slotId: string): { column: ColumnKey; index: number } | null => {
  const [prefix, idxStr] = slotId.split('-');
  const index = Number(idxStr);
  if (prefix === 'lead') return { column: 'lead', index };
  if (prefix === 'below') return { column: 'belowLead', index };
  if (prefix === 'head') return { column: 'headlines', index };
  if (prefix === 'feat') return { column: 'featured', index };
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

const collectUsedIds = (slots: SlotLayout): Set<number> => {
  const ids = new Set<number>();
  for (const col of [slots.lead, slots.belowLead, slots.headlines, slots.featured]) {
    for (const id of col) {
      if (id !== null) ids.add(id);
    }
  }
  return ids;
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
      className={`fle-slot-body ${isDragging ? 'fle-dragging' : ''}`}
    >
      <SlotPreview article={article} showImage={showImage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot Preview
// ---------------------------------------------------------------------------

function SlotPreview({ article, showImage }: { article: ArticleData; showImage?: boolean }) {
  const imageUrl = getImageUrl(article);
  const author = getAuthorString(article);

  return (
    <div className="fle-slot-preview">
      {showImage && imageUrl && (
        <div className="fle-slot-image">
          <img src={imageUrl} alt="" />
        </div>
      )}
      <div className="fle-slot-text">
        <div className="fle-slot-title">{article.plainTitle}</div>
        {author && <div className="fle-slot-author">{author}</div>}
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
  const missingImage = article !== null && !getImageUrl(article);

  return (
    <div
      ref={setNodeRef}
      className={`fle-slot ${isOver ? 'fle-slot-over' : ''} ${article ? 'fle-slot-filled' : ''}`}
    >
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
        <DraggableSlotArticle article={article} slotId={slotId} showImage />
      ) : (
        <div className="fle-slot-empty">
          <div className="fle-slot-empty-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
            </svg>
            <span>Drop article (auto-fills if empty)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Slot (portrait card preview; drag the photo to reframe it)
// ---------------------------------------------------------------------------

const clampPercent = (n: number) => Math.max(0, Math.min(100, n));

/** The photo's own focal point, which a card uses until an editor reframes it */
const defaultFocus = (article: ArticleData) => {
  const image = typeof article.featuredImage === 'object' ? article.featuredImage : null;
  return {
    x: typeof image?.focalX === 'number' ? clampPercent(image.focalX) : 50,
    y: typeof image?.focalY === 'number' ? clampPercent(image.focalY) : 50,
  };
};

/**
 * The card as it appears on the page (4:5, dark shade, headline). Dragging the
 * photo pans it inside the card; the position is an object-position in %.
 */
function FramePreview({
  article,
  focus,
  onChange,
}: {
  article: ArticleData;
  focus: { x: number; y: number } | undefined;
  onChange: (focus: { x: number; y: number }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; from: { x: number; y: number } } | null>(null);
  const position = focus ?? defaultFocus(article);
  const imageUrl = getImageUrl(article);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imageUrl) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: position };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    const img = imgRef.current;
    if (!start || !box || !img?.naturalWidth) return;
    // How far the covered photo overhangs the card on each axis; moving the
    // pointer that far sweeps the position across its full 0–100% range
    const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const overX = img.naturalWidth * scale - box.width;
    const overY = img.naturalHeight * scale - box.height;
    onChange({
      x: overX > 0.5 ? Math.round(clampPercent(start.from.x - ((e.clientX - start.x) / overX) * 100)) : start.from.x,
      y: overY > 0.5 ? Math.round(clampPercent(start.from.y - ((e.clientY - start.y) / overY) * 100)) : start.from.y,
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title={imageUrl ? 'Drag the photo to choose what the card shows' : undefined}
      style={{
        position: 'relative',
        aspectRatio: '4 / 5',
        overflow: 'hidden',
        background: '#111',
        cursor: imageUrl ? 'grab' : 'default',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${position.x}% ${position.y}%`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 30%, rgba(0,0,0,0.25) 58%, rgba(0,0,0,0) 76%)',
        }}
      />
      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, pointerEvents: 'none' }}>
        <div style={{ width: 14, height: 2, background: '#C41E3A', marginBottom: 5 }} />
        <div
          style={{
            color: '#fff',
            fontSize: '0.66rem',
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.plainTitle}
        </div>
      </div>
    </div>
  );
}

function FeaturedSlot({
  index,
  article,
  focus,
  onClear,
  onFocusChange,
  onFocusReset,
}: {
  index: number;
  article: ArticleData | null;
  focus: { x: number; y: number } | undefined;
  onClear: () => void;
  onFocusChange: (focus: { x: number; y: number }) => void;
  onFocusReset: () => void;
}) {
  const slotId = `feat-${index}`;
  const { isOver, setNodeRef } = useDroppable({ id: `drop-${slotId}`, data: { slotId } });
  // Only the header moves the story between slots, so dragging the photo
  // reframes it instead
  const { attributes, listeners, setNodeRef: setHandleRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
    disabled: !article,
  });

  return (
    <div
      ref={setNodeRef}
      className={`fle-slot ${isOver ? 'fle-slot-over' : ''} ${article ? 'fle-slot-filled' : ''}`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        ref={setHandleRef}
        {...listeners}
        {...attributes}
        className="fle-slot-header"
        style={{ cursor: article ? 'grab' : 'default', padding: '5px 8px' }}
        title={article ? 'Drag to move this story' : undefined}
      >
        <span className="fle-slot-label">{index + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {article && focus && (
            <button
              type="button"
              className="fle-slot-clear"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onFocusReset}
              title="Reset framing to the photo's focal point"
              style={{ fontSize: '0.8rem' }}
            >
              &#8634;
            </button>
          )}
          {article && (
            <button
              type="button"
              className="fle-slot-clear"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClear}
              title="Remove article"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      {article ? (
        <FramePreview article={article} focus={focus} onChange={onFocusChange} />
      ) : (
        <div
          style={{
            aspectRatio: '4 / 5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 8,
            fontSize: '0.62rem',
            opacity: 0.35,
          }}
        >
          Drop article (auto-fills if empty)
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
      className={`fle-pool-card ${isDragging ? 'fle-dragging' : ''} ${isUsed ? 'fle-used' : ''}`}
    >
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
          <span className="fle-pool-card-date">{formatDate(article.publishedDate)}</span>
        </div>
      </div>
      {isUsed && <div className="fle-used-badge">In use</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag Overlay
// ---------------------------------------------------------------------------

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
// Article Pool
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
      return (a.plainTitle || '').toLowerCase().includes(q) || getAuthorString(a).toLowerCase().includes(q);
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
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>Sports Articles</div>
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
        {filtered.slice(0, 20).map((article) => (
          <DraggablePoolCard key={article.id} article={article} isUsed={usedIds.has(article.id)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standings Panel
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<Phase, string> = {
  live: 'Live',
  'winding-down': 'Wrapping up',
  off: 'Off season',
};

function StandingsPanel({
  overrides,
  now,
  onChange,
}: {
  overrides: StandingsOverride[];
  now: Date;
  onChange: (sport: StandingsOverride['sport'], mode: 'auto' | 'show' | 'hide') => void;
}) {
  const bySport = new Map(overrides.map((o) => [o.sport, o]));
  const statusOf = (entry: (typeof STANDINGS_SPORTS)[number]) => {
    const override = bySport.get(entry.sport);
    return override
      ? `${override.mode === 'show' ? 'Shown' : 'Hidden'} until ${new Date(override.until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : PHASE_LABELS[seasonInfo(entry, now).phase];
  };

  // Opens on a sport that's overridden, else one that's live
  const [selected, setSelected] = useState<StandingsOverride['sport']>(
    () =>
      (STANDINGS_SPORTS.find((e) => bySport.has(e.sport)) ??
        STANDINGS_SPORTS.find((e) => seasonInfo(e, now).phase === 'live') ??
        STANDINGS_SPORTS[0]).sport,
  );
  const entry = STANDINGS_SPORTS.find((e) => e.sport === selected) ?? STANDINGS_SPORTS[0];
  const mode = bySport.get(entry.sport)?.mode ?? 'auto';
  const active = STANDINGS_SPORTS.filter((e) => bySport.has(e.sport));

  return (
    <div className="fle-events-section">
      <div className="fle-events-header">Standings</div>
      <div style={{ fontSize: '0.68rem', opacity: 0.6, lineHeight: 1.4 }}>
        Sports pick themselves from the calendar (3–5 at a time). Show or Hide overrides that for {OVERRIDE_DAYS} days.
      </div>

      {/* One sport at a time: pick it here, set it below */}
      <select
        value={entry.sport}
        onChange={(e) => setSelected(e.target.value as StandingsOverride['sport'])}
        style={{
          width: '100%',
          padding: '5px 8px',
          fontSize: '0.72rem',
          borderRadius: 4,
          border: '1px solid var(--theme-elevation-200, #333)',
          background: 'var(--theme-elevation-100, #1a1a1a)',
          color: 'var(--theme-text, #fff)',
          cursor: 'pointer',
        }}
      >
        {STANDINGS_SPORTS.map((e) => (
          <option key={e.sport} value={e.sport}>
            {e.tabLabel}: {statusOf(e)}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{entry.tabLabel}</div>
          <div style={{ fontSize: '0.62rem', opacity: 0.5 }}>{statusOf(entry)}</div>
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--theme-elevation-200, #333)', borderRadius: 4, overflow: 'hidden' }}>
          {(['auto', 'show', 'hide'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange(entry.sport, m)}
              style={{
                padding: '3px 8px',
                fontSize: '0.62rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: 'none',
                cursor: 'pointer',
                background: mode === m ? '#C41E3A' : 'transparent',
                color: mode === m ? '#fff' : 'inherit',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Overrides stay visible without opening the dropdown */}
      {active.length > 0 && (
        <div style={{ fontSize: '0.62rem', opacity: 0.6, lineHeight: 1.5 }}>
          Active overrides: {active.map((e) => `${e.tabLabel} (${statusOf(e).toLowerCase()})`).join(', ')}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function SportsLayoutEditor() {
  const [slots, setSlots] = useState<SlotLayout>({ ...EMPTY_SLOTS });
  const [showScoreboard, setShowScoreboard] = useState(true);
  // Kept with the article it was entered for, so moving another story into
  // the lead shows an empty box rather than the old game's date
  const [scoreboardDate, setScoreboardDate] = useState<ScoreboardDate | null>(null);
  // Featured cards' framing by article id, so it follows a story between slots
  const [featuredFocus, setFeaturedFocus] = useState<FeaturedFocus>({});
  const [showScoreStrip, setShowScoreStrip] = useState(true);
  const [leadTitleOverlay, setLeadTitleOverlay] = useState(true);
  const [standingsOverrides, setStandingsOverrides] = useState<StandingsOverride[]>([]);
  const [now] = useState(() => new Date());
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
  const usedIds = collectUsedIds(slots);

  // ---- Fetch ----
  useEffect(() => {
    (async () => {
      try {
        const artRes = await fetch(
          '/api/articles?where[section][equals]=sports&where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' +
          '&select[title]=true&select[plainTitle]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
          '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
          '&select[authors]=true&select[writeInAuthors]=true',
        );
        const artData = await artRes.json();
        setArticles(artData.docs || []);

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
          const savedLayout = layoutData.layout as Partial<SportsLayout> | undefined;
          if (savedLayout && typeof savedLayout === 'object') {
            setSlots({
              lead: [savedLayout.lead ?? null],
              belowLead: [savedLayout.belowLead ?? null, savedLayout.belowLead2 ?? null],
              headlines: padArray(savedLayout.headlines, HEADLINE_COUNT),
              featured: padArray(savedLayout.featured, FEATURED_COUNT),
            });
            setShowScoreboard(savedLayout.showScoreboard ?? true);
            setScoreboardDate(savedLayout.scoreboardDate ?? null);
            setFeaturedFocus(savedLayout.featuredFocus ?? {});
            setShowScoreStrip(savedLayout.showScoreStrip ?? true);
            setLeadTitleOverlay(savedLayout.leadTitleOverlay ?? true);
            // Expired overrides are dropped; the next save clears them for good
            setStandingsOverrides(activeOverrides(savedLayout.standingsOverrides, new Date()));
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
    setSlots((prev) => {
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

  const setStandingsMode = useCallback((sport: StandingsOverride['sport'], mode: 'auto' | 'show' | 'hide') => {
    setStandingsOverrides((prev) => {
      const rest = prev.filter((o) => o.sport !== sport);
      if (mode === 'auto') return rest;
      const until = new Date(Date.now() + OVERRIDE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      return [...rest, { sport, mode, until }];
    });
    markDirty();
  }, [markDirty]);

  const toggleScoreboard = useCallback(() => {
    setShowScoreboard((prev) => !prev);
    markDirty();
  }, [markDirty]);

  const changeScoreboardDate = useCallback((articleId: number, date: string) => {
    setScoreboardDate(date ? { articleId, date } : null);
    markDirty();
  }, [markDirty]);

  const changeFeaturedFocus = useCallback((articleId: number, focus: { x: number; y: number } | null) => {
    setFeaturedFocus((prev) => {
      const next = { ...prev };
      if (focus) next[String(articleId)] = focus;
      else delete next[String(articleId)];
      return next;
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
        const targetOldId = slots[targetParsed.column][targetParsed.index];
        setSlots((prev) => {
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
    const leadId = slots.lead[0];
    const layout: SportsLayout = {
      lead: leadId,
      showScoreboard,
      // A date entered for an earlier lead is dropped
      scoreboardDate: scoreboardDate && scoreboardDate.articleId === leadId ? scoreboardDate : null,
      standingsOverrides,
      belowLead: slots.belowLead[0],
      belowLead2: slots.belowLead[1],
      headlines: slots.headlines,
      featured: slots.featured,
      showScoreStrip,
      leadTitleOverlay,
      // Only framing for stories still in the row is kept
      featuredFocus: Object.fromEntries(
        Object.entries(featuredFocus).filter(([id]) => slots.featured.includes(Number(id))),
      ),
    };
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
      <div className="fle-loading">
        <div className="fle-loading-spinner" />
        <span>Loading sports layout...</span>
      </div>
    );
  }

  const getArticle = (column: ColumnKey, index: number): ArticleData | null => {
    const id = slots[column][index];
    return id ? articleMap.get(id) || null : null;
  };
  const leadId = slots.lead[0];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerThenCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="fle-root">
        {/* Toolbar */}
        <div className="fle-toolbar">
          <div className="fle-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 className="fle-toolbar-title">Sports Page Layout</h2>
            {/* Escape hatch: if the scores banner misbehaves, any editor can
                swap it for the plain header (takes effect on Activate) */}
            <label
              className="fle-image-toggle"
              title="Off: the page shows the plain “Sports | Contact” header and stops loading RPI Athletics scores"
            >
              <input
                type="checkbox"
                checked={showScoreStrip}
                onChange={() => {
                  setShowScoreStrip((prev) => !prev);
                  markDirty();
                }}
              />
              Scores banner {showScoreStrip ? 'on' : 'off (plain header shown)'}
            </label>
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
          {/* Left: canvas mirrors the page — lead column 2/3, headlines 1/3 */}
          <div className="fle-canvas-wrap">
            <div className="fle-canvas" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Lead</span>
                </div>
                <DropSlot
                  slotId="lead-0"
                  label="Lead story (large image)"
                  article={getArticle('lead', 0)}
                  onClear={() => clearSlot('lead-0')}
                />
                <label className="fle-image-toggle" title="Uses the lead story's opponent and score" style={{ alignSelf: 'flex-start' }}>
                  <input type="checkbox" checked={showScoreboard} onChange={toggleScoreboard} />
                  Show scoreboard above the lead (from the story&apos;s game result, when it has one)
                </label>
                {showScoreboard && leadId !== null && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', alignSelf: 'flex-start' }}>
                    <span style={{ fontWeight: 600 }}>Date played</span>
                    <input
                      type="date"
                      value={scoreboardDate?.articleId === leadId ? scoreboardDate.date : ''}
                      onChange={(e) => changeScoreboardDate(leadId, e.target.value)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '0.72rem',
                        borderRadius: 4,
                        border: '1px solid var(--theme-elevation-200, #333)',
                        background: 'var(--theme-elevation-100, #1a1a1a)',
                        color: 'var(--theme-text, #fff)',
                        colorScheme: 'light dark',
                      }}
                    />
                    <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
                      Shown under the scoreboard. Leave empty to use the publish date.
                    </span>
                  </label>
                )}
                {/* Last-minute fallback: a plain title under the photo
                    instead of the box overlapping it (desktop only) */}
                <label
                  className="fle-image-toggle"
                  title="Off: the lead's headline sits under the photo as a plain title instead of overlapping it (desktop; phones already show it above the photo)"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <input
                    type="checkbox"
                    checked={leadTitleOverlay}
                    onChange={() => {
                      setLeadTitleOverlay((prev) => !prev);
                      markDirty();
                    }}
                  />
                  Lead title overlaps the photo {leadTitleOverlay ? '' : '(off: plain title under the photo)'}
                </label>
                <DropSlot
                  slotId="below-0"
                  label="Below lead (image + text)"
                  article={getArticle('belowLead', 0)}
                  onClear={() => clearSlot('below-0')}
                />
                {/* Only used when the scoreboard is off, so it collapses to a
                    note while the scoreboard shows; a story placed there stays
                    saved and returns with the slot */}
                {showScoreboard ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', padding: '2px 2px 0' }}>
                    <span style={{ opacity: 0.5 }}>
                      Second below-lead slot appears when the scoreboard is off
                      {getArticle('belowLead', 1) ? ` (holding “${getArticle('belowLead', 1)?.plainTitle}”)` : ''}
                    </span>
                    {/* Frees the held story for other slots without turning the scoreboard off */}
                    {getArticle('belowLead', 1) && (
                      <button
                        type="button"
                        onClick={() => clearSlot('below-1')}
                        style={{ background: 'none', border: 'none', padding: 0, color: '#C41E3A', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <DropSlot
                    slotId="below-1"
                    label="Second below lead (text + image)"
                    article={getArticle('belowLead', 1)}
                    onClear={() => clearSlot('below-1')}
                  />
                )}
              </div>

              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Headlines</span>
                </div>
                {slots.headlines.map((_, i) => (
                  <DropSlot
                    key={`head-${i}`}
                    slotId={`head-${i}`}
                    label={`Headline ${i + 1}`}
                    article={getArticle('headlines', i)}
                    onClear={() => clearSlot(`head-${i}`)}
                  />
                ))}
                <StandingsPanel overrides={standingsOverrides} now={now} onChange={setStandingsMode} />
              </div>
            </div>

            {/* Featured row: seven portrait cards under the top block */}
            <div className="fle-column" style={{ marginTop: 16 }}>
              <div className="fle-column-header">
                <span className="fle-column-title">More Headlines</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
                  Drag a photo to choose what its card shows; drag the number bar to move a story
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FEATURED_COUNT}, minmax(0, 1fr))`, gap: 10 }}>
                {slots.featured.map((id, i) => {
                  const article = getArticle('featured', i);
                  return (
                    <FeaturedSlot
                      key={`feat-${i}`}
                      index={i}
                      article={article}
                      focus={id !== null ? featuredFocus[String(id)] : undefined}
                      onClear={() => clearSlot(`feat-${i}`)}
                      onFocusChange={(focus) => id !== null && changeFeaturedFocus(id, focus)}
                      onFocusReset={() => id !== null && changeFeaturedFocus(id, null)}
                    />
                  );
                })}
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
