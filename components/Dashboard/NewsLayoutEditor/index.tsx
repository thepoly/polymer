'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TimelinePageEditor, pannedFrame } from '../TimelinePageEditor';
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
  FEATURED_SLOTS,
  SECONDARY_SLOTS,
  normalizeFeatured,
  normalizeLeadFrame,
  normalizeSecondary,
  normalizeTopicCards,
  normalizeTopicPicks,
  type TopicCardStyle,
  type TopicPicks,
  type LeadFrame,
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
import { MAX_ZOOM, MIN_ZOOM, type PhotoFrame } from '@/components/News/timelinePage';
import { NEWS_TOPICS, TOPIC_CARDS, type NewsTopicKey } from '@/components/News/newsTopics';

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
  featuredImage?:
    | { url?: string | null; alt?: string | null; focalX?: number | null; focalY?: number | null }
    | number
    | null;
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

function DraggableSlotArticle({
  article,
  slotId,
  showImage,
}: {
  article: ArticleData;
  slotId: string;
  showImage: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-article-${slotId}`,
    data: { article, source: 'slot', slotId },
  });
  const imageUrl = showImage ? getImageUrl(article) : null;
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
  needsImage = true,
}: {
  slotId: string;
  label: string;
  article: ArticleData | null;
  emptyHint: string;
  onClear: () => void;
  /** Whether the page shows this slot's photo: previews it and flags a story without one */
  needsImage?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop-${slotId}`, data: { slotId } });
  const missingImage = needsImage && article !== null && !getImageUrl(article);

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
        <DraggableSlotArticle article={article} slotId={slotId} showImage={needsImage} />
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
  if (position === 'overlay') {
    // Text lines in white over the bottom of the photo
    return (
      <div style={{ position: 'relative', width: 84, height: 60, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'currentColor', opacity: 0.35 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0) 70%)' }} />
        <div style={{ position: 'absolute', left: 5, right: 5, bottom: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 3, width: '35%', background: '#fff', borderRadius: 1 }} />
          <div style={{ height: 5, width: '85%', background: '#fff', borderRadius: 1 }} />
          <div style={{ height: 3, width: '70%', background: '#fff', opacity: 0.6, borderRadius: 1 }} />
        </div>
      </div>
    );
  }
  const photo =<div style={{ flex: '1 1 0', minWidth: 0, minHeight: 0, background: 'currentColor', opacity: 0.35, borderRadius: 2 }} />;
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
// Topic row card style
// ---------------------------------------------------------------------------

