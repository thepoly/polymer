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
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './layout-editor.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ImageDirection = 'top' | 'bottom' | 'left' | 'right' | 'none';

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

type GridCell = {
  id: string;
  span: number;
  articleId: number | null;
  direction: ImageDirection;
  children?: GridCell[];
};

type GridRow = {
  id: string;
  cells: GridCell[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Prefer the droppable the pointer is inside, fall back to closestCenter */
const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const SECTION_COLORS: Record<string, string> = {
  news: '#dc2626',
  features: '#7c3aed',
  opinion: '#2563eb',
  sports: '#059669',
};

const DIRECTION_ICONS: Record<ImageDirection, string> = {
  top: '↑',
  left: '←',
  right: '→',
  bottom: '↓',
  none: '⊘',
};

const ROW_PRESETS: { label: string; spans: number[]; icon: string }[] = [
  { label: 'Full', spans: [12], icon: '████████████' },
  { label: 'Half', spans: [6, 6], icon: '██████ ██████' },
  { label: 'Thirds', spans: [4, 4, 4], icon: '████ ████ ████' },
  { label: 'Quarters', spans: [3, 3, 3, 3], icon: '███ ███ ███ ███' },
  { label: 'Wide + Narrow', spans: [8, 4], icon: '████████ ████' },
  { label: 'Narrow + Wide', spans: [4, 8], icon: '████ ████████' },
  { label: 'Featured', spans: [7, 5], icon: '███████ █████' },
  { label: 'Sidebar', spans: [5, 7], icon: '█████ ███████' },
  { label: 'Three Uneven', spans: [6, 3, 3], icon: '██████ ███ ███' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
const newId = () => `c${Date.now().toString(36)}${(++_idCounter).toString(36)}`;

const toRoman = (num: number): string => {
  if (num <= 0) return String(num);
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  let n = num;
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
};

/**
 * Auto-calculate volume & edition from current date.
 * Reference: 2026-02-28 = Volume 143, Edition 1.
 * Edition increments weekly; volume increments every 52 weeks (edition resets).
 */
const calculateVolumeEdition = (): { volume: number; edition: number } => {
  const refStart = new Date('2026-02-28T00:00:00');
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.floor((now.getTime() - refStart.getTime()) / msPerWeek);
  if (totalWeeks < 0) return { volume: 143, edition: 1 };
  const volumeOffset = Math.floor(totalWeeks / 52);
  const editionInYear = (totalWeeks % 52) + 1;
  return { volume: 143 + volumeOffset, edition: editionInYear };
};

/** Color associated with each skeleton's zodiac sign */
const SKELETON_SIGN_COLORS: Record<string, string> = {
  aries: '#e85d4a',
  taurus: '#e8892d',
  custom: '#3b82f6',
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

const getAuthorDateString = (article: ArticleData): string => {
  const author = getAuthorString(article);
  const date = formatDate(article.publishedDate);
  if (author && date) return `${author} • ${date}`;
  return author || date;
};

const extractDocId = (): string | null => {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
};

const makeRow = (spans: number[]): GridRow => ({
  id: newId(),
  cells: spans.map((span) => ({ id: newId(), span, articleId: null, direction: 'top' as ImageDirection })),
});

const isStackCell = (cell: GridCell): boolean => Array.isArray(cell.children) && cell.children.length > 0;

const deepUpdateCell = (cells: GridCell[], cellId: string, updates: Partial<GridCell>): GridCell[] =>
  cells.map((cell) => {
    if (cell.id === cellId) return { ...cell, ...updates };
    if (cell.children) return { ...cell, children: deepUpdateCell(cell.children, cellId, updates) };
    return cell;
  });

const deepFindCell = (cells: GridCell[], cellId: string): GridCell | null => {
  for (const cell of cells) {
    if (cell.id === cellId) return cell;
    if (cell.children) {
      const found = deepFindCell(cell.children, cellId);
      if (found) return found;
    }
  }
  return null;
};

const collectArticleIds = (rows: GridRow[]): Set<number> => {
  const ids = new Set<number>();
  const walk = (cells: GridCell[]) => {
    for (const cell of cells) {
      if (cell.articleId) ids.add(cell.articleId);
      if (cell.children) walk(cell.children);
    }
  };
  for (const row of rows) walk(row.cells);
  return ids;
};

const flattenArticleIds = (rows: GridRow[]): number[] => {
  const ids: number[] = [];
  const walk = (cells: GridCell[]) => {
    for (const cell of cells) {
      if (cell.articleId) ids.push(cell.articleId);
      if (cell.children) walk(cell.children);
    }
  };
  for (const row of rows) walk(row.cells);
  return ids;
};

// ---------------------------------------------------------------------------
// Row Presets Bar
// ---------------------------------------------------------------------------

function RowPresets({ onAdd }: { onAdd: (spans: number[]) => void }) {
  return (
    <div className="le-presets">
      <span className="le-presets-label">Add row</span>
      <div className="le-presets-list">
        {ROW_PRESETS.map((p) => (
          <button key={p.label} className="le-preset-btn" onClick={() => onAdd(p.spans)} title={p.label}>
            <span className="le-preset-icon">{p.icon}</span>
            <span className="le-preset-name">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Direction Picker
// ---------------------------------------------------------------------------

function DirectionPicker({ value, hasImage, onChange }: {
  value: ImageDirection; hasImage: boolean; onChange: (d: ImageDirection) => void;
}) {
  if (!hasImage) return null;
  return (
    <div className="le-direction-picker">
      {(Object.keys(DIRECTION_ICONS) as ImageDirection[]).map((dir) => (
        <button
          key={dir}
          className={`le-dir-btn ${value === dir ? 'le-dir-active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onChange(dir); }}
          onPointerDown={(e) => e.stopPropagation()}
          title={`Image ${dir}`}
        >{DIRECTION_ICONS[dir]}</button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell Article Preview
// ---------------------------------------------------------------------------

function CellPreview({ article, direction }: { article: ArticleData; direction: ImageDirection }) {
  const imageUrl = getImageUrl(article);
  const showImage = imageUrl && direction !== 'none';
  const isHorizontal = direction === 'left' || direction === 'right';
  const author = getAuthorString(article);

  const textContent = (
    <div className="le-cell-text">
      <span className="le-cell-badge" style={{ background: SECTION_COLORS[article.section] || '#888' }}>
        {article.section}
      </span>
      <div className="le-cell-title">{article.title}</div>
      {author && <div className="le-cell-author">{author}</div>}
      {article.subdeck && <div className="le-cell-subdeck">{article.subdeck}</div>}
    </div>
  );

  const imageContent = showImage ? (
    <div className={`le-cell-image ${isHorizontal ? 'le-cell-image-side' : ''}`}>
      <img src={imageUrl} alt="" />
    </div>
  ) : null;

  if (isHorizontal) {
    return (
      <div className={`le-cell-preview le-cell-horizontal ${direction === 'right' ? 'le-cell-reverse' : ''}`}>
        {imageContent}{textContent}
      </div>
    );
  }

  return (
    <div className="le-cell-preview le-cell-vertical">
      {direction === 'bottom' ? textContent : null}
      {imageContent}
      {direction !== 'bottom' ? textContent : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resize Handle — draggable right edge to change span
// ---------------------------------------------------------------------------

function ResizeHandle({ cellId, onResize }: {
  cellId: string;
  onResize: (deltaSpans: number) => void;
}) {
  const startXRef = useRef(0);
  const colWidthRef = useRef(0);
  const accumulatedRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    accumulatedRef.current = 0;

    // Measure one grid column width from the row-grid container
    const rowGrid = target.closest('.le-row-grid');
    if (rowGrid) {
      colWidthRef.current = rowGrid.getBoundingClientRect().width / 12;
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startXRef.current;
    const colW = colWidthRef.current;
    if (colW <= 0) return;

    const spanDelta = Math.round(dx / colW);
    if (spanDelta !== accumulatedRef.current) {
      const change = spanDelta - accumulatedRef.current;
      accumulatedRef.current = spanDelta;
      onResize(change);
    }
  }, [onResize]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      className="le-resize-handle"
      data-resize={cellId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

// ---------------------------------------------------------------------------
// Sub-cell inside a stack (droppable + draggable)
// ---------------------------------------------------------------------------

function SubCellComponent({ cell, article, onUpdateDirection, onClear, onDelete, canDelete }: {
  cell: GridCell; article: ArticleData | null;
  onUpdateDirection: (d: ImageDirection) => void; onClear: () => void;
  onDelete: () => void; canDelete: boolean;
}) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `cell-${cell.id}`,
    data: { cellId: cell.id },
  });
  const hasImage = article ? !!getImageUrl(article) : false;

  return (
    <div ref={setDropRef} className={`le-subcell ${isOver ? 'le-cell-over' : ''} ${article ? 'le-subcell-filled' : ''}`}>
      <div className="le-subcell-toolbar">
        {article && <DirectionPicker value={cell.direction} hasImage={hasImage} onChange={onUpdateDirection} />}
        <div className="le-cell-actions">
          {article && <button className="le-cell-action-btn" onClick={onClear} title="Remove article">✕</button>}
          {canDelete && <button className="le-cell-action-btn le-cell-delete" onClick={onDelete} title="Remove slot">🗑</button>}
        </div>
      </div>
      {article ? (
        <DraggableCellArticle article={article} cellId={cell.id} direction={cell.direction} />
      ) : (
        <div className="le-cell-empty le-subcell-empty">
          <div className="le-cell-empty-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Drop</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable Grid Cell — wraps cell content with sortable + droppable + resize
// ---------------------------------------------------------------------------

function SortableGridCell({
  cell, article, articleMap,
  onUpdateDirection, onClear, onDelete, canDelete,
  onSplit, onAddSubCell, onUpdateSubCell, onClearSubCell, onDeleteSubCell, onUnsplit,
  onResize,
}: {
  cell: GridCell; article: ArticleData | null;
  articleMap: Map<number, ArticleData>;
  onUpdateDirection: (d: ImageDirection) => void;
  onClear: () => void; onDelete: () => void; canDelete: boolean;
  onSplit: () => void; onAddSubCell: () => void;
  onUpdateSubCell: (subId: string, updates: Partial<GridCell>) => void;
  onClearSubCell: (subId: string) => void; onDeleteSubCell: (subId: string) => void;
  onUnsplit: () => void;
  onResize: (delta: number) => void;
}) {
  const stacked = isStackCell(cell);

  const {
    attributes, listeners, setNodeRef: setSortRef,
    transform, transition, isDragging: isSortDragging,
  } = useSortable({
    id: `sortcell-${cell.id}`,
    data: { type: 'cell', cellId: cell.id },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: stacked ? `stack-${cell.id}` : `cell-${cell.id}`,
    data: stacked ? undefined : { cellId: cell.id },
    disabled: stacked,
  });

  const hasImage = article ? !!getImageUrl(article) : false;
  const style: React.CSSProperties = {
    gridColumn: `span ${cell.span}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={(node) => { setSortRef(node); setDropRef(node); }}
      className={`le-cell ${!stacked && isOver ? 'le-cell-over' : ''} ${!stacked && article ? 'le-cell-filled' : ''} ${stacked ? 'le-cell-stacked' : ''}`}
      style={style}
    >
      {/* Cell toolbar */}
      <div className="le-cell-toolbar">
        {/* Drag handle for reordering columns */}
        <button className="le-cell-grip" {...attributes} {...listeners} title="Drag to reorder column">⠿</button>
        <span className="le-span-value" title="Column span">{cell.span}</span>
        {!stacked && article && <DirectionPicker value={cell.direction} hasImage={hasImage} onChange={onUpdateDirection} />}
        <div className="le-cell-actions">
          {!stacked && (
            <button className="le-cell-action-btn le-split-btn" onClick={onSplit} title="Stack vertically">↕</button>
          )}
          {stacked && (
            <>
              <button className="le-cell-action-btn le-split-btn" onClick={onAddSubCell} title="Add slot to stack">+↕</button>
              <button className="le-cell-action-btn" onClick={onUnsplit} title="Flatten stack">⊟</button>
            </>
          )}
          {!stacked && article && <button className="le-cell-action-btn" onClick={onClear} title="Remove article">✕</button>}
          {canDelete && <button className="le-cell-action-btn le-cell-delete" onClick={onDelete} title="Delete column">🗑</button>}
        </div>
      </div>

      {/* Cell body */}
      {stacked ? (
        <div className="le-stack">
          {cell.children!.map((sub) => (
            <SubCellComponent
              key={sub.id} cell={sub}
              article={sub.articleId ? articleMap.get(sub.articleId) || null : null}
              onUpdateDirection={(d) => onUpdateSubCell(sub.id, { direction: d })}
              onClear={() => onClearSubCell(sub.id)}
              onDelete={() => onDeleteSubCell(sub.id)}
              canDelete={cell.children!.length > 1}
            />
          ))}
        </div>
      ) : article ? (
        <DraggableCellArticle article={article} cellId={cell.id} direction={cell.direction} />
      ) : (
        <div className="le-cell-empty">
          <div className="le-cell-empty-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Drop article</span>
          </div>
        </div>
      )}

      <div className="le-cell-span-label">{cell.span}/12</div>
      <ResizeHandle cellId={cell.id} onResize={onResize} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable article inside a cell
// ---------------------------------------------------------------------------

function DraggableCellArticle({ article, cellId, direction, children }: {
  article: ArticleData; cellId: string; direction: ImageDirection;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cell-article-${cellId}`,
    data: { article, source: 'cell', cellId },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`le-cell-body ${isDragging ? 'le-dragging' : ''}`}
    >
      {children || <CellPreview article={article} direction={direction} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable Grid Row
// ---------------------------------------------------------------------------

function SortableGridRow({
  row, rowIndex, articleMap,
  onDeleteRow, onAddCell, onUpdateCell, onDeleteCell, onClearCell,
  onSplitCell, onAddSubCell, onUpdateSubCell, onClearSubCell, onDeleteSubCell, onUnsplitCell,
  onResizeCell,
}: {
  row: GridRow; rowIndex: number;
  articleMap: Map<number, ArticleData>;
  onDeleteRow: () => void; onAddCell: () => void;
  onUpdateCell: (cellId: string, updates: Partial<GridCell>) => void;
  onDeleteCell: (cellId: string) => void; onClearCell: (cellId: string) => void;
  onSplitCell: (cellId: string) => void; onAddSubCell: (cellId: string) => void;
  onUpdateSubCell: (cellId: string, subId: string, updates: Partial<GridCell>) => void;
  onClearSubCell: (cellId: string, subId: string) => void;
  onDeleteSubCell: (cellId: string, subId: string) => void;
  onUnsplitCell: (cellId: string) => void;
  onResizeCell: (cellId: string, delta: number) => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `sortrow-${row.id}`,
    data: { type: 'row', rowId: row.id },
  });

  const rowTotal = row.cells.reduce((s, c) => s + c.span, 0);
  const cellSortIds = row.cells.map((c) => `sortcell-${c.id}`);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div className="le-row" ref={setNodeRef} style={style}>
      {/* Row controls */}
      <div className="le-row-controls">
        <button className="le-row-grip" {...attributes} {...listeners} title="Drag to reorder row">⠿</button>
        <span className="le-row-index">R{rowIndex + 1}</span>
        <button className="le-row-ctrl-btn le-row-delete-btn" onClick={onDeleteRow} title="Delete row">✕</button>
      </div>

      {/* Cells grid — sortable context for cell reordering */}
      <SortableContext items={cellSortIds} strategy={horizontalListSortingStrategy}>
        <div className="le-row-grid">
          {row.cells.map((cell) => (
            <SortableGridCell
              key={cell.id}
              cell={cell}
              article={cell.articleId ? articleMap.get(cell.articleId) || null : null}
              articleMap={articleMap}
              onUpdateDirection={(direction) => onUpdateCell(cell.id, { direction })}
              onClear={() => onClearCell(cell.id)}
              onDelete={() => onDeleteCell(cell.id)}
              canDelete={row.cells.length > 1}
              onSplit={() => onSplitCell(cell.id)}
              onAddSubCell={() => onAddSubCell(cell.id)}
              onUpdateSubCell={(subId, updates) => onUpdateSubCell(cell.id, subId, updates)}
              onClearSubCell={(subId) => onClearSubCell(cell.id, subId)}
              onDeleteSubCell={(subId) => onDeleteSubCell(cell.id, subId)}
              onUnsplit={() => onUnsplitCell(cell.id)}
              onResize={(delta) => onResizeCell(cell.id, delta)}
            />
          ))}
          {rowTotal < 12 && (
            <button className="le-add-cell-btn" onClick={onAddCell} title="Add column">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool Card (draggable)
// ---------------------------------------------------------------------------

function DraggablePoolCard({ article, isUsed }: { article: ArticleData; isUsed: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${article.id}`,
    data: { article, source: 'pool' },
  });
  const imageUrl = getImageUrl(article);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`le-pool-card ${isDragging ? 'le-dragging' : ''} ${isUsed ? 'le-used' : ''}`}
    >
      {imageUrl ? (
        <div className="le-pool-thumb"><img src={imageUrl} alt="" /></div>
      ) : (
        <div className="le-pool-thumb le-pool-thumb-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </div>
      )}
      <div className="le-pool-card-body">
        <div className="le-pool-card-title">{article.title}</div>
        <div className="le-pool-card-meta">
          <span className="le-section-dot" style={{ background: SECTION_COLORS[article.section] || '#888' }} />
          <span className="le-pool-card-section">{article.section}</span>
          <span className="le-pool-card-date">{formatDate(article.publishedDate)}</span>
        </div>
      </div>
      {isUsed && <div className="le-used-badge">In use</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag Overlay
// ---------------------------------------------------------------------------

function DragOverlayCard({ article }: { article: ArticleData }) {
  const imageUrl = getImageUrl(article);
  return (
    <div className="le-drag-overlay">
      {imageUrl && <div className="le-drag-overlay-img"><img src={imageUrl} alt="" /></div>}
      <div className="le-drag-overlay-body">
        <div className="le-drag-overlay-title">{article.title}</div>
        <div className="le-drag-overlay-badge" style={{ background: SECTION_COLORS[article.section] || '#888' }}>
          {article.section}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton definitions — built-in layout templates
// ---------------------------------------------------------------------------

type SkeletonId = 'custom' | 'aries' | 'taurus';

type SkeletonDef = {
  id: SkeletonId;
  name: string;
  description: string;
  icon: string;
  pinned: boolean;
  /** Available for the top/hero area */
  top: boolean;
  /** Available for section areas */
  section: boolean;
};

const SKELETON_LIBRARY: SkeletonDef[] = [
  { id: 'aries', name: 'Aries', description: 'Lead story with photo + 2×2 hero grid. Fully responsive.', icon: '♈', pinned: true, top: true, section: true },
  { id: 'taurus', name: 'Taurus', description: 'Feature story with image + supporting text stories + optional list rail.', icon: '♉', pinned: true, top: true, section: true },
  { id: 'custom', name: 'Custom Grid', description: 'Build your own layout with rows and columns.', icon: '⊞', pinned: false, top: true, section: false },
];

const TOP_SKELETONS = SKELETON_LIBRARY.filter((s) => s.top);
const SECTION_SKELETONS = SKELETON_LIBRARY.filter((s) => s.section);

const SECTION_NAMES = ['news', 'features', 'opinion', 'sports'] as const;
type SectionName = typeof SECTION_NAMES[number];

type SectionLayoutData = {
  skeleton: SkeletonId;
  pinnedArticles: number[];
};

type AllSectionLayouts = Record<SectionName, SectionLayoutData>;

const EMPTY_SECTION_LAYOUTS: AllSectionLayouts = {
  news: { skeleton: 'taurus', pinnedArticles: [] },
  features: { skeleton: 'taurus', pinnedArticles: [] },
  opinion: { skeleton: 'taurus', pinnedArticles: [] },
  sports: { skeleton: 'taurus', pinnedArticles: [] },
};

// Aries data: lead + two columns of up to 3 articles each.
// A column shows 3 slots when all articles are text-only.
// When any article in a column has a photo, the column collapses to 2 slots.
type AriesData = {
  lead: number | null;
  leadImportant?: boolean;
  left: (number | null)[];   // always length 3 internally
  right: (number | null)[];  // always length 3 internally
  bottom: (number | null)[]; // always length 7 internally
};

const EMPTY_ARIES: AriesData = { lead: null, leadImportant: false, left: [null, null, null], right: [null, null, null], bottom: [null, null, null, null, null, null, null] };

/** How many visible slots does a column get? 2 if any article has a photo, else 3. */
const ariesColSlotCount = (col: (number | null)[], articleMap: Map<number, ArticleData>): number => {
  for (const id of col) {
    if (id !== null) {
      const a = articleMap.get(id);
      if (a && getImageUrl(a)) return 2;
    }
  }
  return 3;
};

/** Collect all non-null IDs from aries data */
const ariesUsedIds = (d: AriesData): Set<number> => {
  const ids = new Set<number>();
  if (d.lead !== null) ids.add(d.lead);
  for (const id of d.left) if (id !== null) ids.add(id);
  for (const id of d.right) if (id !== null) ids.add(id);
  for (const id of d.bottom) if (id !== null) ids.add(id);
  return ids;
};

/** All aries slot IDs (for DnD source identification) */
const ALL_ARIES_IDS = ['lead', 'left-0', 'left-1', 'left-2', 'right-0', 'right-1', 'right-2', 'bottom-0', 'bottom-1', 'bottom-2', 'bottom-3', 'bottom-4', 'bottom-5', 'bottom-6'];
const isAriesSlotId = (id: string) => ALL_ARIES_IDS.includes(id);
const isAriesBottomSlotId = (id: string) => id.startsWith('bottom-');
const getArticleHasImage = (article: ArticleData | null | undefined): boolean => Boolean(article && getImageUrl(article));
const getAriesBottomRequirement = (
  bottom: (number | null)[],
  articleMap: Map<number, ArticleData>,
  excludedSlotIds: string[] = [],
): 'image' | 'text' | null => {
  const excluded = new Set(excludedSlotIds);
  for (let i = 0; i < bottom.length; i++) {
    if (excluded.has(`bottom-${i}`)) continue;
    const id = bottom[i];
    if (id === null) continue;
    const article = articleMap.get(id);
    if (!article) continue;
    return getArticleHasImage(article) ? 'image' : 'text';
  }
  return null;
};

// ---------------------------------------------------------------------------
// Aries Slot Droppable
// ---------------------------------------------------------------------------

function AriesSlot({ slotId, label, article, isLead, isOver, setDropRef, onClear, emptyConstraint }: {
  slotId: string; label: string; article: ArticleData | null; isLead: boolean;
  isOver: boolean; setDropRef: (node: HTMLElement | null) => void; onClear: () => void;
  emptyConstraint?: 'image' | 'text' | null;
}) {
  const imageUrl = article ? getImageUrl(article) : null;
  const authorDate = article ? getAuthorDateString(article) : '';

  return (
    <div
      ref={setDropRef}
      className={`le-aries-slot ${isLead ? 'le-aries-lead' : 'le-aries-hero'} ${isOver ? 'le-cell-over' : ''} ${article ? 'le-cell-filled' : ''}`}
    >
      <div className="le-aries-slot-header">
        <span className="le-aries-slot-label">{label}</span>
        {article && <button className="le-cell-action-btn" onClick={onClear} title="Remove article">✕</button>}
      </div>
      {article ? (
        <DraggableCellArticle article={article} cellId={slotId} direction="top">
          <div className="le-aries-slot-preview">
            {imageUrl && (
              <div className={`le-aries-slot-image ${isLead ? 'le-aries-lead-image' : ''}`}>
                <img src={imageUrl} alt="" />
              </div>
            )}
            <div className="le-cell-text">
              <span className="le-cell-badge" style={{ background: SECTION_COLORS[article.section] || '#888' }}>{article.section}</span>
              <div className="le-cell-title">{article.title}</div>
              {authorDate && <div className="le-cell-author">{authorDate}</div>}
              {article.subdeck && isLead && <div className="le-cell-subdeck">{article.subdeck}</div>}
            </div>
          </div>
        </DraggableCellArticle>
      ) : (
        <div className="le-cell-empty">
          <div className={`le-cell-empty-inner ${emptyConstraint ? 'le-cell-empty-inner--locked' : ''}`}>
            {emptyConstraint === 'image' ? (
              <>
                <svg
                  className="le-aries-empty-icon le-aries-empty-icon--image"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  width="20"
                  height="20"
                  aria-label="Image article required"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="M6 17l4.5-4.5L14 16l2.5-2.5L19 16" />
                </svg>
                <span className="le-aries-empty-text le-aries-empty-text--image">Photo article only</span>
              </>
            ) : emptyConstraint === 'text' ? (
              <>
                <svg
                  className="le-tau-no-image-icon le-aries-empty-icon le-aries-empty-icon--text"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="20"
                  height="20"
                  aria-label="No-image article required"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                  <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" />
                </svg>
                <span className="le-aries-empty-text le-aries-empty-text--text">No-photo article only</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
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

function AriesDropSlot({ slotId, label, article, isLead, onClear, emptyConstraint }: {
  slotId: string; label: string; article: ArticleData | null; isLead: boolean; onClear: () => void;
  emptyConstraint?: 'image' | 'text' | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `aries-${slotId}`,
    data: { cellId: slotId, skeleton: 'aries' },
  });
  return (
    <AriesSlot
      slotId={slotId}
      label={label}
      article={article}
      isLead={isLead}
      isOver={isOver}
      setDropRef={setNodeRef}
      onClear={onClear}
      emptyConstraint={emptyConstraint}
    />
  );
}

function AriesEditor({ data, articleMap, onClear, onToggleLeadImportant }: {
  data: AriesData;
  articleMap: Map<number, ArticleData>;
  onClear: (slotId: string) => void;
  onToggleLeadImportant: () => void;
}) {
  const leftCount = ariesColSlotCount(data.left, articleMap);
  const rightCount = ariesColSlotCount(data.right, articleMap);
  const hasBottom = data.bottom.some((id) => id !== null);

  // Interleave left/right columns into a 2×N grid: left-0, right-0, left-1, right-1, ...
  // Both columns always show the same number of rows so the grid stays symmetric.
  const maxRows = Math.max(leftCount, rightCount);
  const heroSlots: { slotId: string; article: ArticleData | null }[] = [];
  for (let i = 0; i < maxRows; i++) {
    heroSlots.push({
      slotId: `left-${i}`,
      article: i < leftCount && data.left[i] !== null ? articleMap.get(data.left[i]!) || null : null,
    });
    heroSlots.push({
      slotId: `right-${i}`,
      article: i < rightCount && data.right[i] !== null ? articleMap.get(data.right[i]!) || null : null,
    });
  }

  return (
    <div className="le-aries-canvas">
      <div className="le-aries-description">
        <span className="le-presets-label">Aries</span>
        <span className="le-aries-desc-text">
          Lead story + hero grid. Columns collapse from 3→2 slots when a photo article is placed.
        </span>
      </div>
      <div className="le-aries-top">
        <div className="le-aries-lead-col">
          <AriesDropSlot
            slotId="lead"
            label="Lead Story"
            article={data.lead !== null ? articleMap.get(data.lead) || null : null}
            isLead
            onClear={() => onClear('lead')}
          />
          <label className="le-aries-important-toggle">
            <input
              type="checkbox"
              checked={!!data.leadImportant}
              onChange={onToggleLeadImportant}
            />
            <span>Important</span>
          </label>
        </div>
        <div className="le-aries-hero-grid">
          {heroSlots.map(({ slotId, article }) => (
            <AriesDropSlot
              key={slotId}
              slotId={slotId}
              label={slotId.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              article={article}
              isLead={false}
              onClear={() => onClear(slotId)}
            />
          ))}
        </div>
      </div>
      {/* Bottom row */}
      <div className="le-aries-bottom">
        <div className="le-aries-hero-col-label">
          Bottom row &middot; optional{hasBottom ? '' : ' (empty — will be hidden)'}
        </div>
        <div className="le-aries-bottom-grid">
          <div className="le-aries-bottom-left">
            <AriesDropSlot
              slotId="bottom-0"
              label="Text Feature"
              article={data.bottom[0] !== null ? articleMap.get(data.bottom[0]!) || null : null}
              isLead={false}
              onClear={() => onClear('bottom-0')}
              emptyConstraint="text"
            />
            <div className="le-aries-bottom-left-pair">
              {[1, 2].map((i) => (
                <AriesDropSlot
                  key={`bottom-${i}`}
                  slotId={`bottom-${i}`}
                  label={`Left ${i}`}
                  article={data.bottom[i] !== null ? articleMap.get(data.bottom[i]!) || null : null}
                  isLead={false}
                  onClear={() => onClear(`bottom-${i}`)}
                  emptyConstraint="text"
                />
              ))}
            </div>
            <AriesDropSlot
              slotId="bottom-3"
              label="Text Feature 2"
              article={data.bottom[3] !== null ? articleMap.get(data.bottom[3]!) || null : null}
              isLead={false}
              onClear={() => onClear('bottom-3')}
              emptyConstraint="text"
            />
          </div>
          <div className="le-aries-bottom-right">
            <AriesDropSlot
              slotId="bottom-4"
              label="Image + Text"
              article={data.bottom[4] !== null ? articleMap.get(data.bottom[4]!) || null : null}
              isLead={false}
              onClear={() => onClear('bottom-4')}
              emptyConstraint="image"
            />
            <div className="le-aries-bottom-right-pair">
              {[5, 6].map((i) => (
                <AriesDropSlot
                  key={`bottom-${i}`}
                  slotId={`bottom-${i}`}
                  label={`Right ${i - 4}`}
                  article={data.bottom[i] !== null ? articleMap.get(data.bottom[i]!) || null : null}
                  isLead={false}
                  onClear={() => onClear(`bottom-${i}`)}
                  emptyConstraint="text"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Layout Editor
// ---------------------------------------------------------------------------

function TaurusSlot({ slotId, label, article, className, textOnly, onClear, onRemoveSlot }: {
  slotId: string; label: string; article: ArticleData | null; className?: string; textOnly?: boolean; onClear: () => void; onRemoveSlot?: () => void;
}) {
  const slotIndex = Number(slotId.split('-')[2]);
  const { isOver, setNodeRef } = useDroppable({
    id: `section-drop-${slotId}`,
    data: { cellId: slotId, skeleton: 'section', sectionName: slotId.split('-')[1], slotIndex, textOnly: !!textOnly },
  });
  const imageUrl = article ? getImageUrl(article) : null;

  return (
    <div
      ref={setNodeRef}
      className={`le-tau-slot ${isOver ? 'le-cell-over' : ''} ${article ? 'le-cell-filled' : ''} ${className || ''}`}
    >
      <div className="le-tau-slot-label">{label}</div>
      {article ? (
        <DraggableCellArticle article={article} cellId={slotId} direction="top">
          <div className="le-tau-slot-preview">
            {imageUrl && !textOnly && (
              <div className="le-tau-slot-image">
                <img src={imageUrl} alt="" />
              </div>
            )}
            <div className="le-cell-text">
              <span className="le-cell-badge" style={{ background: SECTION_COLORS[article.section] || '#888' }}>{article.section}</span>
              <div className="le-cell-title">{article.title}</div>
              <div className="le-cell-author">{getAuthorDateString(article)}</div>
              {article.subdeck && <div className="le-cell-subdeck">{article.subdeck}</div>}
            </div>
          </div>
        </DraggableCellArticle>
      ) : (
        <div className="le-cell-empty">
          <div className={`le-cell-empty-inner ${textOnly ? 'le-cell-empty-inner--locked' : ''}`}>
            {textOnly ? (
              <>
                <svg
                  className="le-tau-no-image-icon le-aries-empty-icon le-aries-empty-icon--text"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="16"
                  height="16"
                  aria-label="No-image article required"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                  <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" />
                </svg>
                <span className="le-aries-empty-text le-aries-empty-text--text">No-photo article only</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Drop</span>
              </>
            )}
          </div>
        </div>
      )}
      {article && (
        <button className="le-tau-slot-clear" onClick={onClear} title="Unpin">✕</button>
      )}
      {!article && onRemoveSlot && (
        <button className="le-tau-slot-remove" onClick={onRemoveSlot} title="Remove slot">🗑</button>
      )}
    </div>
  );
}

function SectionEditor({ sectionName, layout, articleMap, onRemovePin, onAddSlot, onChangeSkeleton }: {
  sectionName: SectionName;
  layout: SectionLayoutData;
  articleMap: Map<number, ArticleData>;
  onRemovePin: (index: number) => void;
  onAddSlot: () => void;
  onChangeSkeleton: (skeleton: SkeletonId) => void;
}) {
  const displayName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
  const sectionColor = SECTION_COLORS[sectionName] || '#888';
  const currentSkel = SKELETON_LIBRARY.find((s) => s.id === layout.skeleton);
  const pinnedCount = layout.pinnedArticles.filter((id) => id > 0).length;

  const pins = layout.pinnedArticles;
  const getSlot = (i: number) => {
    const id = pins[i];
    return id ? articleMap.get(id) || null : null;
  };
  const slotId = (i: number) => `section-${sectionName}-${i}`;

  return (
    <div className="le-section-editor" style={{ borderColor: sectionColor }}>
      <div className="le-section-editor-header">
        <div className="le-section-editor-title">
          <span className="le-section-dot-lg" style={{ background: sectionColor }} />
          <span>{displayName}</span>
          <div className="le-section-skeleton-picker">
            {SECTION_SKELETONS.map((skel) => (
              <button
                key={skel.id}
                className={`le-section-skel-btn ${layout.skeleton === skel.id ? 'le-section-skel-active' : ''}`}
                onClick={() => onChangeSkeleton(skel.id)}
                title={skel.description}
              >
                <span>{skel.icon}</span>
              </button>
            ))}
          </div>
        </div>
        {pinnedCount > 0 && <span className="le-section-pin-count">{pinnedCount} pinned</span>}
      </div>
      <div className="le-section-editor-body">
          {layout.skeleton === 'aries' ? (
            <>
              {/* Aries shape: lead + 2×2 hero grid */}
              <div className="le-tau-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <TaurusSlot
                    slotId={slotId(0)}
                    label="Lead"
                    article={getSlot(0)}
                    className="le-tau-slot-feature"
                    onClear={() => onRemovePin(0)}
                  />
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <TaurusSlot
                    key={i}
                    slotId={slotId(i)}
                    label={`Hero ${i}`}
                    article={getSlot(i)}
                    className="le-tau-slot-support"
                    onClear={() => onRemovePin(i)}
                  />
                ))}
              </div>
              <div className="le-section-editor-hint">
                Drag articles to pin them. Unpinned slots auto-fill from recent {displayName.toLowerCase()} articles.
              </div>
            </>
          ) : (
            <>
              {/* Taurus shape: feature | supporting | list rail */}
              <div className="le-tau-grid">
                <div className="le-tau-feature">
                  <TaurusSlot
                    slotId={slotId(0)}
                    label="Feature"
                    article={getSlot(0)}
                    className="le-tau-slot-feature"
                    onClear={() => onRemovePin(0)}
                  />
                </div>
                <div className="le-tau-supporting">
                  {[1, 2, 3].map((i) => (
                    <TaurusSlot
                      key={i}
                      slotId={slotId(i)}
                      label={`Support ${i}`}
                      article={getSlot(i)}
                      className="le-tau-slot-support"
                      textOnly
                      onClear={() => onRemovePin(i)}
                    />
                  ))}
                </div>
                <div className="le-tau-list">
                  {[4, 5, 6, 7, 8].map((i) => (
                    <TaurusSlot
                      key={i}
                      slotId={slotId(i)}
                      label={`List ${i - 3}`}
                      article={getSlot(i)}
                      className="le-tau-slot-list"
                      textOnly
                      onClear={() => onRemovePin(i)}
                    />
                  ))}
                  {pins.length > 9 && pins.slice(9).map((_, j) => {
                    const i = 9 + j;
                    return (
                      <TaurusSlot
                        key={i}
                        slotId={slotId(i)}
                        label={`List ${i - 3}`}
                        article={getSlot(i)}
                        className="le-tau-slot-list"
                        textOnly
                        onClear={() => onRemovePin(i)}
                        onRemoveSlot={() => onRemovePin(i)}
                      />
                    );
                  })}
                  <button className="le-tau-add-list" onClick={onAddSlot} title="Add list slot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="le-section-editor-hint">
                Drag articles to pin them. Unpinned slots auto-fill from recent {displayName.toLowerCase()} articles.
              </div>
            </>
          )}
        </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool Drop Zone (acts as trash when dragging from layout)
// ---------------------------------------------------------------------------

function PoolDropZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'pool-drop-zone',
    data: { pool: true },
  });

  return (
    <div ref={setNodeRef} className={`le-pool ${isOver ? 'le-pool-drop-active' : ''}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function LayoutEditor() {
  const [skeleton, setSkeleton] = useState<SkeletonId>('custom');
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [aries, setAries] = useState<AriesData>({ ...EMPTY_ARIES });
  const [sectionLayouts, setSectionLayouts] = useState<AllSectionLayouts>({ ...EMPTY_SECTION_LAYOUTS });
  const [volume, setVolume] = useState<number>(() => calculateVolumeEdition().volume);
  const [edition, setEdition] = useState<number>(() => calculateVolumeEdition().edition);
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const [activeSortType, setActiveSortType] = useState<'row' | 'cell' | null>(null);
  const docIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const sectionPinnedIds = new Set<number>();
  for (const sec of SECTION_NAMES) {
    for (const id of sectionLayouts[sec].pinnedArticles) {
      if (id) sectionPinnedIds.add(id);
    }
  }
  const heroUsedIds = (skeleton === 'aries' || skeleton === 'taurus')
    ? ariesUsedIds(aries)
    : collectArticleIds(grid);
  const usedIds = new Set([...heroUsedIds, ...sectionPinnedIds]);
  const rowSortIds = grid.map((r) => `sortrow-${r.id}`);

  // ---- Style & update the Payload document header (scoped to this editor only) ----
  // Uses a MutationObserver so the title persists even when Payload re-renders
  // the header (e.g. switching between Edit/API tabs).
  const volEdRef = useRef({ volume, edition });
  volEdRef.current = { volume, edition };

  useEffect(() => {
    const applyHeader = () => {
      const header = document.querySelector('[class*="doc-header"], [class*="documentHeader"]') as HTMLElement | null;
      if (!header) return;
      const h1 = header.querySelector('h1') as HTMLElement | null;
      if (!h1) return;

      const { volume: v, edition: e } = volEdRef.current;
      const titleText = `Volume ${toRoman(v)}, Edition ${toRoman(e)}`;

      // Center the title
      header.style.position = 'relative';
      h1.style.position = 'absolute';
      h1.style.left = '50%';
      h1.style.transform = 'translateX(-50%)';
      h1.style.pointerEvents = 'auto';
      h1.style.whiteSpace = 'nowrap';

      // Update title text — preserve any existing <a> link
      const anchor = h1.querySelector('a');
      if (anchor) {
        anchor.textContent = titleText;
      } else {
        h1.textContent = titleText;
      }

      // Ensure Edit/API buttons stay flush right
      const lastChild = header.lastElementChild as HTMLElement | null;
      if (lastChild && lastChild !== h1) {
        lastChild.style.position = 'relative';
        lastChild.style.zIndex = '1';
        lastChild.style.marginLeft = 'auto';
      }
    };

    // Apply immediately
    applyHeader();

    // Re-apply whenever Payload mutates the header (tab switches, re-renders)
    const target = document.querySelector('[class*="doc-header"], [class*="documentHeader"]')?.parentElement;
    if (!target) return;
    const observer = new MutationObserver(() => { requestAnimationFrame(applyHeader); });
    observer.observe(target, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [volume, edition]);

  // ---- Fetch ----
  useEffect(() => {
    (async () => {
      try {
        const artRes = await fetch(
          '/api/articles?where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' +
          '&select[title]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
          '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
          '&select[authors]=true&select[writeInAuthors]=true',
        );
        const artData = await artRes.json();
        setArticles(artData.docs || []);

        let id = extractDocId();
        let layoutData: Record<string, unknown> | null = null;

        if (id) {
          const layoutRes = await fetch(`/api/layout/${id}?depth=1`);
          if (layoutRes.ok) { layoutData = await layoutRes.json(); } else { id = null; }
        }
        if (!id) {
          const listRes = await fetch('/api/layout?limit=1&depth=1');
          const listData = await listRes.json();
          if (listData.docs?.length > 0) {
            layoutData = listData.docs[0];
            id = String((layoutData as Record<string, unknown>).id);
          }
        }
        if (!id) {
          const createRes = await fetch('/api/layout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Skeletons & Layouts' }),
          });
          if (createRes.ok) { const c = await createRes.json(); id = String(c.doc.id); layoutData = c.doc; }
        }
        docIdRef.current = id;

        if (layoutData) {
          // Read skeleton
          const skel = (layoutData as Record<string, unknown>).skeleton as string | undefined;
          if (skel === 'aries' || skel === 'taurus') {
            setSkeleton(skel as SkeletonId);
            const getRelId = (val: unknown): number | null => {
              if (typeof val === 'number') return val;
              if (val && typeof val === 'object' && 'id' in val) return (val as { id: number }).id;
              return null;
            };
            // Try loading from grid JSON first (new format), fall back to legacy fields
            const gridData = (layoutData as Record<string, unknown>).grid;
            if (gridData && typeof gridData === 'object' && !Array.isArray(gridData) && 'lead' in gridData) {
              const g = gridData as { lead?: number | null; leadImportant?: boolean; left?: (number | null)[]; right?: (number | null)[]; bottom?: (number | null)[] };
              setAries({
                lead: g.lead ?? null,
                leadImportant: !!g.leadImportant,
                left: [...(g.left || [null, null, null]), null, null, null].slice(0, 3) as (number | null)[],
                right: [...(g.right || [null, null, null]), null, null, null].slice(0, 3) as (number | null)[],
                bottom: [...(g.bottom || [null, null, null, null, null, null, null]), null, null, null, null, null, null, null].slice(0, 7) as (number | null)[],
              });
            } else {
              // Legacy field import
              const ld = layoutData as Record<string, unknown>;
              setAries({
                lead: getRelId(ld.mainArticle),
                left: [getRelId(ld.top1), getRelId(ld.top2), getRelId(ld.top3)],
                right: [getRelId(ld.top4), getRelId(ld.op1), getRelId(ld.op2)],
                bottom: [getRelId(ld.op3), getRelId(ld.op4), getRelId(ld.special), null, null],
              });
            }
          } else {
            setSkeleton('custom');
            const gridData = (layoutData as Record<string, unknown>).grid;
            if (gridData && Array.isArray(gridData) && gridData.length > 0) {
              const allArticles = new Map((artData.docs || []).map((a: ArticleData) => [a.id, a]));
              const hydrateCell = (cell: GridCell): GridCell => ({
                ...cell,
                articleId: cell.articleId && allArticles.has(cell.articleId) ? cell.articleId : null,
                children: cell.children ? cell.children.map(hydrateCell) : undefined,
              });
              setGrid((gridData as GridRow[]).map((row: GridRow) => ({ ...row, cells: row.cells.map(hydrateCell) })));
            } else {
              // Import legacy slots into grid as fallback
              const legacySlots = ['mainArticle', 'top1', 'top2', 'top3', 'top4', 'op1', 'op2', 'op3', 'op4', 'special'];
              const legacyArticles = legacySlots
                .map((key) => {
                  const val = (layoutData as Record<string, unknown>)[key];
                  return val && typeof val === 'object' ? (val as Record<string, unknown>).id as number : typeof val === 'number' ? val : null;
                }).filter(Boolean) as number[];
              if (legacyArticles.length > 0) {
                const rows: GridRow[] = [];
                const main = legacyArticles[0];
                const tops = legacyArticles.slice(1, 5);
                if (main) {
                  rows.push({ id: newId(), cells: [
                    { id: newId(), span: 6, articleId: main, direction: 'top' },
                    ...tops.map((aid) => ({ id: newId(), span: Math.floor(6 / Math.max(tops.length, 1)), articleId: aid, direction: 'top' as ImageDirection })),
                  ]});
                }
                const ops = legacyArticles.slice(5, 9);
                if (ops.length > 0) rows.push({ id: newId(), cells: ops.map((aid) => ({ id: newId(), span: Math.floor(12 / ops.length), articleId: aid, direction: 'top' as ImageDirection })) });
                const special = legacyArticles[9];
                if (special) rows.push({ id: newId(), cells: [{ id: newId(), span: 12, articleId: special, direction: 'top' }] });
                setGrid(rows);
              }
            }
          }

          // Load volume & edition (fall back to auto-calculated)
          const savedVolume = (layoutData as Record<string, unknown>).volume;
          const savedEdition = (layoutData as Record<string, unknown>).edition;
          if (typeof savedVolume === 'number' && savedVolume > 0) setVolume(savedVolume);
          if (typeof savedEdition === 'number' && savedEdition > 0) setEdition(savedEdition);

          // Load section layouts
          const sectionLayoutsData = (layoutData as Record<string, unknown>).sectionLayouts;
          if (sectionLayoutsData && typeof sectionLayoutsData === 'object') {
            const sl = sectionLayoutsData as Record<string, { skeleton?: string; pinnedArticles?: number[] }>;
            const loaded = { ...EMPTY_SECTION_LAYOUTS };
            for (const sec of SECTION_NAMES) {
              if (sl[sec]) {
                loaded[sec] = {
                  skeleton: (sl[sec].skeleton as SkeletonId) || 'taurus',
                  pinnedArticles: sl[sec].pinnedArticles || [],
                };
              }
            }
            setSectionLayouts(loaded);
          }
        }
      } catch (err) { setError('Failed to load data'); console.error(err); } finally { setLoading(false); }
    })();
  }, []);

  // ---- Check for edition conflicts ----
  const [editionConflict, setEditionConflict] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    const check = async () => {
      try {
        const res = await fetch(
          `/api/layout?where[volume][equals]=${volume}&where[edition][equals]=${edition}&limit=1&depth=0&select[name]=true`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = await res.json();
        const currentId = docIdRef.current;
        const conflict = (data.docs || []).find((d: { id: number | string }) => String(d.id) !== currentId);
        if (conflict) {
          setEditionConflict(`Volume ${toRoman(volume)} Edition ${toRoman(edition)} already exists as "${conflict.name || 'Untitled'}"`);
        } else {
          setEditionConflict(null);
        }
      } catch {
        // aborted or network error — ignore
      }
    };
    const timeout = setTimeout(check, 300);
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [volume, edition, loading]);

  // ---- Grid mutations ----
  const markDirty = useCallback(() => setSaved(false), []);

  const addRow = useCallback((spans: number[]) => { setGrid((p) => [...p, makeRow(spans)]); markDirty(); }, [markDirty]);
  const deleteRow = useCallback((rowId: string) => { setGrid((p) => p.filter((r) => r.id !== rowId)); markDirty(); }, [markDirty]);

  const addCell = useCallback((rowId: string) => {
    setGrid((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const total = row.cells.reduce((s, c) => s + c.span, 0);
      const remaining = 12 - total;
      if (remaining <= 0) return row;
      return { ...row, cells: [...row.cells, { id: newId(), span: remaining, articleId: null, direction: 'top' as ImageDirection }] };
    }));
    markDirty();
  }, [markDirty]);

  const updateCell = useCallback((cellId: string, updates: Partial<GridCell>) => {
    setGrid((prev) => prev.map((row) => ({ ...row, cells: row.cells.map((c) => c.id === cellId ? { ...c, ...updates } : c) })));
    markDirty();
  }, [markDirty]);

  const clearCell = useCallback((cellId: string) => { updateCell(cellId, { articleId: null }); }, [updateCell]);

  const deleteCell = useCallback((rowId: string, cellId: string) => {
    setGrid((prev) => prev.map((row) => {
      if (row.id !== rowId || row.cells.length <= 1) return row;
      return { ...row, cells: row.cells.filter((c) => c.id !== cellId) };
    }));
    markDirty();
  }, [markDirty]);

  const resizeCell = useCallback((cellId: string, delta: number) => {
    setGrid((prev) => prev.map((row) => {
      const idx = row.cells.findIndex((c) => c.id === cellId);
      if (idx < 0) return row;
      const cell = row.cells[idx];
      const newSpan = Math.max(1, Math.min(12, cell.span + delta));
      const rowTotal = row.cells.reduce((s, c) => s + c.span, 0) - cell.span + newSpan;
      if (rowTotal > 12) return row;
      return { ...row, cells: row.cells.map((c) => c.id === cellId ? { ...c, span: newSpan } : c) };
    }));
    markDirty();
  }, [markDirty]);



  // Stack mutations
  const splitCell = useCallback((cellId: string) => {
    setGrid((prev) => prev.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (cell.id !== cellId) return cell;
        return { ...cell, articleId: null, children: [
          { id: newId(), span: 12, articleId: cell.articleId, direction: cell.direction },
          { id: newId(), span: 12, articleId: null, direction: 'top' as ImageDirection },
        ]};
      }),
    })));
    markDirty();
  }, [markDirty]);

  const addSubCell = useCallback((cellId: string) => {
    setGrid((prev) => prev.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (cell.id !== cellId || !cell.children) return cell;
        return { ...cell, children: [...cell.children, { id: newId(), span: 12, articleId: null, direction: 'top' as ImageDirection }] };
      }),
    })));
    markDirty();
  }, [markDirty]);

  const updateSubCell = useCallback((_cellId: string, subId: string, updates: Partial<GridCell>) => {
    setGrid((prev) => prev.map((row) => ({ ...row, cells: deepUpdateCell(row.cells, subId, updates) })));
    markDirty();
  }, [markDirty]);

  const clearSubCell = useCallback((_cellId: string, subId: string) => {
    setGrid((prev) => prev.map((row) => ({ ...row, cells: deepUpdateCell(row.cells, subId, { articleId: null }) })));
    markDirty();
  }, [markDirty]);

  const deleteSubCell = useCallback((cellId: string, subId: string) => {
    setGrid((prev) => prev.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (cell.id !== cellId || !cell.children) return cell;
        const newChildren = cell.children.filter((c) => c.id !== subId);
        if (newChildren.length <= 1) {
          const remaining = newChildren[0];
          return { ...cell, articleId: remaining?.articleId ?? null, direction: remaining?.direction ?? 'top', children: undefined };
        }
        return { ...cell, children: newChildren };
      }),
    })));
    markDirty();
  }, [markDirty]);

  const unsplitCell = useCallback((cellId: string) => {
    setGrid((prev) => prev.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (cell.id !== cellId || !cell.children) return cell;
        const first = cell.children[0];
        return { ...cell, articleId: first?.articleId ?? null, direction: first?.direction ?? 'top', children: undefined };
      }),
    })));
    markDirty();
  }, [markDirty]);

  // ---- Section layout mutations ----
  const updateSectionPin = useCallback((section: SectionName, index: number, articleId: number | null) => {
    setSectionLayouts((prev) => {
      const pins = [...prev[section].pinnedArticles];
      // Pad with zeros if needed
      while (pins.length <= index) pins.push(0);
      pins[index] = articleId ?? 0;
      return { ...prev, [section]: { ...prev[section], pinnedArticles: pins } };
    });
    markDirty();
  }, [markDirty]);

  const removeSectionPin = useCallback((section: SectionName, index: number) => {
    setSectionLayouts((prev) => {
      const layout = { ...prev[section], pinnedArticles: prev[section].pinnedArticles.filter((_, i) => i !== index) };
      return { ...prev, [section]: layout };
    });
    markDirty();
  }, [markDirty]);

  const changeSectionSkeleton = useCallback((section: SectionName, skel: SkeletonId) => {
    setSectionLayouts((prev) => ({
      ...prev,
      [section]: { ...prev[section], skeleton: skel },
    }));
    markDirty();
  }, [markDirty]);

  const addSectionSlot = useCallback((section: SectionName) => {
    setSectionLayouts((prev) => {
      const layout = { ...prev[section], pinnedArticles: [...prev[section].pinnedArticles, 0] };
      return { ...prev, [section]: layout };
    });
    markDirty();
  }, [markDirty]);

  // ---- DnD ----
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'row') { setActiveSortType('row'); return; }
    if (data?.type === 'cell') { setActiveSortType('cell'); return; }
    if (data?.article) setActiveArticle(data.article);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Handle row reorder
    if (activeSortType === 'row') {
      setActiveSortType(null);
      if (!over) return;
      const activeId = String(active.id).replace('sortrow-', '');
      const overId = String(over.id).replace('sortrow-', '');
      if (activeId !== overId) {
        setGrid((prev) => {
          const oldIdx = prev.findIndex((r) => r.id === activeId);
          const newIdx = prev.findIndex((r) => r.id === overId);
          if (oldIdx < 0 || newIdx < 0) return prev;
          return arrayMove(prev, oldIdx, newIdx);
        });
        markDirty();
      }
      return;
    }

    // Handle cell reorder
    if (activeSortType === 'cell') {
      setActiveSortType(null);
      if (!over) return;
      const activeCellId = String(active.id).replace('sortcell-', '');
      const overCellId = String(over.id).replace('sortcell-', '');
      if (activeCellId !== overCellId) {
        setGrid((prev) => prev.map((row) => {
          const oldIdx = row.cells.findIndex((c) => c.id === activeCellId);
          const newIdx = row.cells.findIndex((c) => c.id === overCellId);
          if (oldIdx < 0 || newIdx < 0) return row;
          return { ...row, cells: arrayMove(row.cells, oldIdx, newIdx) };
        }));
        markDirty();
      }
      return;
    }

    // Handle article drag
    setActiveArticle(null);
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData?.article) return;

    // Drop onto pool = remove from source (trash)
    if (overData?.pool === true) {
      if (activeData.source === 'cell' && typeof activeData.cellId === 'string') {
        const srcId = activeData.cellId as string;
        // Section slot source
        if (srcId.startsWith('section-')) {
          const parts = srcId.split('-');
          const srcSection = parts[1] as SectionName;
          const srcIndex = Number(parts[2]);
          updateSectionPin(srcSection, srcIndex, null);
        }
        // Aries slot source
        else if (isAriesSlotId(srcId)) {
          setAries((prev) => {
            const next = { ...prev, left: [...prev.left], right: [...prev.right], bottom: [...prev.bottom] };
            if (srcId === 'lead') { next.lead = null; return next; }
            const [side, idx] = srcId.split('-');
            if (side === 'left' || side === 'right') next[side][Number(idx)] = null;
            if (side === 'bottom') next.bottom[Number(idx)] = null;
            return next;
          });
        }
        // Grid cell source
        else {
          setGrid((prev) => prev.map((row) => ({
            ...row, cells: deepUpdateCell(row.cells, srcId, { articleId: null }),
          })));
        }
        markDirty();
      }
      return;
    }

    if (!overData?.cellId) return;

    const targetCellId = overData.cellId as string;
    const draggedArticle = activeData.article as ArticleData;

    // Helper to read/write aries slots by slot ID string like "lead", "left-0", "right-2"
    const getAriesSlot = (d: AriesData, sid: string): number | null => {
      if (sid === 'lead') return d.lead;
      const [side, idx] = sid.split('-');
      if (side === 'left' || side === 'right') return d[side][Number(idx)] ?? null;
      if (side === 'bottom') return d.bottom[Number(idx)] ?? null;
      return null;
    };
    const setAriesSlot = (d: AriesData, sid: string, val: number | null): AriesData => {
      const next = { ...d, left: [...d.left], right: [...d.right], bottom: [...d.bottom] };
      if (sid === 'lead') { next.lead = val; return next; }
      const [side, idx] = sid.split('-');
      if (side === 'left' || side === 'right') next[side][Number(idx)] = val;
      if (side === 'bottom') next.bottom[Number(idx)] = val;
      return next;
    };

    // Aries skeleton drop
    if (overData.skeleton === 'aries') {
      if (isAriesSlotId(targetCellId)) {
        // Enforce bottom slot constraints: 0-3,5-6 = text only, 4 = image only
        if (isAriesBottomSlotId(targetCellId)) {
          const slotIdx = Number(targetCellId.split('-')[1]);
          const hasImage = getArticleHasImage(draggedArticle);
          if (slotIdx === 4 && !hasImage) return;   // image-only slot
          if (slotIdx !== 4 && hasImage) return;     // text-only slots
        }

        if (activeData.source === 'cell' && isAriesSlotId(activeData.cellId as string)) {
          // Swap between aries slots
          const sourceCellId = activeData.cellId as string;
          if (sourceCellId === targetCellId) return;
          setAries((prev) => {
            const targetVal = getAriesSlot(prev, targetCellId);
            let next = setAriesSlot(prev, sourceCellId, targetVal);
            next = setAriesSlot(next, targetCellId, draggedArticle.id);
            return next;
          });
        } else {
          setAries((prev) => setAriesSlot(prev, targetCellId, draggedArticle.id));
        }
        markDirty();
        return;
      }
    }

    // Section slot drop
    if (overData.skeleton === 'section') {
      const sectionName = overData.sectionName as SectionName;
      const slotIndex = overData.slotIndex as number;
      // Block photo articles from text-only slots
      if (overData.textOnly && getImageUrl(draggedArticle)) return;
      updateSectionPin(sectionName, slotIndex, draggedArticle.id);
      // If source was also a section slot, clear it
      if (activeData.source === 'cell' && typeof activeData.cellId === 'string' && activeData.cellId.startsWith('section-')) {
        const parts = activeData.cellId.split('-');
        const srcSection = parts[1] as SectionName;
        const srcIndex = Number(parts[2]);
        if (srcSection !== sectionName || srcIndex !== slotIndex) {
          // Swap: put the target's old article into the source slot
          const oldTargetId = sectionLayouts[sectionName].pinnedArticles[slotIndex];
          updateSectionPin(srcSection, srcIndex, oldTargetId || null);
        }
      }
      markDirty();
      return;
    }

    // Custom grid drop
    if (activeData.source === 'cell') {
      const sourceCellId = activeData.cellId as string;
      if (sourceCellId === targetCellId) return;

      // Check if source is an aries slot
      if (isAriesSlotId(sourceCellId)) {
        // Dragging from aries slot to grid cell — clear the aries slot
        setAries((prev) => setAriesSlot(prev, sourceCellId, null));
        setGrid((prev) => prev.map((row) => ({
          ...row, cells: deepUpdateCell(row.cells, targetCellId, { articleId: draggedArticle.id }),
        })));
      } else {
        setGrid((prev) => {
          let targetArticleId: number | null = null;
          for (const row of prev) {
            const found = deepFindCell(row.cells, targetCellId);
            if (found) { targetArticleId = found.articleId; break; }
          }
          return prev.map((row) => ({
            ...row,
            cells: deepUpdateCell(
              deepUpdateCell(row.cells, sourceCellId, { articleId: targetArticleId }),
              targetCellId, { articleId: draggedArticle.id },
            ),
          }));
        });
      }
    } else {
      setGrid((prev) => prev.map((row) => ({
        ...row, cells: deepUpdateCell(row.cells, targetCellId, { articleId: draggedArticle.id }),
      })));
    }
    markDirty();
  };

  // ---- Skeleton switch ----
  const handleSkeletonChange = useCallback((newSkeleton: SkeletonId) => {
    setSkeleton(newSkeleton);
    markDirty();
  }, [markDirty]);

  // ---- Activate ----
  const handleActivate = async () => {
    // Check for unpublished articles in all slots
    const allUsedArticleIds = new Set<number>();
    if (skeleton === 'aries' || skeleton === 'taurus') {
      for (const id of ariesUsedIds(aries)) allUsedArticleIds.add(id);
    } else {
      for (const id of collectArticleIds(grid)) allUsedArticleIds.add(id);
    }
    for (const sec of SECTION_NAMES) {
      for (const id of sectionLayouts[sec].pinnedArticles) {
        if (id > 0) allUsedArticleIds.add(id);
      }
    }
    const unpublished: string[] = [];
    for (const id of allUsedArticleIds) {
      const article = articleMap.get(id);
      if (article && !article.publishedDate) {
        unpublished.push(article.title);
      }
    }
    if (unpublished.length > 0) {
      setError(`Cannot activate: ${unpublished.length} unpublished article${unpublished.length > 1 ? 's' : ''} in layout — ${unpublished.slice(0, 3).join(', ')}${unpublished.length > 3 ? '...' : ''}`);
      return;
    }

    setSaving(true); setError(null);
    try {
      // Save section layouts — preserve array length so extra slots auto-fill on frontend.
      // Trim only trailing zeros (slots removed by user), keep internal zeros (empty = auto-fill).
      const cleanSectionLayouts: Record<string, SectionLayoutData> = {};
      for (const sec of SECTION_NAMES) {
        const pins = [...sectionLayouts[sec].pinnedArticles];
        // Remove trailing zeros only
        while (pins.length > 0 && pins[pins.length - 1] === 0) pins.pop();
        cleanSectionLayouts[sec] = { skeleton: sectionLayouts[sec].skeleton, pinnedArticles: pins };
      }

      const layoutName = `Volume ${toRoman(volume)}, Edition ${toRoman(edition)}`;
      const commonFields = { name: layoutName, volume, edition, sectionLayouts: cleanSectionLayouts };
      let body: Record<string, unknown>;
      if (skeleton === 'aries' || skeleton === 'taurus') {
        const visLeft = aries.left.slice(0, ariesColSlotCount(aries.left, articleMap));
        const visRight = aries.right.slice(0, ariesColSlotCount(aries.right, articleMap));
        body = {
          ...commonFields,
          skeleton,
          grid: { lead: aries.lead, leadImportant: !!aries.leadImportant, left: visLeft, right: visRight, bottom: aries.bottom },
          mainArticle: aries.lead,
          top1: aries.left[0] ?? null, top2: aries.left[1] ?? null, top3: aries.left[2] ?? null,
          top4: aries.right[0] ?? null, op1: aries.right[1] ?? null, op2: aries.right[2] ?? null,
          op3: aries.bottom[0] ?? null, op4: aries.bottom[1] ?? null, special: aries.bottom[2] ?? null,
        };
      } else {
        const allArticleIds = flattenArticleIds(grid);
        body = {
          ...commonFields,
          skeleton: 'custom',
          grid,
          mainArticle: allArticleIds[0] ?? null, top1: allArticleIds[1] ?? null, top2: allArticleIds[2] ?? null,
          top3: allArticleIds[3] ?? null, top4: allArticleIds[4] ?? null, op1: allArticleIds[5] ?? null,
          op2: allArticleIds[6] ?? null, op3: allArticleIds[7] ?? null, op4: allArticleIds[8] ?? null,
          special: allArticleIds[9] ?? null,
        };
      }
      let id = docIdRef.current;
      if (id) {
        const res = await fetch(`/api/layout/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`Save failed (${res.status}): ${await res.text()}`);
      } else {
        const res = await fetch('/api/layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: layoutName, ...body }) });
        if (!res.ok) throw new Error(`Create failed (${res.status}): ${await res.text()}`);
        const data = await res.json();
        id = String(data.doc.id); docIdRef.current = id;
        window.history.replaceState(null, '', `/admin/collections/layout/${id}`);
      }
      setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); console.error('Layout save error:', err); } finally { setSaving(false); }
  };

  // ---- Filter pool ----
  const filteredArticles = articles.filter((a) => {
    if (sectionFilter !== 'all' && a.section !== sectionFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="le-loading"><div className="le-loading-spinner" /><p>Loading layout editor...</p></div>;
  }

  const articleCount = (skeleton === 'aries' || skeleton === 'taurus')
    ? ariesUsedIds(aries).size
    : [...collectArticleIds(grid)].length;

  const currentSkeleton = SKELETON_LIBRARY.find((s) => s.id === skeleton);
  const signColor = SKELETON_SIGN_COLORS[skeleton] || '#3b82f6';

  return (
    <DndContext sensors={sensors} collisionDetection={pointerThenCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="le-root">
        <div className="le-toolbar">
          <div className="le-toolbar-left">
            <h1 className="le-toolbar-title">Front Page</h1>
            <span className="le-toolbar-subtitle">
              {currentSkeleton ? currentSkeleton.name : 'Custom'} &middot; {articleCount} articles
            </span>
          </div>
          <div className="le-toolbar-right">
            {(error || editionConflict) && <span className="le-toolbar-error">{editionConflict || error}</span>}
            <button className={`le-save-btn ${saved ? 'le-save-btn-saved' : 'le-save-btn-unsaved'}`} onClick={handleActivate} disabled={saving || saved || !!editionConflict}>
              {saving ? 'Activating...' : saved ? 'Active' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Volume & Edition */}
        <div className="le-volume-bar" style={{ color: signColor }}>
          <span className="le-volume-sign">{currentSkeleton?.icon}</span>
          <div className="le-volume-group">
            <span className="le-volume-label">Volume</span>
            <span className="le-volume-numeral">{toRoman(volume)}</span>
            <div className="le-volume-arrows">
              <button className="le-volume-arrow" onClick={() => { setVolume((v) => v + 1); markDirty(); }} title="Increment volume">▲</button>
              <button className="le-volume-arrow" onClick={() => { setVolume((v) => Math.max(1, v - 1)); markDirty(); }} title="Decrement volume">▼</button>
            </div>
          </div>
          <span className="le-volume-separator">·</span>
          <div className="le-volume-group">
            <span className="le-volume-label">Edition</span>
            <span className="le-volume-numeral">{toRoman(edition)}</span>
            <div className="le-volume-arrows">
              <button className="le-volume-arrow" onClick={() => { setEdition((e) => e + 1); markDirty(); }} title="Increment edition">▲</button>
              <button className="le-volume-arrow" onClick={() => { setEdition((e) => Math.max(1, e - 1)); markDirty(); }} title="Decrement edition">▼</button>
            </div>
          </div>
          {editionConflict && <span className="le-volume-conflict">⚠ Already exists</span>}
        </div>

        {/* Skeleton picker */}
        <div className="le-skeleton-bar">
          <span className="le-presets-label">Skeleton</span>
          <div className="le-skeleton-list">
            {TOP_SKELETONS.map((skel) => (
              <button
                key={skel.id}
                className={`le-skeleton-btn ${skeleton === skel.id ? 'le-skeleton-active' : ''}`}
                onClick={() => handleSkeletonChange(skel.id)}
                title={skel.description}
              >
                <span className="le-skeleton-icon">{skel.icon}</span>
                <span className="le-skeleton-name">{skel.name}</span>
                {!skel.pinned && <span className="le-skeleton-beta">beta</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="le-body">
          <div className="le-canvas">
            {skeleton === 'aries' ? (
              <AriesEditor
                data={aries}
                articleMap={articleMap}
                onClear={(slotId) => {
                  setAries((prev) => {
                    if (slotId === 'lead') return { ...prev, lead: null };
                    const [side, idx] = slotId.split('-');
                    if (side === 'left' || side === 'right') {
                      const next = { ...prev, [side]: [...prev[side]] };
                      next[side][Number(idx)] = null;
                      return next;
                    }
                    if (side === 'bottom') {
                      const next = { ...prev, bottom: [...prev.bottom] };
                      next.bottom[Number(idx)] = null;
                      return next;
                    }
                    return prev;
                  });
                  markDirty();
                }}
                onToggleLeadImportant={() => {
                  setAries((prev) => ({ ...prev, leadImportant: !prev.leadImportant }));
                  markDirty();
                }}
              />
            ) : skeleton === 'taurus' ? (
              /* Top-area Taurus: reuses aries state — lead=feature, left=supporting, right=list */
              <div className="le-aries-canvas">
                <div className="le-aries-description">
                  <span className="le-presets-label">Taurus</span>
                  <span className="le-aries-desc-text">Feature story with image + supporting text + list rail.</span>
                </div>
                <div className="le-tau-grid">
                  <div className="le-tau-feature">
                    <AriesDropSlot slotId="lead" label="Feature" article={aries.lead !== null ? articleMap.get(aries.lead) || null : null} isLead onClear={() => { setAries((p) => ({ ...p, lead: null })); markDirty(); }} />
                  </div>
                  <div className="le-tau-supporting">
                    {[0, 1, 2].map((i) => (
                      <AriesDropSlot key={`left-${i}`} slotId={`left-${i}`} label={`Support ${i + 1}`} article={aries.left[i] !== null ? articleMap.get(aries.left[i]!) || null : null} isLead={false} onClear={() => { setAries((p) => { const next = { ...p, left: [...p.left] }; next.left[i] = null; return next; }); markDirty(); }} />
                    ))}
                  </div>
                  <div className="le-tau-list">
                    {[0, 1, 2].map((i) => (
                      <AriesDropSlot key={`right-${i}`} slotId={`right-${i}`} label={`List ${i + 1}`} article={aries.right[i] !== null ? articleMap.get(aries.right[i]!) || null : null} isLead={false} onClear={() => { setAries((p) => { const next = { ...p, right: [...p.right] }; next.right[i] = null; return next; }); markDirty(); }} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <RowPresets onAdd={addRow} />

                {grid.length === 0 && <div className="le-empty-canvas"><p>No rows yet. Click a preset above to add your first row.</p></div>}

                <SortableContext items={rowSortIds} strategy={verticalListSortingStrategy}>
                  {grid.map((row, i) => (
                    <SortableGridRow
                      key={row.id} row={row} rowIndex={i} articleMap={articleMap}
                      onDeleteRow={() => deleteRow(row.id)}
                      onAddCell={() => addCell(row.id)}
                      onUpdateCell={(cellId, updates) => updateCell(cellId, updates)}
                      onDeleteCell={(cellId) => deleteCell(row.id, cellId)}
                      onClearCell={(cellId) => clearCell(cellId)}
                      onSplitCell={(cellId) => splitCell(cellId)}
                      onAddSubCell={(cellId) => addSubCell(cellId)}
                      onUpdateSubCell={(cellId, subId, updates) => updateSubCell(cellId, subId, updates)}
                      onClearSubCell={(cellId, subId) => clearSubCell(cellId, subId)}
                      onDeleteSubCell={(cellId, subId) => deleteSubCell(cellId, subId)}
                      onUnsplitCell={(cellId) => unsplitCell(cellId)}
                      onResizeCell={(cellId, delta) => resizeCell(cellId, delta)}
                    />
                  ))}
                </SortableContext>

                {grid.length > 0 && <RowPresets onAdd={addRow} />}
              </>
            )}

            {/* Section layouts */}
            <div className="le-section-editors">
              <div className="le-section-editors-header">
                <h2 className="le-section-editors-title">Section Layouts</h2>
                <span className="le-section-editors-subtitle">Pin articles to control what appears in each section. Unpinned slots auto-fill.</span>
              </div>
              {SECTION_NAMES.map((sec) => (
                <SectionEditor
                  key={sec}
                  sectionName={sec}
                  layout={sectionLayouts[sec]}
                  articleMap={articleMap}
                  onRemovePin={(index) => removeSectionPin(sec, index)}
                  onAddSlot={() => addSectionSlot(sec)}
                  onChangeSkeleton={(skel) => changeSectionSkeleton(sec, skel)}
                />
              ))}
            </div>
          </div>

          <PoolDropZone>
            <div className="le-pool-header">
              <h2 className="le-pool-title">Articles</h2>
              <span className="le-pool-count">{filteredArticles.length}</span>
            </div>
            <input type="text" className="le-pool-search" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="le-pool-filters">
              {(['all', 'news', 'features', 'opinion', 'sports'] as const).map((s) => (
                <button key={s} className={`le-filter-pill ${sectionFilter === s ? 'le-filter-active' : ''}`}
                  onClick={() => setSectionFilter(s)}
                  style={sectionFilter === s && s !== 'all' ? { background: SECTION_COLORS[s], borderColor: SECTION_COLORS[s] } : undefined}
                >{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
            <div className="le-pool-list">
              {filteredArticles.map((article) => (
                <DraggablePoolCard key={article.id} article={article} isUsed={usedIds.has(article.id)} />
              ))}
              {filteredArticles.length === 0 && <div className="le-pool-empty">No articles found</div>}
            </div>
          </PoolDropZone>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeArticle ? <DragOverlayCard article={activeArticle} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
