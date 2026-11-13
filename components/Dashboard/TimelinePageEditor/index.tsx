'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStepNav } from '@payloadcms/ui';
import '../FeaturesLayoutEditor/features-layout-editor.css';
import './timeline-page-editor.css';
import { STUDENT_GOV, type StudentGovBody } from '@/components/News/studentGov';
import {
  EMPTY_TIMELINE_PAGE,
  ENTRY_IMAGES,
  ENTRY_SIZES,
  IMAGE_SIDE_WIDTHS,
  IMAGE_TOP_HEIGHTS,
  entryKey,
  monthKeyLabel,
  monthKeyOf,
  normalizeTimelinePages,
  resolveStream,
  schoolYearLabel,
  schoolYearMonthKeys,
  schoolYearOf,
  type EntrySize,
  type ResolvedEntryLayout,
  type TimelineEntryLayout,
  type TimelinePageConfig,
  type TimelinePhoto,
  MAX_ZOOM,
  MIN_ZOOM,
  type PhotoFrame,
} from '@/components/News/timelinePage';

// ---------------------------------------------------------------------------
// Types and helpers
// ---------------------------------------------------------------------------

type MediaDoc = {
  id: number;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  title?: string | null;
  alt?: string | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: { card?: { url?: string | null } | null; gallery?: { url?: string | null } | null } | null;
};

type StreamEntry =
  | { kind: 'article'; id: number; date: string; title: string; subdeck: string | null; image: MediaDoc | null }
  | { kind: 'update'; id: number; date: string; title: string; blurb: string };

type ArticleDoc = {
  id: number;
  plainTitle?: string | null;
  subdeck?: string | null;
  publishedDate?: string | null;
  createdAt: string;
  featuredImage?: MediaDoc | number | null;
};

type UpdateDoc = { id: number; title: string; blurb: string; date: string };

/** Which photo the panel editor is working on */
type PhotoTarget = 'default' | string;


const mediaThumb = (m: MediaDoc | null | undefined) => m?.sizes?.card?.url || m?.thumbnailURL || m?.url || null;
const mediaLarge = (m: MediaDoc | null | undefined) => m?.sizes?.gallery?.url || m?.url || null;
const mediaName = (m: MediaDoc) => m.title || m.alt || m.filename || `Photo ${m.id}`;


const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });

/** ISO → value for <input type="datetime-local"> in the browser's time zone */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const extractDocId = (): string | null => {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('news-page-layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
};

/** The one place this editor draws a plain <img> (thumbnails from the media API) */
function Thumb(props: React.ComponentProps<'img'>) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...props} />;
}

// ---------------------------------------------------------------------------
// Media picker
// ---------------------------------------------------------------------------

