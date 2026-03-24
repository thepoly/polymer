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
import './features-layout-editor.css';

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

type EventEntry = {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
};

type SpotlightPhoto = {
  url: string;
  caption?: string;
  articleTitle?: string;
};

type FeaturesLayout = {
  onCampus: (number | null)[];
  onCampusImages: boolean[];
  featured: (number | null)[];
  rightArticles: (number | null)[];
  rightImages: boolean[];
  events: EventEntry[];
  // Row 2
  theArts: (number | null)[];
  theArtsImages: boolean[];
  photoSpotlight: SpotlightPhoto[];
  spotlightSubs: (number | null)[];
  collarCity: (number | null)[];
  collarCityImages: boolean[];
  wideArticle: (number | null)[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const EMPTY_LAYOUT: FeaturesLayout = {
  onCampus: [null, null, null],
  onCampusImages: [false, false, false],
  featured: [null, null, null],
  rightArticles: [null, null, null],
  rightImages: [false, false, false],
  events: [],
  theArts: [null, null, null],
  theArtsImages: [false, false, false],
  photoSpotlight: [],
  spotlightSubs: [null, null],
  collarCity: [null, null, null],
  collarCityImages: [false, false, false],
  wideArticle: [null],
};

const ON_CAMPUS_LABELS = [
  'Article 1',
  'Article 2',
  'Article 3',
];
const FEATURED_LABELS = [
  'Hero (large image)',
  'Sub-feature Left (with image)',
  'Sub-feature Right (with image)',
];
const RIGHT_LABELS = [
  'Article 1',
  'Article 2',
  'Article 3',
];
const THE_ARTS_LABELS = ['Article 1', 'Article 2', 'Article 3'];
const COLLAR_CITY_LABELS = ['Article 1', 'Article 2', 'Article 3'];

// Slot ID format: "oc-0", "feat-1", "right-2", "arts-0", "collar-1"
type ColumnKey = 'onCampus' | 'featured' | 'rightArticles' | 'theArts' | 'spotlightSubs' | 'collarCity' | 'wideArticle';

const parseSlotId = (slotId: string): { column: ColumnKey; index: number } | null => {
  const [prefix, idxStr] = slotId.split('-');
  const index = Number(idxStr);
  if (prefix === 'oc') return { column: 'onCampus', index };
  if (prefix === 'feat') return { column: 'featured', index };
  if (prefix === 'right') return { column: 'rightArticles', index };
  if (prefix === 'arts') return { column: 'theArts', index };
  if (prefix === 'spotsub') return { column: 'spotlightSubs', index };
  if (prefix === 'collar') return { column: 'collarCity', index };
  if (prefix === 'wide') return { column: 'wideArticle', index };
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
  const idx = parts.indexOf('features-page-layout');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'create') return parts[idx + 1];
  return null;
};

const collectUsedIds = (layout: FeaturesLayout): Set<number> => {
  const ids = new Set<number>();
  for (const col of [layout.onCampus, layout.featured, layout.rightArticles, layout.theArts, layout.spotlightSubs, layout.collarCity, layout.wideArticle]) {
    for (const id of col) {
      if (id !== null) ids.add(id);
    }
  }
  return ids;
};

// Extract all images from a fully-fetched article (depth=2)
const extractImagesFromArticle = (articleData: Record<string, unknown>): { url: string; alt?: string }[] => {
  const images: { url: string; alt?: string }[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined, alt?: string) => {
    if (url && !seen.has(url)) { seen.add(url); images.push({ url, alt: alt || '' }); }
  };
  // Featured image
  const fi = articleData.featuredImage;
  if (fi && typeof fi === 'object' && 'url' in (fi as Record<string, unknown>)) {
    add((fi as Record<string, string>).url, (fi as Record<string, string>).alt);
  }
  // Traverse Lexical content tree
  const traverse = (node: Record<string, unknown>) => {
    if (!node) return;
    if (node.type === 'upload' && node.value && typeof node.value === 'object') {
      const v = node.value as Record<string, string>;
      add(v.url, v.alt);
    }
    if (node.type === 'block' && node.fields && typeof node.fields === 'object') {
      const fields = node.fields as Record<string, unknown>;
      if ((fields.blockType === 'photo_gallery' || fields.blockType === 'carousel') && Array.isArray(fields.images)) {
        for (const img of fields.images as Array<Record<string, unknown>>) {
          const media = img.image;
          if (media && typeof media === 'object') add((media as Record<string, string>).url, (media as Record<string, string>).alt);
        }
      }
    }
    if (Array.isArray(node.children)) (node.children as Record<string, unknown>[]).forEach(traverse);
    if (node.root && typeof node.root === 'object') traverse(node.root as Record<string, unknown>);
  };
  if (articleData.content && typeof articleData.content === 'object') traverse(articleData.content as Record<string, unknown>);
  return images;
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
        <div className="fle-slot-title">{article.title}</div>
        {author && <div className="fle-slot-author">{author}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Slot
// ---------------------------------------------------------------------------

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
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${slotId}`,
    data: { slotId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`fle-slot ${isOver ? 'fle-slot-over' : ''} ${article ? 'fle-slot-filled' : ''}`}
    >
      <div className="fle-slot-header">
        <span className="fle-slot-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {imageToggle}
          {article && (
            <button className="fle-slot-clear" onClick={onClear} title="Remove article">&times;</button>
          )}
        </div>
      </div>
      {article ? (
        <DraggableSlotArticle article={article} slotId={slotId} showImage={showImage} />
      ) : (
        <div className="fle-slot-empty">
          <div className="fle-slot-empty-inner">
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
        <div className="fle-pool-card-title">{article.title}</div>
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
        <div className="fle-drag-overlay-title">{article.title}</div>
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
      return a.title.toLowerCase().includes(q) || getAuthorString(a).toLowerCase().includes(q);
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
      <div style={{ padding: '14px 14px 0', fontSize: '0.78rem', fontWeight: 700 }}>Features Articles</div>
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
// Photo Spotlight Browser
// ---------------------------------------------------------------------------

type SpotlightArticleResult = {
  id: number;
  title: string;
  section: string;
  slug: string;
  publishedDate: string | null;
  featuredImage?: { url?: string | null; alt?: string | null } | number | null;
  authors?: Array<number | { firstName: string; lastName: string }>;
  writeInAuthors?: Array<{ name: string }>;
};

function SpotlightBrowser({
  photos, onAdd, onRemove,
}: {
  photos: SpotlightPhoto[];
  onAdd: (photo: SpotlightPhoto) => void;
  onRemove: (index: number) => void;
}) {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SpotlightArticleResult[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [imageCache, setImageCache] = useState<Map<number, { url: string; alt?: string }[]>>(new Map());
  const [loadingImages, setLoadingImages] = useState<number | null>(null);
  const [spotSearch, setSpotSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set of URLs already in the spotlight
  const usedUrls = new Set(photos.map((p) => p.url));

  const searchArticles = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&pageSize=10`);
      const data = await res.json();
      const articles: SpotlightArticleResult[] = (data.articles || [])
        .filter((a: { section?: string }) => ['features', 'opinion', 'news'].includes(a.section || ''))
        .slice(0, 10)
        .map((a: { id: string | number; title: string; section: string; slug: string; publishedDate?: string; image?: string | null }) => ({
          id: typeof a.id === 'string' ? parseInt(a.id, 10) : a.id,
          title: a.title,
          section: a.section || '',
          slug: a.slug || '',
          publishedDate: a.publishedDate || null,
          featuredImage: a.image ? { url: a.image } : null,
        }));
      setSearchResults(articles);
    } catch (err) { console.error('Search failed', err); }
    finally { setSearching(false); }
  }, []);

  const handleSearchChange = (value: string) => {
    setSpotSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => searchArticles(value), 300);
  };

  const loadImages = async (articleId: number) => {
    if (imageCache.has(articleId)) return;
    setLoadingImages(articleId);
    try {
      const res = await fetch(`/api/articles/${articleId}?depth=2`);
      const data = await res.json();
      const imgs = extractImagesFromArticle(data);
      setImageCache((prev) => new Map(prev).set(articleId, imgs));
    } catch (err) { console.error('Failed to load article images', err); }
    finally { setLoadingImages(null); }
  };

  const handleArticleClick = (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadImages(id);
  };

  const handleToggle = () => {
    setBrowserOpen(!browserOpen);
  };

  // Filter out articles whose every image is already in the spotlight
  const displayArticles = searchResults.filter((article) => {
    const imgs = imageCache.get(article.id);
    if (!imgs) return true; // not loaded yet, keep visible
    if (imgs.length === 0) return true; // no images, keep visible (they'll see "no images")
    return imgs.some((img) => !usedUrls.has(img.url));
  });

  return (
    <div className="fle-spotlight-section">
      <div className="fle-spotlight-header">Photo Spotlight</div>

      {/* Selected photos — compact list */}
      {photos.length > 0 && (
        <div className="fle-spotlight-selected-list">
          {photos.map((photo, i) => (
            <div key={i} className="fle-spotlight-item">
              <span className="fle-spotlight-item-number">{i + 1}</span>
              <div className="fle-spotlight-item-thumb">
                <img src={photo.url} alt={photo.caption || ''} />
              </div>
              <div className="fle-spotlight-item-info">
                {photo.articleTitle && (
                  <div className="fle-spotlight-item-title">{photo.articleTitle}</div>
                )}
                {photo.caption && (
                  <div className="fle-spotlight-item-caption">{photo.caption}</div>
                )}
                {!photo.articleTitle && !photo.caption && (
                  <div className="fle-spotlight-item-caption">No caption</div>
                )}
              </div>
              <button className="fle-spotlight-item-remove" onClick={() => onRemove(i)} title="Remove photo">&times;</button>
            </div>
          ))}
        </div>
      )}

      <button className="fle-event-add-btn" onClick={handleToggle}>
        {browserOpen ? 'Close Browser' : '+ Add Photo'}
      </button>

      {browserOpen && (
        <div className="fle-spotlight-browser">
          <input
            type="search"
            placeholder="Search articles"
            value={spotSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="fle-spotlight-search-input"
          />
          {searching && <div className="fle-spotlight-search-spinner-wrap"><div className="fle-spotlight-search-spinner" /></div>}

          <div className="fle-spotlight-articles">
            {spotSearch.trim() && !searching && displayArticles.length === 0 && (
              <div className="fle-spotlight-empty">No articles found</div>
            )}
            {displayArticles.map((article) => {
              const isExpanded = expandedId === article.id;
              const imgs = imageCache.get(article.id);
              const isLoading = loadingImages === article.id;
              return (
                <div key={article.id} className={`fle-spotlight-article ${isExpanded ? 'fle-spotlight-article-expanded' : ''}`}>
                  <div className="fle-spotlight-article-header" onClick={() => handleArticleClick(article.id)}>
                    <span className="fle-spotlight-article-title">{article.title}</span>
                    <button className={`fle-spotlight-expand-btn ${isExpanded ? 'fle-spotlight-expand-btn-open' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="fle-spotlight-article-images">
                      {isLoading ? (
                        <div className="fle-spotlight-loading">
                          <div className="fle-spotlight-loading-spinner" />
                          <span>Loading images...</span>
                        </div>
                      ) : imgs && imgs.length > 0 ? (
                        imgs.map((img, idx) => {
                          const isUsed = usedUrls.has(img.url);
                          return (
                            <div
                              key={idx}
                              className={`fle-spotlight-image-pick ${isUsed ? 'fle-spotlight-image-used' : ''}`}
                              onClick={() => { if (!isUsed) onAdd({ url: img.url, caption: img.alt, articleTitle: article.title }); }}
                            >
                              <img src={img.url} alt={img.alt || ''} />
                              {isUsed ? (
                                <div className="fle-spotlight-used-overlay">Already in spotlight</div>
                              ) : (
                                <div className="fle-spotlight-add-badge">+ Add</div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="fle-spotlight-no-images">No images found in this article</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function FeaturesLayoutEditor() {
  const [layout, setLayout] = useState<FeaturesLayout>({ ...EMPTY_LAYOUT });
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
          '/api/articles?where[section][equals]=features&where[_status][equals]=published&sort=-publishedDate&limit=100&depth=1' +
          '&select[title]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
          '&select[createdAt]=true&select[featuredImage]=true&select[subdeck]=true&select[kicker]=true' +
          '&select[authors]=true&select[writeInAuthors]=true',
        );
        const artData = await artRes.json();
        setArticles(artData.docs || []);

        let id = extractDocId();
        let layoutData: Record<string, unknown> | null = null;

        if (id) {
          const layoutRes = await fetch(`/api/features-page-layout/${id}?depth=0`);
          if (layoutRes.ok) { layoutData = await layoutRes.json(); } else { id = null; }
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

        if (layoutData) {
          const savedLayout = layoutData.layout as FeaturesLayout | undefined;
          if (savedLayout && typeof savedLayout === 'object') {
            setLayout({
              onCampus: padArray(savedLayout.onCampus, 3),
              onCampusImages: savedLayout.onCampusImages && savedLayout.onCampusImages.length >= 3
                ? savedLayout.onCampusImages.slice(0, 3)
                : [false, false, false],
              featured: padArray(savedLayout.featured, 3),
              rightArticles: padArray(savedLayout.rightArticles, 3),
              rightImages: savedLayout.rightImages && savedLayout.rightImages.length >= 3
                ? savedLayout.rightImages.slice(0, 3)
                : [false, false, false],
              events: savedLayout.events || [],
              theArts: padArray(savedLayout.theArts, 3),
              theArtsImages: savedLayout.theArtsImages && savedLayout.theArtsImages.length >= 3
                ? savedLayout.theArtsImages.slice(0, 3)
                : [false, false, false],
              photoSpotlight: savedLayout.photoSpotlight || [],
              spotlightSubs: padArray(savedLayout.spotlightSubs, 2),
              collarCity: padArray(savedLayout.collarCity, 3),
              collarCityImages: savedLayout.collarCityImages && savedLayout.collarCityImages.length >= 3
                ? savedLayout.collarCityImages.slice(0, 3)
                : [false, false, false],
              wideArticle: padArray(savedLayout.wideArticle, 1),
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

  const toggleOnCampusImage = useCallback((index: number) => {
    setLayout((prev) => {
      const imgs = [...prev.onCampusImages];
      const currentImageCount = imgs.filter(Boolean).length;
      if (!imgs[index] && currentImageCount >= 3) return prev;
      imgs[index] = !imgs[index];
      return { ...prev, onCampusImages: imgs };
    });
    markDirty();
  }, [markDirty]);

  const toggleRightImage = useCallback((index: number) => {
    setLayout((prev) => {
      const imgs = [...prev.rightImages];
      const currentImageCount = imgs.filter(Boolean).length;
      if (!imgs[index] && currentImageCount >= 2) return prev;
      imgs[index] = !imgs[index];
      return { ...prev, rightImages: imgs };
    });
    markDirty();
  }, [markDirty]);

  const toggleArtsImage = useCallback((index: number) => {
    setLayout((prev) => {
      const imgs = [...prev.theArtsImages];
      const currentImageCount = imgs.filter(Boolean).length;
      if (!imgs[index] && currentImageCount >= 2) return prev;
      imgs[index] = !imgs[index];
      return { ...prev, theArtsImages: imgs };
    });
    markDirty();
  }, [markDirty]);

  const toggleCollarCityImage = useCallback((index: number) => {
    setLayout((prev) => {
      const imgs = [...prev.collarCityImages];
      const currentImageCount = imgs.filter(Boolean).length;
      if (!imgs[index] && currentImageCount >= 2) return prev;
      imgs[index] = !imgs[index];
      return { ...prev, collarCityImages: imgs };
    });
    markDirty();
  }, [markDirty]);

  const addSpotlightPhoto = useCallback((photo: SpotlightPhoto) => {
    setLayout((prev) => ({ ...prev, photoSpotlight: [...prev.photoSpotlight, photo] }));
    markDirty();
  }, [markDirty]);

  const removeSpotlightPhoto = useCallback((index: number) => {
    setLayout((prev) => {
      const photos = [...prev.photoSpotlight];
      photos.splice(index, 1);
      return { ...prev, photoSpotlight: photos };
    });
    markDirty();
  }, [markDirty]);

  // ---- Events ----
  const addEvent = useCallback(() => {
    setLayout((prev) => {
      if (prev.events.length >= 5) return prev;
      return {
        ...prev,
        events: [...prev.events, { title: '', date: '', time: '', location: '', url: '' }],
      };
    });
    markDirty();
  }, [markDirty]);

  const updateEvent = useCallback((index: number, patch: Partial<EventEntry>) => {
    setLayout((prev) => {
      const events = [...prev.events];
      events[index] = { ...events[index], ...patch };
      return { ...prev, events };
    });
    markDirty();
  }, [markDirty]);

  const removeEvent = useCallback((index: number) => {
    setLayout((prev) => {
      const events = [...prev.events];
      events.splice(index, 1);
      return { ...prev, events };
    });
    markDirty();
  }, [markDirty]);

  const moveEvent = useCallback((index: number, dir: -1 | 1) => {
    setLayout((prev) => {
      const events = [...prev.events];
      const swap = index + dir;
      if (swap < 0 || swap >= events.length) return prev;
      [events[index], events[swap]] = [events[swap], events[index]];
      return { ...prev, events };
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

  const getArticle = (column: ColumnKey, index: number): ArticleData | null => {
    const id = layout[column][index];
    return id ? articleMap.get(id) || null : null;
  };

  const imageCount = layout.onCampusImages.filter(Boolean).length;
  const rightImageCount = layout.rightImages.filter(Boolean).length;
  const artsImageCount = layout.theArtsImages.filter(Boolean).length;
  const collarImageCount = layout.collarCityImages.filter(Boolean).length;

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
          <div className="fle-toolbar-left">
            <h2 className="fle-toolbar-title">Features Page Layout</h2>
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
          {/* Left: canvas */}
          <div className="fle-canvas-wrap">
            <div className="fle-canvas">
              {/* On-Campus column (thin left) */}
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">On-Campus</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.35 }}>{imageCount}/3 imgs</span>
                </div>
                {ON_CAMPUS_LABELS.map((label, i) => (
                  <DropSlot
                    key={`oc-${i}`}
                    slotId={`oc-${i}`}
                    label={label}
                    article={getArticle('onCampus', i)}
                    showImage={layout.onCampusImages[i]}
                    onClear={() => clearSlot(`oc-${i}`)}
                    isImageSlot={layout.onCampusImages[i]}
                    imageToggle={
                      imageCount >= 3 && !layout.onCampusImages[i] ? (
                        <span style={{ fontSize: '0.62rem', opacity: 0.2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          locked
                        </span>
                      ) : (
                        <label className="fle-image-toggle" title="Toggle image">
                          <input
                            type="checkbox"
                            checked={layout.onCampusImages[i]}
                            onChange={() => toggleOnCampusImage(i)}
                          />
                          img
                        </label>
                      )
                    }
                  />
                ))}
              </div>

              {/* Featured column (big middle) */}
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Featured</span>
                </div>
                {FEATURED_LABELS.map((label, i) => (
                  <DropSlot
                    key={`feat-${i}`}
                    slotId={`feat-${i}`}
                    label={label}
                    article={getArticle('featured', i)}
                    showImage
                    onClear={() => clearSlot(`feat-${i}`)}
                    isImageSlot
                  />
                ))}
                <DropSlot
                  slotId="wide-0"
                  label="Wide Article (text + image)"
                  article={getArticle('wideArticle', 0)}
                  showImage
                  onClear={() => clearSlot('wide-0')}
                  isImageSlot
                />
              </div>

              {/* Right column */}
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Right Column</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.35 }}>{rightImageCount}/2 imgs</span>
                </div>

                {/* Events section */}
                <div className="fle-events-section">
                  <div className="fle-events-header">Upcoming Events ({layout.events.length}/5)</div>
                  {layout.events.map((event, i) => (
                      <div key={i} className="fle-event-entry">
                        <input
                          type="text"
                          placeholder="Event title"
                          value={event.title}
                          onChange={(e) => updateEvent(i, { title: e.target.value })}
                        />
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateEvent(i, { date: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="00:00 AM/PM"
                          value={event.time}
                          onChange={(e) => updateEvent(i, { time: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Location (optional)"
                          value={event.location}
                          onChange={(e) => updateEvent(i, { location: e.target.value })}
                        />
                        <div className="fle-event-entry-row">
                          <input
                            type="url"
                            placeholder="URL (optional)"
                            value={event.url || ''}
                            onChange={(e) => updateEvent(i, { url: e.target.value })}
                          />
                          <div className="fle-event-actions">
                            <button className="fle-event-btn" onClick={() => moveEvent(i, -1)} disabled={i === 0} title="Move up">&#8593;</button>
                            <button className="fle-event-btn" onClick={() => moveEvent(i, 1)} disabled={i === layout.events.length - 1} title="Move down">&#8595;</button>
                            <button className="fle-event-btn fle-event-remove" onClick={() => removeEvent(i)} title="Remove">&times;</button>
                          </div>
                        </div>
                      </div>
                  ))}
                  {layout.events.length < 5 && (
                    <button className="fle-event-add-btn" onClick={addEvent}>
                      + Add Event
                    </button>
                  )}
                </div>

                {/* Article slots */}
                {RIGHT_LABELS.map((label, i) => (
                  <DropSlot
                    key={`right-${i}`}
                    slotId={`right-${i}`}
                    label={label}
                    article={getArticle('rightArticles', i)}
                    showImage={layout.rightImages[i]}
                    onClear={() => clearSlot(`right-${i}`)}
                    isImageSlot={layout.rightImages[i]}
                    imageToggle={
                      rightImageCount >= 2 && !layout.rightImages[i] ? (
                        <span style={{ fontSize: '0.62rem', opacity: 0.2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          locked
                        </span>
                      ) : (
                        <label className="fle-image-toggle" title="Toggle image">
                          <input
                            type="checkbox"
                            checked={layout.rightImages[i]}
                            onChange={() => toggleRightImage(i)}
                          />
                          img
                        </label>
                      )
                    }
                  />
                ))}
              </div>
            </div>

            {/* ── Row Divider ── */}
            <div style={{ borderTop: '2px solid var(--theme-elevation-200, #333)', margin: '20px 0 16px' }} />

            {/* ── Row 2 Canvas ── */}
            <div className="fle-canvas">
              {/* The Arts column (thin left) */}
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">The Arts</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.35 }}>{artsImageCount}/2 imgs</span>
                </div>
                {THE_ARTS_LABELS.map((label, i) => (
                  <DropSlot
                    key={`arts-${i}`}
                    slotId={`arts-${i}`}
                    label={label}
                    article={getArticle('theArts', i)}
                    showImage={layout.theArtsImages[i]}
                    onClear={() => clearSlot(`arts-${i}`)}
                    isImageSlot={layout.theArtsImages[i]}
                    imageToggle={
                      artsImageCount >= 2 && !layout.theArtsImages[i] ? (
                        <span style={{ fontSize: '0.62rem', opacity: 0.2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          locked
                        </span>
                      ) : (
                        <label className="fle-image-toggle" title="Toggle image">
                          <input
                            type="checkbox"
                            checked={layout.theArtsImages[i]}
                            onChange={() => toggleArtsImage(i)}
                          />
                          img
                        </label>
                      )
                    }
                  />
                ))}
              </div>

              {/* Photo Spotlight column (big middle) */}
              <div className="fle-column">
                <SpotlightBrowser
                  photos={layout.photoSpotlight}
                  onAdd={addSpotlightPhoto}
                  onRemove={removeSpotlightPhoto}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px', marginTop: 6 }}>
                  <DropSlot
                    slotId="spotsub-0"
                    label="Sub-feature Left (with image)"
                    article={getArticle('spotlightSubs', 0)}
                    showImage
                    onClear={() => clearSlot('spotsub-0')}
                    isImageSlot
                  />
                  <DropSlot
                    slotId="spotsub-1"
                    label="Sub-feature Right (with image)"
                    article={getArticle('spotlightSubs', 1)}
                    showImage
                    onClear={() => clearSlot('spotsub-1')}
                    isImageSlot
                  />
                </div>
              </div>

              {/* Collar City Column (right) */}
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Collar City Column</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.35 }}>{collarImageCount}/2 imgs</span>
                </div>
                {COLLAR_CITY_LABELS.map((label, i) => (
                  <DropSlot
                    key={`collar-${i}`}
                    slotId={`collar-${i}`}
                    label={label}
                    article={getArticle('collarCity', i)}
                    showImage={layout.collarCityImages[i]}
                    onClear={() => clearSlot(`collar-${i}`)}
                    isImageSlot={layout.collarCityImages[i]}
                    imageToggle={
                      collarImageCount >= 2 && !layout.collarCityImages[i] ? (
                        <span style={{ fontSize: '0.62rem', opacity: 0.2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          locked
                        </span>
                      ) : (
                        <label className="fle-image-toggle" title="Toggle image">
                          <input
                            type="checkbox"
                            checked={layout.collarCityImages[i]}
                            onChange={() => toggleCollarCityImage(i)}
                          />
                          img
                        </label>
                      )
                    }
                  />
                ))}
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