/** One choice in a row of two or more buttons */
function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{label}</span>
      <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 6, maxWidth: 420 }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={opt.value === value}
            onClick={() => onChange(opt.value)}
            style={{ ...smallButtonStyle(opt.value === value), flex: 'none', padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * How the topic row's cards look: headlines over the photo, or under it,
 * and when under it, whether the subdeck shows too
 */
function TopicCardsEditor({ value, onChange }: { value: TopicCardStyle; onChange: (next: TopicCardStyle) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <ChoiceRow
        label="Headlines"
        value={value.overlay ? 'over' : 'under'}
        options={[
          { value: 'over', label: 'Over the photo' },
          { value: 'under', label: 'Under the photo' },
        ]}
        onChange={(v) => onChange({ ...value, overlay: v === 'over' })}
      />
      {!value.overlay && (
        <ChoiceRow
          label="Subdeck"
          value={value.subdeck ? 'show' : 'hide'}
          options={[
            { value: 'show', label: 'Show' },
            { value: 'hide', label: 'Hide' },
          ]}
          onChange={(v) => onChange({ ...value, subdeck: v === 'show' })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stories under the lead
// ---------------------------------------------------------------------------

const SUB_SLOT_IDS = Array.from({ length: SECONDARY_SLOTS }, (_, i) => `sub-${i}`);
const FEATURED_SLOT_IDS = Array.from({ length: FEATURED_SLOTS }, (_, i) => `feat-${i}`);
/** "topic-academia-2": third chosen story on the Academia tab */
const topicSlotId = (key: NewsTopicKey, index: number) => `topic-${key}-${index}`;
const parseTopicSlot = (slotId: string): { key: NewsTopicKey; index: number } | null => {
  const m = /^topic-([a-z]+)-(\d+)$/.exec(slotId);
  const topic = m ? NEWS_TOPICS.find((t) => t.key === m[1]) : undefined;
  return m && topic ? { key: topic.key, index: Number(m[2]) } : null;
};

/** Fields the editor needs for each article, for the REST API's `select` */
const ARTICLE_SELECT_QUERY =
  '&select[title]=true&select[plainTitle]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
  '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
  '&select[authors]=true&select[writeInAuthors]=true';

/** Slot label, saying whether the lead's current layout shows that slot */
function subSlotLabel(index: number, position: LeadTextPosition): string {
  const beside = position === 'east' || position === 'west';
  const name = index === 0 ? 'First story under the lead' : 'Second story under the lead';
  if (index === 1 && !beside) return `${name} (not shown with this text position)`;
  if (index === 0 && (position === 'north' || position === 'south')) return `${name} (only when there's room)`;
  return name;
}

// ---------------------------------------------------------------------------
// Lead photo crop: what stays in view as the photo's shape changes
// ---------------------------------------------------------------------------

const PREVIEW_WIDTH = 150;

/** One shape the lead photo can take, with the photo framed as the page would. Drag to reposition. */
function LeadCropPreview({
  src,
  label,
  ratio,
  frame,
  onFrame,
}: {
  src: string;
  label: string;
  /** Width ÷ height of the box */
  ratio: number;
  frame: PhotoFrame;
  onFrame: (frame: PhotoFrame) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  // Pointer and framing when the grab started
  const drag = useRef<{ x: number; y: number; frame: PhotoFrame } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const endDrag = () => {
    drag.current = null;
    setGrabbing(false);
  };
  const position = `${frame.x}% ${frame.y}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: PREVIEW_WIDTH }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 600, opacity: 0.7 }}>{label}</span>
      <div
        title="Drag the photo to reposition it"
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: PREVIEW_WIDTH,
          height: Math.round(PREVIEW_WIDTH / ratio),
          borderRadius: 2,
          background: '#111',
          touchAction: 'none',
          userSelect: 'none',
          cursor: grabbing ? 'grabbing' : 'grab',
        }}
        onPointerDown={(e) => {
          if (!imgRef.current?.naturalWidth) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, frame };
          setGrabbing(true);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          const img = imgRef.current;
          if (!start || !img) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onFrame(
            pannedFrame(
              start.frame,
              e.clientX - start.x,
              e.clientY - start.y,
              { width: rect.width, height: rect.height },
              { width: img.naturalWidth, height: img.naturalHeight },
            ),
          );
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: position,
            transformOrigin: position,
            transform: `scale(${frame.zoom})`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

function ZoomSlider({ label, frame, onFrame }: { label: string; frame: PhotoFrame; onFrame: (f: PhotoFrame) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.62rem', fontWeight: 600, width: PREVIEW_WIDTH }}>
      <span style={{ opacity: 0.7 }}>
        {label} zoom {Math.round(frame.zoom * 100)}%
      </span>
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.05}
        value={frame.zoom}
        aria-label={`${label} zoom`}
        onChange={(e) => onFrame({ ...frame, zoom: Number(e.target.value) })}
        style={{ width: '100%', accentColor: '#c41e3a' }}
      />
    </label>
  );
}

/**
 * Crop of the lead photo. The page changes the photo's height on computers to
 * line its two columns up, so the editor shows the shortest and tallest shapes
 * it can take; both follow one "computer" framing. Phones always show 3:2 and
 * can be framed apart. The framing is kept per story.
 */
function LeadCropEditor({
  article,
  position,
  frame,
  onChange,
}: {
  article: ArticleData;
  position: LeadTextPosition;
  frame: LeadFrame | null;
  onChange: (next: LeadFrame | null) => void;
}) {
  const src = getImageUrl(article);
  if (!src) return null;
  const media = typeof article.featuredImage === 'object' ? article.featuredImage : null;
  // The photo's own focal point, not zoomed: the framing when nothing is set
  const base: PhotoFrame = {
    x: typeof media?.focalX === 'number' ? media.focalX : 50,
    y: typeof media?.focalY === 'number' ? media.focalY : 50,
    zoom: 1,
  };
  const own = frame && frame.article === article.id ? frame : null;
  const desktop = own?.desktop ?? base;
  const mobile = own?.mobile ?? desktop;
  const set = (next: { desktop: PhotoFrame | null; mobile: PhotoFrame | null }) =>
    onChange(next.desktop || next.mobile ? { article: article.id, ...next } : null);
  const setDesktop = (f: PhotoFrame | null) => set({ desktop: f, mobile: own?.mobile ?? null });
  const setMobile = (f: PhotoFrame | null) => set({ desktop: own?.desktop ?? null, mobile: f });
  const beside = position === 'east' || position === 'west';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Lead photo crop</span>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Above, under or behind the text, the photo goes as wide as 2:1
              to keep the whole lead on a laptop's first screen (NewsLead) */}
          <LeadCropPreview
            src={src}
            label="Computer, at its shortest"
            ratio={beside ? 16 / 9 : 2}
            frame={desktop}
            onFrame={setDesktop}
          />
          <ZoomSlider label="Computer" frame={desktop} onFrame={setDesktop} />
          {own?.desktop && (
            <button type="button" className="tpe-btn" onClick={() => setDesktop(null)}>
              Reset
            </button>
          )}
        </div>
        <LeadCropPreview
          src={src}
          label="Computer, at its tallest"
          ratio={beside ? 4 / 5 : 4 / 3}
          frame={desktop}
          onFrame={setDesktop}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <LeadCropPreview src={src} label="Phone" ratio={3 / 2} frame={mobile} onFrame={setMobile} />
          <ZoomSlider label="Phone" frame={mobile} onFrame={setMobile} />
          {own?.mobile ? (
            <button type="button" className="tpe-btn" onClick={() => setMobile(null)}>
              Match computer
            </button>
          ) : (
            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>Same as computer</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '0.62rem', opacity: 0.5, maxWidth: 520 }}>
        On computers the page makes this photo shorter or taller so the two columns end on the same line, so it&rsquo;s
        cropped differently from day to day. Drag a photo to choose what stays in view, and zoom in to crop tighter.
        Unset, it follows the photo&rsquo;s focal point. The crop is kept for this story only.
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
            Always show the latest
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
          {config.count === 2 && (
            <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
              A third is added on computers when this column would end short of the lead&rsquo;s.
            </span>
          )}
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
  const [leadFrame, setLeadFrame] = useState<LeadFrame | null>(null);
  const [secondary, setSecondary] = useState<(number | null)[]>(() => normalizeSecondary(null));
  const [secondaryPhotos, setSecondaryPhotos] = useState(true);
  const [featured, setFeatured] = useState<(number | null)[]>(() => normalizeFeatured(null));
  const [topicCards, setTopicCards] = useState<TopicCardStyle>(() => normalizeTopicCards(null));
  const [topicPicks, setTopicPicks] = useState<Record<NewsTopicKey, TopicPicks>>(() => normalizeTopicPicks(null));
  const [activeTopic, setActiveTopic] = useState<NewsTopicKey>(NEWS_TOPICS[0].key);
  const [bulletsHeadlinesOnly, setBulletsHeadlinesOnly] = useState(false);
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
  // Slots: "lead-0", "sub-0", "sub-1", "feat-0" to "feat-3", "gov-senate", "gov-eboard". A box's pin only counts
  // while the box is in article mode.
  const slotArticleId = (slotId: string): number | null => {
    if (slotId === 'lead-0') return lead;
    if (slotId.startsWith('sub-')) return secondary[Number(slotId.slice(4))] ?? null;
    if (slotId.startsWith('feat-')) return featured[Number(slotId.slice(5))] ?? null;
    if (slotId === 'gov-senate' || slotId === 'gov-eboard') {
      const box = studentGov[slotId === 'gov-senate' ? 'senate' : 'eboard'];
      return box.mode === 'article' ? box.article : null;
    }
    // A topic's picks only count while the tab is set to chosen stories
    const topic = parseTopicSlot(slotId);
    if (topic) return topicPicks[topic.key].manual ? topicPicks[topic.key].articles[topic.index] ?? null : null;
    return null;
  };
  const topicSlotIds = NEWS_TOPICS.flatMap((t) => Array.from({ length: TOPIC_CARDS }, (_, i) => topicSlotId(t.key, i)));
  const usedIds = new Set<number>(
    ['lead-0', ...SUB_SLOT_IDS, ...FEATURED_SLOT_IDS, 'gov-senate', 'gov-eboard', ...topicSlotIds]
      .map(slotArticleId)
      .filter((id): id is number => id !== null),
  );

  // ---- Fetch ----
  useEffect(() => {
    (async () => {
      try {
        const artRes = await fetch(
          '/api/articles?where[section][equals]=news&where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' +
            ARTICLE_SELECT_QUERY,
        );
        const artData = await artRes.json();
        const loaded: ArticleData[] = artData.docs || [];

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
          setLeadFrame(normalizeLeadFrame(savedLayout.leadFrame));
          setSecondary(normalizeSecondary(savedLayout.secondary));
          setSecondaryPhotos(savedLayout.secondaryPhotos !== false);
          setFeatured(normalizeFeatured(savedLayout.featured));
          setTopicCards(normalizeTopicCards(savedLayout.topicCards));
          const picks = normalizeTopicPicks(savedLayout.topicPicks);
          setTopicPicks(picks);
          setBulletsHeadlinesOnly(savedLayout.bulletsHeadlinesOnly === true);
          setStudentGov(normalizeStudentGovLayout(savedLayout.studentGov));

          // Placed stories older than the newest hundred aren't in the list,
          // which would show their slots as empty: fetch them too
          const gov = normalizeStudentGovLayout(savedLayout.studentGov);
          const placedIds = [
            savedLayout.lead ?? null,
            ...normalizeSecondary(savedLayout.secondary),
            ...normalizeFeatured(savedLayout.featured),
            gov.senate.article,
            gov.eboard.article,
            ...NEWS_TOPICS.flatMap((t) => picks[t.key].articles),
          ].filter((id): id is number => typeof id === 'number');
          const have = new Set(loaded.map((a) => a.id));
          const missing = [...new Set(placedIds)].filter((id) => !have.has(id));
          if (missing.length > 0) {
            const extraRes = await fetch(
              `/api/articles?where[id][in]=${missing.join(',')}&where[_status][equals]=published&limit=${missing.length}&depth=1` +
                ARTICLE_SELECT_QUERY,
            );
            if (extraRes.ok) loaded.push(...(((await extraRes.json()).docs || []) as ArticleData[]));
          }
        }
        setArticles(loaded);
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

  const changeLeadFrame = useCallback((next: LeadFrame | null) => {
    setLeadFrame(next);
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
    } else if (slotId.startsWith('sub-')) {
      const index = Number(slotId.slice(4));
      setSecondary((prev) => prev.map((current, i) => (i === index ? id : current)));
    } else if (slotId.startsWith('feat-')) {
      const index = Number(slotId.slice(5));
      setFeatured((prev) => prev.map((current, i) => (i === index ? id : current)));
    } else if (slotId === 'gov-senate' || slotId === 'gov-eboard') {
      const body: StudentGovBody = slotId === 'gov-senate' ? 'senate' : 'eboard';
      setStudentGov((prev) => ({ ...prev, [body]: { ...prev[body], article: id } }));
    } else {
      const topic = parseTopicSlot(slotId);
      if (topic) {
        setTopicPicks((prev) => ({
          ...prev,
          [topic.key]: {
            ...prev[topic.key],
            articles: prev[topic.key].articles.map((current, i) => (i === topic.index ? id : current)),
          },
        }));
      }
    }
    markDirty();
  };

  const setTopicManual = (key: NewsTopicKey, manual: boolean) => {
    setTopicPicks((prev) => ({ ...prev, [key]: { ...prev[key], manual } }));
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
      const layout: NewsLayout = { ...(latest?.layout ?? {}), lead, leadTextPosition, leadFrame, secondary, secondaryPhotos, featured, topicCards, topicPicks, bulletsHeadlinesOnly, studentGov };
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
  // With no lead pinned, the page leads with the newest story that has a photo
  const shownLead = leadArticle ?? articles.find((a) => getImageUrl(a)) ?? null;

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
                {shownLead && (
                  <LeadCropEditor
                    article={shownLead}
                    position={leadTextPosition}
                    frame={leadFrame}
                    onChange={changeLeadFrame}
                  />
                )}
                <div className="fle-column-header">
                  <span className="fle-column-title">Under the lead</span>
                </div>
                {SUB_SLOT_IDS.map((slotId, i) => (
                  <DropSlot
                    key={slotId}
                    slotId={slotId}
                    label={subSlotLabel(i, leadTextPosition)}
                    article={secondary[i] !== null ? articleMap.get(secondary[i] as number) ?? null : null}
                    emptyHint="Drop article (empty uses the next newest story)"
                    needsImage={false}
                    onClear={() => setSlotArticle(slotId, null)}
                  />
                ))}
                <ChoiceRow
                  label="Photos"
                  value={secondaryPhotos ? 'on' : 'off'}
                  options={[
                    { value: 'on', label: 'Photo on the right' },
                    { value: 'off', label: 'Text only' },
                  ]}
                  onChange={(v) => {
                    setSecondaryPhotos(v === 'on');
                    markDirty();
                  }}
                />
                <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
                  Each story runs as a headline, byline and summary, with its photo cropped square on the right
                  (a story without a photo runs text only either way). How many show follows the lead&rsquo;s text position: two
                  beside the photo, one over it, and one above or below it only when the lead ends well short of the
                  Student Government column.
                </span>
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
                <ChoiceRow
                  label="Bullets (both boxes)"
                  value={bulletsHeadlinesOnly ? 'headlines' : 'summaries'}
                  options={[
                    { value: 'summaries', label: 'With summaries' },
                    { value: 'headlines', label: 'Headlines only' },
                  ]}
                  onChange={(v) => {
                    setBulletsHeadlinesOnly(v === 'headlines');
                    markDirty();
                  }}
                />
                <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
                  Headlines only drops the summaries and sets the headlines larger. The column gets shorter, so the
                  story strips under the lead only appear when there&rsquo;s room for them.
                </span>
              </div>
              {/* Featured row: runs the full width under the two columns, as on the page */}
              <div className="fle-column" style={{ gridColumn: '1 / -1' }}>
                <div className="fle-column-header">
                  <span className="fle-column-title">Featured</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FEATURED_SLOTS}, minmax(0, 1fr))`, gap: 10 }}>
                  {FEATURED_SLOT_IDS.map((slotId, i) => (
                    <DropSlot
                      key={slotId}
                      slotId={slotId}
                      label={`Featured ${i + 1}`}
                      article={featured[i] !== null ? articleMap.get(featured[i] as number) ?? null : null}
                      emptyHint="Drop article"
                      onClear={() => setSlotArticle(slotId, null)}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
                  Four cards with photos, left to right. An empty slot uses the next newest story with a photo that
                  isn&rsquo;t already on the page.
                </span>
              </div>
              {/* Topic row: Administration, Academia, Campus Infrastructure, Interview */}
              <div className="fle-column" style={{ gridColumn: '1 / -1' }}>
                <div className="fle-column-header">
                  <span className="fle-column-title">Topic row</span>
                </div>
                <TopicCardsEditor
                  value={topicCards}
                  onChange={(next) => {
                    setTopicCards(next);
                    markDirty();
                  }}
                />
                {/* Stories per tab: the six newest, or chosen ones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Stories</span>
                  <div role="tablist" aria-label="Topic" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {NEWS_TOPICS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={t.key === activeTopic}
                        onClick={() => setActiveTopic(t.key)}
                        style={{ ...smallButtonStyle(t.key === activeTopic), flex: 'none', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        {t.label}
                        <span style={{ marginLeft: 6, fontWeight: 400, opacity: 0.6 }}>
                          {topicPicks[t.key].manual ? 'chosen' : 'newest'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {(() => {
                  const topic = NEWS_TOPICS.find((t) => t.key === activeTopic) ?? NEWS_TOPICS[0];
                  const picks = topicPicks[topic.key];
                  return (
                    <>
                      <ChoiceRow
                        label={`${topic.label} tab`}
                        value={picks.manual ? 'manual' : 'newest'}
                        options={[
                          { value: 'newest', label: `Six newest` },
                          { value: 'manual', label: 'Choose stories' },
                        ]}
                        onChange={(v) => setTopicManual(topic.key, v === 'manual')}
                      />
                      {picks.manual ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                          {Array.from({ length: TOPIC_CARDS }, (_, i) => {
                            const id = picks.articles[i];
                            return (
                              <DropSlot
                                key={topicSlotId(topic.key, i)}
                                slotId={topicSlotId(topic.key, i)}
                                label={`${topic.label} ${i + 1}`}
                                article={id != null ? articleMap.get(id) ?? null : null}
                                emptyHint="Drop article (empty uses the next newest)"
                                onClear={() => setSlotArticle(topicSlotId(topic.key, i), null)}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                      <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>
                        {picks.manual
                          ? `Six cards, left to right and top to bottom. Any story can go here, whatever its kicker. An empty slot uses the next newest ${topic.label} story that isn't already on the page.`
                          : `Shows the six newest ${topic.label} stories (by kicker) that aren't already higher up the page. Choose stories to pick them yourself; picks are kept if you switch back.`}
                      </span>
                    </>
                  );
                })()}
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