function MediaPicker({ title, onPick, onClose }: { title: string; onPick: (m: MediaDoc) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = query.trim();
      let url = '/api/media?limit=36&sort=-createdAt&depth=0&where[and][0][mimeType][contains]=image';
      if (q) {
        const e = encodeURIComponent(q);
        url += `&where[and][1][or][0][title][like]=${e}&where[and][1][or][1][filename][like]=${e}&where[and][1][or][2][alt][like]=${e}`;
      }
      try {
        const data = await fetch(url).then((r) => r.json());
        setResults(data.docs || []);
      } catch {
        setError('Could not load photos');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('_payload', JSON.stringify({ title: file.name.replace(/\.[^.]+$/, '') }));
      const res = await fetch('/api/media', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onPick(data.doc as MediaDoc);
    } catch {
      setError('Upload failed. Check the file is an image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="tpe-modal-backdrop" onClick={onClose}>
      <div className="tpe-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="tpe-modal-head">
          <h3>{title}</h3>
          <button type="button" className="tpe-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="tpe-modal-tools">
          <input
            className="tpe-input"
            placeholder="Search photos by title or file name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <label className="tpe-btn tpe-btn-primary">
            {uploading ? 'Uploading…' : 'Upload a photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
          </label>
        </div>
        {error && <p className="tpe-error">{error}</p>}
        <div className="tpe-media-grid">
          {loading && results.length === 0 ? (
            <p className="tpe-muted">Loading photos…</p>
          ) : results.length === 0 ? (
            <p className="tpe-muted">No photos match.</p>
          ) : (
            results.map((m) => (
              <button key={m.id} type="button" className="tpe-media-item" onClick={() => onPick(m)} title={mediaName(m)}>
                {mediaThumb(m) && <Thumb src={mediaThumb(m) as string} alt="" />}
                <span>{mediaName(m)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel photo
// ---------------------------------------------------------------------------

type Screen = 'desktop' | 'mobile';

/** The photo's own focal point, not zoomed: the framing when nothing is set */
const mediaFrame = (m: MediaDoc | null | undefined): PhotoFrame => ({
  x: typeof m?.focalX === 'number' ? m.focalX : 50,
  y: typeof m?.focalY === 'number' ? m.focalY : 50,
  zoom: 1,
});

/** Framing a screen actually shows: phones follow the computer unless set */
const frameFor = (photo: TimelinePhoto | null, m: MediaDoc | null | undefined, screen: Screen): PhotoFrame => {
  const desktop = photo?.desktop ?? mediaFrame(m);
  return screen === 'desktop' ? desktop : photo?.mobile ?? desktop;
};

const zoomLabel = (zoom: number) => `${Math.round(zoom * 100)}%`;

/**
 * Where a pulled photo should sit. The photo is drawn cover-fit at `zoom`, and
 * because the zoom pivots on the object-position point, its left edge lands
 * at x% · (box width − drawn width); likewise for the top. Moving the photo
 * by (dx, dy) pixels is therefore a change of dx / (box width − drawn width)
 * in x (and the same for y). An axis with no spare photo can't move.
 */
function pannedFrame(
  start: PhotoFrame,
  dx: number,
  dy: number,
  box: { width: number; height: number },
  natural: { width: number; height: number },
): PhotoFrame {
  const cover = Math.max(box.width / natural.width, box.height / natural.height) * start.zoom;
  const spareX = box.width - natural.width * cover;
  const spareY = box.height - natural.height * cover;
  const move = (pct: number, delta: number, spare: number) =>
    spare < -0.5 ? Math.round(Math.min(100, Math.max(0, pct + (delta / spare) * 100)) * 10) / 10 : pct;
  return { ...start, x: move(start.x, dx, spareX), y: move(start.y, dy, spareY) };
}

/**
 * Preview of the left panel on one screen, with the tint, shading, title and
 * month drawn roughly as the page does. Grab the photo and pull it to
 * reposition it.
 */
function PanelPreview({
  src,
  frame,
  screen,
  title,
  month,
  onFrame,
  dimmed,
}: {
  src: string | null;
  frame: PhotoFrame;
  screen: Screen;
  title: string;
  month: string;
  onFrame?: (frame: PhotoFrame) => void;
  dimmed?: boolean;
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
    <div
      className={`tpe-preview tpe-preview-${screen} ${onFrame && src ? 'tpe-preview-pannable' : ''} ${
        grabbing ? 'tpe-preview-grabbing' : ''
      } ${dimmed ? 'tpe-preview-dimmed' : ''}`}
      title={onFrame && src ? 'Drag the photo to reposition it' : undefined}
      onPointerDown={(e) => {
        if (!onFrame || !imgRef.current?.naturalWidth) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, frame };
        setGrabbing(true);
      }}
      onPointerMove={(e) => {
        const start = drag.current;
        const img = imgRef.current;
        if (!start || !onFrame || !img) return;
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
      {src ? (
        <Thumb
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          style={{ objectPosition: position, transformOrigin: position, transform: `scale(${frame.zoom})` }}
        />
      ) : (
        <span className="tpe-preview-empty">No photo</span>
      )}
      <span className="tpe-preview-tint" aria-hidden="true" />
      <span className="tpe-preview-scrim" aria-hidden="true" />
      <span className="tpe-preview-title" aria-hidden="true">
        {title}
      </span>
      <span className="tpe-preview-month" aria-hidden="true">
        {month}
      </span>
    </div>
  );
}

/** One screen's preview plus its zoom and reset controls */
function ScreenFrameEditor({
  screen,
  photo,
  shown,
  dimmed,
  title,
  month,
  onPhoto,
}: {
  screen: Screen;
  /** The slot's own photo; null when it borrows one (preview only) */
  photo: TimelinePhoto | null;
  shown: MediaDoc | null;
  dimmed: boolean;
  title: string;
  month: string;
  onPhoto: (next: TimelinePhoto) => void;
}) {
  const frame = frameFor(photo, shown, screen);
  const set = (next: PhotoFrame | null) => photo && onPhoto({ ...photo, [screen]: next });
  const followsDesktop = screen === 'mobile' && photo !== null && photo.mobile === null;
  const isSet = photo !== null && photo[screen] !== null;

  return (
    <div className="tpe-screen">
      <div className="tpe-screen-head">
        <strong>{screen === 'desktop' ? 'Computer' : 'Phone'}</strong>
        {followsDesktop && <span className="tpe-muted">Same as computer</span>}
      </div>
      <PanelPreview
        src={mediaLarge(shown)}
        frame={frame}
        screen={screen}
        title={title}
        month={month}
        dimmed={dimmed}
        onFrame={photo ? set : undefined}
      />
      {photo && (
        <div className="tpe-screen-controls">
          <label className="tpe-zoom">
            <span>Zoom {zoomLabel(frame.zoom)}</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={frame.zoom}
              aria-label={`${screen === 'desktop' ? 'Computer' : 'Phone'} zoom`}
              onChange={(e) => set({ ...frame, zoom: Number(e.target.value) })}
            />
          </label>
          {isSet && (
            <button type="button" className="tpe-btn" onClick={() => set(null)}>
              {screen === 'desktop' ? 'Reset' : 'Match computer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoPanel({
  title,
  config,
  year,
  media,
  entries,
  onChange,
}: {
  /** Page title drawn on the previews ("Student Senate") */
  title: string;
  config: TimelinePageConfig;
  year: number;
  media: Map<number, MediaDoc>;
  entries: StreamEntry[];
  onChange: (next: TimelinePageConfig['photos'], picked?: MediaDoc) => void;
}) {
  const [target, setTarget] = useState<PhotoTarget>('default');
  const [picking, setPicking] = useState(false);
  const months = schoolYearMonthKeys(year);
  const photos = config.photos;

  // Newest article photo in each month: what a month uses with no photo set
  const articlePhoto = useMemo(() => {
    const map = new Map<string, MediaDoc>();
    for (const e of entries) {
      if (e.kind === 'article' && e.image && !map.has(monthKeyOf(e.date))) map.set(monthKeyOf(e.date), e.image);
    }
    return map;
  }, [entries]);

  const own = target === 'default' ? photos.default : photos.months[target] ?? null;
  const ownMedia = own ? media.get(own.media) ?? null : null;

  // What shows when this slot has no photo of its own
  let fallback: { media: MediaDoc | null; photo: TimelinePhoto | null; note: string } = {
    media: null,
    photo: null,
    note: 'No photo yet: the panel shows plain red',
  };
  if (target !== 'default') {
    if (photos.default) {
      fallback = { media: media.get(photos.default.media) ?? null, photo: photos.default, note: 'Using the default photo' };
    } else if (articlePhoto.get(target)) {
      fallback = { media: articlePhoto.get(target) ?? null, photo: null, note: "Using this month's newest article photo" };
    } else {
      fallback = { media: null, photo: null, note: 'Borrows the photo from the next newer month' };
    }
  } else {
    const firstArticle = entries.find((e) => e.kind === 'article' && e.image);
    if (firstArticle && firstArticle.kind === 'article') {
      fallback = { media: firstArticle.image, photo: null, note: 'No default set: each month uses its newest article photo' };
    }
  }

  const shown = own ? ownMedia : fallback.media;
  const targetLabel = target === 'default' ? 'Default photo' : monthKeyLabel(target, 'long');
  // Month drawn on the previews: the slot's month, or the newest one for the default
  const previewMonth =
    target !== 'default'
      ? monthKeyLabel(target, 'short')
      : entries[0]
        ? monthKeyLabel(monthKeyOf(entries[0].date), 'short')
        : monthKeyLabel(months[0], 'short');

  const setOwn = (next: TimelinePhoto | null, picked?: MediaDoc) => {
    if (target === 'default') {
      onChange({ ...photos, default: next }, picked);
    } else {
      const nextMonths = { ...photos.months };
      if (next) nextMonths[target] = next;
      else delete nextMonths[target];
      onChange({ ...photos, months: nextMonths }, picked);
    }
  };

  return (
    <section className="fle-column tpe-card">
      <div className="fle-column-header">
        <span className="fle-column-title">Panel photo</span>
      </div>
      <p className="tpe-help">
        The photo behind the title on the left of the page. Set a default, and optionally a different photo for any
        month: it swaps in as readers scroll to that month.
      </p>

      <div className="tpe-slot-chips" role="tablist" aria-label="Photo for">
        {(['default', ...months] as PhotoTarget[]).map((key) => {
          const p = key === 'default' ? photos.default : photos.months[key];
          const thumb = p ? mediaThumb(media.get(p.media)) : null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={target === key}
              className={`tpe-chip ${target === key ? 'tpe-chip-active' : ''} ${p ? 'tpe-chip-set' : ''}`}
              onClick={() => setTarget(key)}
            >
              {thumb ? <Thumb src={thumb} alt="" /> : <span className="tpe-chip-dot" aria-hidden="true" />}
              {key === 'default' ? 'Default' : monthKeyLabel(key, 'short')}
            </button>
          );
        })}
      </div>

      <div className="tpe-slot-head">
        <strong>{targetLabel}</strong>
        <span className="tpe-muted">{own ? (ownMedia ? mediaName(ownMedia) : 'Photo') : fallback.note}</span>
      </div>

      <div className="tpe-previews">
        {(['desktop', 'mobile'] as Screen[]).map((screen) => (
          <ScreenFrameEditor
            key={screen}
            screen={screen}
            photo={own}
            shown={shown}
            dimmed={!own}
            title={title}
            month={previewMonth}
            onPhoto={(next) => setOwn(next)}
          />
        ))}
      </div>
      {own && (
        <p className="tpe-help">
          Drag a photo to reposition it, and zoom in to crop tighter. Computer and phone are set separately; the
          phone follows the computer until you change it.
        </p>
      )}

      <div className="tpe-row">
        <button type="button" className="tpe-btn tpe-btn-primary" onClick={() => setPicking(true)}>
          {own ? 'Change photo' : target === 'default' ? 'Choose default photo' : `Choose a photo for ${monthKeyLabel(target, 'short')}`}
        </button>
        {own && (
          <button type="button" className="tpe-btn tpe-btn-danger" onClick={() => setOwn(null)}>
            Remove
          </button>
        )}
      </div>

      {picking && (
        <MediaPicker
          title={`${targetLabel}: choose a photo`}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            // A new photo starts from its own focal point on both screens
            setOwn({ media: m.id, desktop: null, mobile: null }, m);
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Add an update
// ---------------------------------------------------------------------------

function AddUpdate({ body, onCreated }: { body: StudentGovBody; onCreated: (u: UpdateDoc) => void }) {
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !blurb.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/student-gov-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          blurb: blurb.trim(),
          body,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onCreated(data.doc as UpdateDoc);
      setTitle('');
      setBlurb('');
      setDate('');
      setMessage({ ok: true, text: 'Added. It shows on the page within a minute.' });
    } catch {
      setMessage({ ok: false, text: 'Could not add the update. Check your permissions.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fle-column tpe-card">
      <div className="fle-column-header">
        <span className="fle-column-title">Add an update</span>
      </div>
      <p className="tpe-help">
        A short item for the {STUDENT_GOV[body].title} stream that isn&rsquo;t an article. Saves right away.
      </p>
      <form className="tpe-form" onSubmit={submit}>
        <label>
          <span>Title</span>
          <input className="tpe-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          <span>Blurb</span>
          <textarea className="tpe-input" rows={4} value={blurb} onChange={(e) => setBlurb(e.target.value)} required />
        </label>
        <label>
          <span>Date (leave empty for now)</span>
          <input className="tpe-input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="submit" className="tpe-btn tpe-btn-primary" disabled={busy || !title.trim() || !blurb.trim()}>
          {busy ? 'Adding…' : 'Add update'}
        </button>
        {message && <p className={message.ok ? 'tpe-ok' : 'tpe-error'}>{message.text}</p>}
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stream
// ---------------------------------------------------------------------------

function UpdateEditor({
  entry,
  onSaved,
  onCancel,
}: {
  entry: Extract<StreamEntry, { kind: 'update' }>;
  onSaved: (u: UpdateDoc) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [blurb, setBlurb] = useState(entry.blurb);
  const [date, setDate] = useState(toLocalInput(entry.date));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/student-gov-updates/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), blurb: blurb.trim(), date: new Date(date).toISOString() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onSaved(data.doc as UpdateDoc);
    } catch {
      setError('Could not save. Check your permissions.');
      setBusy(false);
    }
  };

  return (
    <div className="tpe-inline-form tpe-inline-form-stack">
      <label>
        <span>Title</span>
        <input className="tpe-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <span>Blurb</span>
        <textarea className="tpe-input" rows={3} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
      </label>
      <label>
        <span>Date</span>
        <input className="tpe-input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="tpe-row">
        <button
          type="button"
          className="tpe-btn tpe-btn-primary"
          disabled={busy || !title.trim() || !blurb.trim() || !date}
          onClick={save}
        >
          {busy ? 'Saving…' : 'Save update'}
        </button>
        <button type="button" className="tpe-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {error && <p className="tpe-error">{error}</p>}
    </div>
  );
}

type EntryLayout = ResolvedEntryLayout & { isLead: boolean };

const sizeLabel = (size: EntrySize) => ENTRY_SIZES.find((s) => s.value === size)?.label ?? size;

/** "Large · photo right · 40% across", for the row badge */
function describeLayout(entry: StreamEntry, layout: EntryLayout): string {
  const parts = [sizeLabel(layout.size)];
  if (entry.kind === 'article' && entry.image) parts.push(layout.image === 'none' ? 'no photo' : `photo ${layout.image}`);
  if (layout.size !== 'full' && !layout.autoPosition) parts.push(`${layout.position}% across`);
  return parts.join(' · ');
}

/** Size, photo placement and position for one entry */
function EntryLayoutEditor({
  entry,
  layout,
  saved,
  onChange,
}: {
  entry: StreamEntry;
  layout: EntryLayout;
  saved: TimelineEntryLayout | undefined;
  onChange: (next: TimelineEntryLayout | null) => void;
}) {
  const set = (patch: Partial<TimelineEntryLayout>) => onChange({ ...(saved ?? {}), ...patch });
  const setAuto = () => {
    const rest: TimelineEntryLayout = { ...(saved ?? {}) };
    delete rest.position;
    onChange(Object.keys(rest).length > 0 ? rest : null);
  };
  const hasImage = entry.kind === 'article' && Boolean(entry.image);
  const fixed = [
    { label: 'Left', value: 0 },
    { label: 'Center', value: 50 },
    { label: 'Right', value: 100 },
  ];

  return (
    <div className="tpe-layout">
      <div className="tpe-layout-row">
        <span className="tpe-layout-label">Size</span>
        <div className="tpe-seg" role="group" aria-label="Size">
          {ENTRY_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={layout.size === s.value}
              className={`tpe-seg-btn ${layout.size === s.value ? 'tpe-seg-active' : ''}`}
              onClick={() => set({ size: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {entry.kind === 'article' && (
        <div className="tpe-layout-row">
          <span className="tpe-layout-label">Photo</span>
          {hasImage ? (
            <div className="tpe-seg" role="group" aria-label="Photo placement">
              {ENTRY_IMAGES.map((img) => (
                <button
                  key={img.value}
                  type="button"
                  aria-pressed={layout.image === img.value}
                  className={`tpe-seg-btn ${layout.image === img.value ? 'tpe-seg-active' : ''}`}
                  onClick={() => set({ image: img.value })}
                >
                  {img.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="tpe-muted">This article has no photo.</span>
          )}
        </div>
      )}

      <div className="tpe-layout-row">
        <span className="tpe-layout-label">Position</span>
        {layout.size === 'full' ? (
          <span className="tpe-muted">Full width fills the column.</span>
        ) : (
          <div className="tpe-position">
            <div className="tpe-seg" role="group" aria-label="Position">
              <button
                type="button"
                aria-pressed={layout.autoPosition}
                className={`tpe-seg-btn ${layout.autoPosition ? 'tpe-seg-active' : ''}`}
                onClick={setAuto}
                title="Follow the zig-zag"
              >
                Auto
              </button>
              {fixed.map((p) => {
                const active = !layout.autoPosition && layout.position === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={active}
                    className={`tpe-seg-btn ${active ? 'tpe-seg-active' : ''}`}
                    onClick={() => set({ position: p.value })}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={layout.position}
              aria-label="Position across the stream, left to right"
              onChange={(e) => set({ position: Number(e.target.value) })}
            />
            <span className="tpe-muted">
              {layout.position}% across{layout.autoPosition ? ' (auto)' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="tpe-row">
        <button type="button" className="tpe-btn" disabled={!layout.custom} onClick={() => onChange(null)}>
          Reset to default
        </button>
      </div>
    </div>
  );
}

function StreamRow({
  entry,
  rowId,
  isLead,
  hidden,
  layout,
  saved,
  layoutOpen,
  onToggleLayout,
  onLayout,
  onToggleHidden,
  onUpdateSaved,
  onDelete,
}: {
  entry: StreamEntry;
  rowId: string;
  isLead: boolean;
  hidden: boolean;
  /** Missing while the entry is hidden */
  layout: EntryLayout | undefined;
  saved: TimelineEntryLayout | undefined;
  layoutOpen: boolean;
  onToggleLayout: () => void;
  onLayout: (next: TimelineEntryLayout | null) => void;
  onToggleHidden: () => void;
  onUpdateSaved: (u: UpdateDoc) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const thumb = entry.kind === 'article' ? mediaThumb(entry.image) : null;

  return (
    <li id={rowId} className={`tpe-entry ${hidden ? 'tpe-entry-hidden' : ''} ${layoutOpen ? 'tpe-entry-open' : ''}`}>
      <div className="tpe-entry-main">
        {thumb ? <Thumb className="tpe-entry-thumb" src={thumb} alt="" /> : <span className="tpe-entry-thumb tpe-entry-thumb-empty" />}
        <div className="tpe-entry-text">
          <div className="tpe-entry-meta">
            <span>{shortDate(entry.date)}</span>
            <span className={entry.kind === 'article' ? 'tpe-kind-article' : 'tpe-kind-update'}>
              {entry.kind === 'article' ? 'Article' : 'Update'}
            </span>
            {isLead && <span className="tpe-badge">Lead</span>}
            {hidden && <span className="tpe-badge tpe-badge-muted">Hidden</span>}
            {layout?.custom && <span className="tpe-badge tpe-badge-layout">{describeLayout(entry, layout)}</span>}
          </div>
          <div className="tpe-entry-title">{entry.title}</div>
          {entry.kind === 'update' && <div className="tpe-entry-sub">{entry.blurb}</div>}
        </div>
        <div className="tpe-entry-actions">
          <button
            type="button"
            className={`tpe-btn ${layoutOpen ? 'tpe-btn-active' : ''}`}
            disabled={!layout}
            title={layout ? undefined : 'Show it to change its layout'}
            onClick={onToggleLayout}
          >
            Layout
          </button>
          <button type="button" className="tpe-btn" onClick={onToggleHidden}>
            {hidden ? 'Show' : 'Hide'}
          </button>
          {entry.kind === 'update' ? (
            <>
              <button
                type="button"
                className={`tpe-btn ${editing ? 'tpe-btn-active' : ''}`}
                onClick={() => setEditing(!editing)}
              >
                Edit
              </button>
              <button type="button" className="tpe-btn tpe-btn-danger" onClick={onDelete}>
                Delete
              </button>
            </>
          ) : (
            <Link className="tpe-btn" href={`/newsroom/collections/articles/${entry.id}`} target="_blank">
              Open article &#8599;
            </Link>
          )}
        </div>
      </div>
      {layoutOpen && layout && <EntryLayoutEditor entry={entry} layout={layout} saved={saved} onChange={onLayout} />}
      {editing && entry.kind === 'update' && (
        <UpdateEditor
          entry={entry}
          onCancel={() => setEditing(false)}
          onSaved={(u) => {
            onUpdateSaved(u);
            setEditing(false);
          }}
        />
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Stream preview
// ---------------------------------------------------------------------------

// The page's stream column is 800px wide at most; the preview draws it smaller
const STREAM_WIDTH = 800;
const PREVIEW_SCALE = 0.42;
// Rough heights (px on the page) of a card's text, to size the preview blocks
const ARTICLE_TEXT_HEIGHT: Record<EntrySize, number> = { small: 150, medium: 175, large: 205, full: 235 };
const UPDATE_HEIGHT: Record<EntrySize, number> = { small: 115, medium: 130, large: 155, full: 165 };

function previewHeight(entry: StreamEntry, layout: EntryLayout): number {
  if (entry.kind === 'update') return UPDATE_HEIGHT[layout.size];
  if (layout.image === 'top') return IMAGE_TOP_HEIGHTS[layout.size] + ARTICLE_TEXT_HEIGHT[layout.size];
  if (layout.image === 'none') return ARTICLE_TEXT_HEIGHT[layout.size];
  return Math.max(IMAGE_SIDE_WIDTHS[layout.size], ARTICLE_TEXT_HEIGHT[layout.size]);
}

/**
 * Wireframe of the stream as it lays out on desktop: each block is an entry
 * at its size and position, with its photo where it sits. Click one to edit it.
 */
function StreamPreview({
  months,
  layouts,
  selected,
  onSelect,
}: {
  months: { key: string; items: StreamEntry[] }[];
  layouts: Map<string, EntryLayout>;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const s = PREVIEW_SCALE;
  return (
    <section className="fle-column tpe-card">
      <div className="fle-column-header">
        <span className="fle-column-title">Stream preview</span>
      </div>
      <p className="tpe-help">How the stream lays out on a computer screen. Click a card to change its layout.</p>
      <div className="tpe-wire-scroll">
        <div className="tpe-wire" style={{ width: STREAM_WIDTH * s }}>
          {months.map((month) => {
            const visible = month.items.filter((e) => layouts.has(entryKey(e.kind, e.id)));
            if (visible.length === 0) return null;
            return (
              <div key={month.key} className="tpe-wire-month">
                <div className="tpe-wire-label">{monthKeyLabel(month.key, 'long')}</div>
                {visible.map((entry) => {
                  const key = entryKey(entry.kind, entry.id);
                  const layout = layouts.get(key) as EntryLayout;
                  const width = Math.min(layout.width ?? STREAM_WIDTH, STREAM_WIDTH);
                  const left = ((STREAM_WIDTH - width) * layout.position) / 100;
                  const img = entry.kind === 'article' && layout.image !== 'none' ? mediaThumb(entry.image) : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={entry.title}
                      onClick={() => onSelect(key)}
                      className={`tpe-wire-card tpe-wire-${entry.kind} tpe-wire-img-${layout.image} ${
                        selected === key ? 'tpe-wire-selected' : ''
                      }`}
                      style={{ width: width * s, height: previewHeight(entry, layout) * s, marginLeft: left * s }}
                    >
                      {img && (
                        <span
                          className="tpe-wire-photo"
                          style={
                            layout.image === 'top'
                              ? { height: IMAGE_TOP_HEIGHTS[layout.size] * s }
                              : { width: IMAGE_SIDE_WIDTHS[layout.size] * s }
                          }
                        >
                          <Thumb src={img} alt="" />
                        </span>
                      )}
                      <span className="tpe-wire-text">{entry.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

/**
 * Dashboard editor for /news/senate or /news/executive-board: the left
 * panel's photos, new updates, and the stream (each entry's size, photo
 * placement and position; hide entries; edit or delete updates). Photos,
 * hidden entries and layouts are saved with "Activate" into `news-page-layout` → `timelinePages[body]`;
 * updates are their own documents and save as soon as they're changed.
 */
export function TimelinePageEditor({ body }: { body: StudentGovBody }) {
  const meta = STUDENT_GOV[body];
  const pathname = usePathname();
  const [config, setConfig] = useState<TimelinePageConfig>(EMPTY_TIMELINE_PAGE);
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [media, setMedia] = useState<Map<number, MediaDoc>>(new Map());
  const [year, setYear] = useState<number>(() => schoolYearOf(new Date()));
  const [currentYear] = useState<number>(() => schoolYearOf(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const docIdRef = useRef<string | null>(null);
  const { setStepNav } = useStepNav();

  // Breadcrumb: News Layout / Student Senate page
  useEffect(() => {
    setStepNav([
      { label: 'News Layout', url: '/newsroom/collections/news-page-layout' },
      { label: `${meta.title} page` },
    ]);
  }, [setStepNav, meta.title]);

  // ---- Load ----
  useEffect(() => {
    (async () => {
      try {
        const kicker = encodeURIComponent(meta.kicker);
        const [articleData, updateData] = await Promise.all([
          fetch(
            `/api/articles?where[section][equals]=news&where[kicker][equals]=${kicker}&where[_status][equals]=published` +
              '&sort=-publishedDate&limit=1000&depth=1&select[plainTitle]=true&select[subdeck]=true' +
              '&select[publishedDate]=true&select[createdAt]=true&select[featuredImage]=true',
          ).then((r) => r.json()),
          fetch(`/api/student-gov-updates?where[body][equals]=${body}&sort=-date&limit=1000&depth=0`).then((r) => r.json()),
        ]);
        const list: StreamEntry[] = [
          ...((articleData.docs || []) as ArticleDoc[]).map(
            (a): StreamEntry => ({
              kind: 'article',
              id: a.id,
              date: a.publishedDate || a.createdAt,
              title: a.plainTitle || 'Untitled',
              subdeck: a.subdeck ?? null,
              image: a.featuredImage && typeof a.featuredImage === 'object' ? a.featuredImage : null,
            }),
          ),
          ...((updateData.docs || []) as UpdateDoc[]).map(
            (u): StreamEntry => ({ kind: 'update', id: u.id, date: u.date, title: u.title, blurb: u.blurb }),
          ),
        ];
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(list);

        let id = extractDocId();
        let doc: { id: number; layout?: unknown } | null = null;
        if (id) {
          const res = await fetch(`/api/news-page-layout/${id}?depth=0`);
          if (res.ok) doc = await res.json();
          else id = null;
        }
        if (!id) {
          const listData = await fetch('/api/news-page-layout?limit=1&depth=0').then((r) => r.json());
          doc = listData.docs?.[0] ?? null;
          if (!doc) {
            const res = await fetch('/api/news-page-layout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'News Layout' }),
            });
            if (!res.ok) throw new Error('create failed');
            doc = (await res.json()).doc;
          }
          id = doc ? String(doc.id) : null;
        }
        docIdRef.current = id;

        const layout = (doc?.layout ?? {}) as { timelinePages?: unknown };
        const page = normalizeTimelinePages(layout.timelinePages)[body];
        setConfig(page);

        const mediaIds = [page.photos.default, ...Object.values(page.photos.months)]
          .filter((p): p is TimelinePhoto => p !== null)
          .map((p) => p.media);
        if (mediaIds.length > 0) {
          const mediaData = await fetch(`/api/media?where[id][in]=${[...new Set(mediaIds)].join(',')}&limit=50&depth=0`).then(
            (r) => r.json(),
          );
          setMedia(new Map(((mediaData.docs || []) as MediaDoc[]).map((m) => [m.id, m])));
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load. Refresh to try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [body, meta.kicker]);

  // ---- Mutations ----
  const update = useCallback((fn: (prev: TimelinePageConfig) => TimelinePageConfig) => {
    setConfig(fn);
    setSaved(false);
  }, []);

  const toggleHidden = (key: string) =>
    update((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(key) ? prev.hidden.filter((h) => h !== key) : [...prev.hidden, key],
    }));

  const setEntryLayout = (key: string, next: TimelineEntryLayout | null) =>
    update((prev) => {
      const layouts = { ...prev.entries };
      if (next && Object.keys(next).length > 0) layouts[key] = next;
      else delete layouts[key];
      return { ...prev, entries: layouts };
    });

  // Entry whose layout controls are open (also highlighted in the preview)
  const [layoutOpen, setLayoutOpen] = useState<string | null>(null);
  const rowId = (key: string) => `tpe-row-${key}`;
  const selectFromPreview = (key: string) => {
    setLayoutOpen(key);
    document.getElementById(rowId(key))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const upsertUpdate = (u: UpdateDoc) =>
    setEntries((prev) =>
      [
        ...prev.filter((e) => !(e.kind === 'update' && e.id === u.id)),
        { kind: 'update' as const, id: u.id, date: u.date, title: u.title, blurb: u.blurb },
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    );

  const deleteUpdate = async (id: number) => {
    if (!window.confirm('Delete this update? This cannot be undone.')) return;
    const res = await fetch(`/api/student-gov-updates/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Could not delete the update. Only admins and the EIC can delete updates.');
      return;
    }
    setEntries((prev) => prev.filter((e) => !(e.kind === 'update' && e.id === id)));
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!docIdRef.current) return;
    setSaving(true);
    setError(null);
    try {
      // Merge into the latest copy: the News Layout editor shares this JSON
      const latest = await fetch(`/api/news-page-layout/${docIdRef.current}?depth=0`).then((r) => r.json());
      const prevLayout = (latest?.layout ?? {}) as Record<string, unknown>;
      const pages = normalizeTimelinePages(prevLayout.timelinePages);
      const layout = { ...prevLayout, timelinePages: { ...pages, [body]: config } };
      const res = await fetch(`/api/news-page-layout/${docIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Warn before leaving with unsaved photo/stream changes
  useEffect(() => {
    if (saved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saved]);

  // ---- Derived ----
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const e of entries) set.add(schoolYearOf(e.date));
    return [...set].sort((a, b) => b - a);
  }, [entries, currentYear]);

  const yearEntries = useMemo(() => entries.filter((e) => schoolYearOf(e.date) === year), [entries, year]);
  const hidden = useMemo(() => new Set(config.hidden), [config.hidden]);
  // Same layout the page uses: visible entries only, newest article as lead
  const layouts = useMemo(
    () =>
      resolveStream(
        yearEntries
          .filter((e) => !hidden.has(entryKey(e.kind, e.id)))
          .map((e) => ({ kind: e.kind, id: e.id, hasImage: e.kind === 'article' && Boolean(e.image) })),
        config.entries,
      ),
    [yearEntries, hidden, config.entries],
  );

  const byMonth = useMemo(() => {
    const groups: { key: string; items: StreamEntry[] }[] = [];
    for (const e of yearEntries) {
      const key = monthKeyOf(e.date);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(e);
      else groups.push({ key, items: [e] });
    }
    return groups;
  }, [yearEntries]);

  if (loading) {
    return (
      <div className="fle-loading">
        <div className="fle-loading-spinner" />
        <span>Loading {meta.title} page…</span>
      </div>
    );
  }

  const visibleCount = yearEntries.filter((e) => !hidden.has(entryKey(e.kind, e.id))).length;

  return (
    <div className="fle-root">
      <div className="fle-toolbar">
        <div className="fle-toolbar-left">
          <h2 className="fle-toolbar-title">{meta.title} Page</h2>
          <nav className="tpe-tabs" aria-label="News layout pages">
            <Link href={pathname} className="tpe-tab">
              News page
            </Link>
            <Link href={`${pathname}?page=senate`} className={`tpe-tab ${body === 'senate' ? 'tpe-tab-active' : ''}`}>
              Senate
            </Link>
            <Link
              href={`${pathname}?page=executive-board`}
              className={`tpe-tab ${body === 'eboard' ? 'tpe-tab-active' : ''}`}
            >
              Executive Board
            </Link>
          </nav>
        </div>
        <div className="fle-toolbar-right">
          {error && <span className="fle-toolbar-error">{error}</span>}
          <a className="tpe-btn" href={meta.href} target="_blank" rel="noreferrer">
            View page &#8599;
          </a>
          <button
            className={`fle-save-btn ${saved ? 'fle-save-btn-saved' : 'fle-save-btn-unsaved'}`}
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="tpe-body">
        <section className="fle-column tpe-card tpe-stream">
          <div className="fle-column-header">
            <span className="fle-column-title">Stream</span>
            <label className="tpe-year">
              <span>School year</span>
              <select className="tpe-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {schoolYearLabel(y)}
                    {y === currentYear ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="tpe-help">
            Everything on the page for {schoolYearLabel(year)} (August 1 to July 31), newest first: {visibleCount} shown
            {visibleCount !== yearEntries.length ? `, ${yearEntries.length - visibleCount} hidden` : ''}. Articles join
            the stream when they&rsquo;re published with the &ldquo;{meta.kicker}&rdquo; kicker. Use{' '}
            <strong>Layout</strong> to set any entry&rsquo;s size, photo placement and position; anything left alone
            follows the default (newest article full width, the rest zig-zagging). Hidden entries also drop out of
            the /news box.
          </p>
          {byMonth.length === 0 ? (
            <p className="tpe-muted">Nothing in {schoolYearLabel(year)} yet.</p>
          ) : (
            byMonth.map((group) => (
              <div key={group.key} className="tpe-month">
                <h3 className="tpe-month-title">
                  {monthKeyLabel(group.key, 'long')}
                  {config.photos.months[group.key] && <span className="tpe-badge">Own photo</span>}
                </h3>
                <ol className="tpe-entries">
                  {group.items.map((entry) => {
                    const key = entryKey(entry.kind, entry.id);
                    const layout = layouts.get(key);
                    return (
                      <StreamRow
                        key={key}
                        rowId={rowId(key)}
                        entry={entry}
                        isLead={Boolean(layout?.isLead)}
                        hidden={hidden.has(key)}
                        layout={layout}
                        saved={config.entries[key]}
                        layoutOpen={layoutOpen === key && Boolean(layout)}
                        onToggleLayout={() => setLayoutOpen(layoutOpen === key ? null : key)}
                        onLayout={(next) => setEntryLayout(key, next)}
                        onToggleHidden={() => toggleHidden(key)}
                        onUpdateSaved={upsertUpdate}
                        onDelete={() => deleteUpdate(entry.id)}
                      />
                    );
                  })}
                </ol>
              </div>
            ))
          )}
        </section>

        <div className="tpe-side">
          <StreamPreview months={byMonth} layouts={layouts} selected={layoutOpen} onSelect={selectFromPreview} />
          <PhotoPanel
            title={meta.title}
            config={config}
            year={year}
            media={media}
            entries={yearEntries}
            onChange={(photos, picked) => {
              if (picked) setMedia((prev) => new Map(prev).set(picked.id, picked));
              update((prev) => ({ ...prev, photos }));
            }}
          />
          <AddUpdate body={body} onCreated={upsertUpdate} />
        </div>
      </div>
    </div>
  );
}
