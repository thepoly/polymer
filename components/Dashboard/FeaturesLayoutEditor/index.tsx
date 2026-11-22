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
import {
  EMPTY_FEATURES_LAYOUT,
  normalizeFeaturesLayout,
  type FeaturesLayout,
  type FeaturesSlotKey,
  type LensPhoto,
} from '@/lib/featuresLayout';

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

// The Lens photos keep the Photo Spotlight's shape, plus when each was added
type SpotlightPhoto = LensPhoto;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const pointerThenCenter: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

const STRIP_LABELS = ['Strip 1', 'Strip 2'];
const PHOTO_STORY_LABELS = ['Photo Story 1', 'Photo Story 2', 'Photo Story 3'];

// Slot ID format: "cover-0", "second-0", "strip-1", "photo-2"
type ColumnKey = FeaturesSlotKey;
const SLOT_COLUMNS: Record<string, ColumnKey> = {
  cover: 'cover',
  second: 'second',
  strip: 'strips',
  photo: 'photoStories',
};

const parseSlotId = (slotId: string): { column: ColumnKey; index: number } | null => {
  const [prefix, idxStr] = slotId.split('-');
  const column = SLOT_COLUMNS[prefix];
  const index = Number(idxStr);
  return column && Number.isInteger(index) ? { column, index } : null;
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
  for (const col of [layout.cover, layout.second, layout.strips, layout.photoStories]) {
    for (const id of col) {
      if (id !== null) ids.add(id);
    }
  }
  return ids;
};

type ExtractedImage = { url: string; alt?: string; photographerName?: string; photographerUrl?: string };

// Extract photographer info from a populated media record (depth=2)
const extractPhotographer = (media: Record<string, unknown>): { name?: string; url?: string } => {
  const p = media.photographer;
  if (p && typeof p === 'object' && 'firstName' in (p as Record<string, unknown>)) {
    const user = p as Record<string, string>;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const url = user.slug ? `/staff/${user.slug}` : `/staff/${(p as { id: number }).id}`;
    return { name: name || undefined, url };
  }
  const writeIn = media.writeInPhotographer;
  if (typeof writeIn === 'string' && writeIn.trim()) return { name: writeIn.trim() };
  return {};
};

// Extract all images from a fully-fetched article (depth=2)
const extractImagesFromArticle = (articleData: Record<string, unknown>): ExtractedImage[] => {
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  // Fallback: use first populated author if no photographer on the media
  let fallbackName: string | undefined;
  let fallbackUrl: string | undefined;
  const authors = articleData.authors as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(authors) && authors.length > 0) {
    const first = authors[0];
    if (first && typeof first === 'object' && 'firstName' in first) {
      fallbackName = [first.firstName, first.lastName].filter(Boolean).join(' ') || undefined;
      fallbackUrl = first.slug ? `/staff/${first.slug}` : `/staff/${first.id}`;
    }
  }

  const add = (url: string | null | undefined, alt?: string, media?: Record<string, unknown>) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      const photog = media ? extractPhotographer(media) : {};
      images.push({
        url,
        alt: alt || '',
        photographerName: photog.name || fallbackName,
        photographerUrl: photog.url || fallbackUrl,
      });
    }
  };
  // Featured image
  const fi = articleData.featuredImage;
  if (fi && typeof fi === 'object' && 'url' in (fi as Record<string, unknown>)) {
    const m = fi as Record<string, unknown>;
    add(m.url as string | undefined, m.alt as string | undefined, m);
  }
  // Traverse Lexical content tree
  const traverse = (node: Record<string, unknown>) => {
    if (!node) return;
    if (node.type === 'upload' && node.value && typeof node.value === 'object') {
      const v = node.value as Record<string, unknown>;
      add(v.url as string | undefined, v.alt as string | undefined, v);
    }
    if (node.type === 'block' && node.fields && typeof node.fields === 'object') {
      const fields = node.fields as Record<string, unknown>;
      if ((fields.blockType === 'photo_gallery' || fields.blockType === 'carousel') && Array.isArray(fields.images)) {
        for (const img of fields.images as Array<Record<string, unknown>>) {
          const media = img.image;
          if (media && typeof media === 'object') {
            const m = media as Record<string, unknown>;
            add(m.url as string | undefined, m.alt as string | undefined, m);
          }
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
  title: Record<string, unknown>;
  plainTitle?: string;
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
  const [imageCache, setImageCache] = useState<Map<number, ExtractedImage[]>>(new Map());
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
        .filter((a: { section?: string }) => ['features', 'opinion', 'news', 'sports'].includes(a.section || ''))
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
      <div className="fle-spotlight-header">The Lens</div>
      <p className="fle-note">
        One of these shows each day, in turn, so a set of 6 to 10 lasts for weeks. Pick photos from any section.
        If the list is empty, or every photo in it was added more than two months ago, the page shows recent
        credited photos instead.
      </p>

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

      <button className="fle-add-btn" onClick={handleToggle}>
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
                    <span className="fle-spotlight-article-title">{article.plainTitle}</span>
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
                              onClick={() => {
                                if (!isUsed) {
                                  let articleUrl: string | undefined;
                                  if (article.publishedDate && article.slug) {
                                    const d = new Date(article.publishedDate);
                                    articleUrl = `/${article.section}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${article.slug}`;
                                  }
                                  onAdd({ url: img.url, caption: img.alt, articleTitle: article.plainTitle, articleUrl, photographerName: img.photographerName, photographerUrl: img.photographerUrl, addedAt: new Date().toISOString() });
                                }
                              }}
                            >
                              <img src={img.url} alt={img.alt || ''} />
                              {isUsed ? (
                                <div className="fle-spotlight-used-overlay">Already in The Lens</div>
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
// Photo Story photo picker
// ---------------------------------------------------------------------------

/**
 * Under a pinned Photo Story: choose which of the story's photos its card
 * shows. Left alone, the card shows the story's lead photo.
 */
function PhotoStoryImagePicker({
  articleId,
  selected,
  onSelect,
}: {
  articleId: number;
  selected: string | null;
  onSelect: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ExtractedImage[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !images) {
      setLoading(true);
      try {
        const res = await fetch(`/api/articles/${articleId}?depth=2`);
        setImages(extractImagesFromArticle(await res.json()));
      } catch (err) {
        console.error('Failed to load article images', err);
        setImages([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fle-photo-pick">
      <div className="fle-photo-pick-row">
        {selected ? (
          <span className="fle-photo-pick-current">
            <img src={selected} alt="" /> Chosen photo
          </span>
        ) : (
          <span className="fle-photo-pick-current fle-photo-pick-muted">Lead photo</span>
        )}
        <button type="button" className="fle-photo-pick-btn" onClick={toggle}>
          {open ? 'Done' : 'Choose photo'}
        </button>
      </div>
      {open && (
        <div className="fle-spotlight-article-images">
          {loading ? (
            <div className="fle-spotlight-loading">
              <div className="fle-spotlight-loading-spinner" />
              <span>Loading images...</span>
            </div>
          ) : images && images.length > 0 ? (
            <>
              {images.map((img) => (
                <button
                  type="button"
                  key={img.url}
                  className={`fle-spotlight-image-pick ${selected === img.url ? 'fle-photo-pick-selected' : ''}`}
                  onClick={() => onSelect(img.url)}
                  title={img.alt || 'Use this photo'}
                >
                  <img src={img.url} alt={img.alt || ''} />
                </button>
              ))}
              {selected && (
                <button type="button" className="fle-photo-pick-btn" onClick={() => onSelect(null)}>
                  Use lead photo
                </button>
              )}
            </>
          ) : (
            <div className="fle-spotlight-no-images">No images found in this article</div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

const cloneEmpty = (): FeaturesLayout => ({
  ...EMPTY_FEATURES_LAYOUT,
  cover: [...EMPTY_FEATURES_LAYOUT.cover],
  second: [...EMPTY_FEATURES_LAYOUT.second],
  strips: [...EMPTY_FEATURES_LAYOUT.strips],
  photoStories: [...EMPTY_FEATURES_LAYOUT.photoStories],
  photoStoryImages: [...EMPTY_FEATURES_LAYOUT.photoStoryImages],
  lens: [],
});

export function FeaturesLayoutEditor() {
  const [layout, setLayout] = useState<FeaturesLayout>(cloneEmpty);
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
          '&select[title]=true&select[plainTitle]=true&select[slug]=true&select[section]=true&select[publishedDate]=true' +
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

        // Layouts from the old three-column editor are carried over
        if (layoutData) setLayout(normalizeFeaturesLayout(layoutData.layout));
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

  // A Photo Story's chosen photo belongs to its story, so it goes when the story does
  const withSlot = (prev: FeaturesLayout, column: ColumnKey, index: number, articleId: number | null): FeaturesLayout => {
    const col = [...prev[column]];
    col[index] = articleId;
    const next = { ...prev, [column]: col };
    if (column === 'photoStories') {
      const images = [...prev.photoStoryImages];
      images[index] = null;
      next.photoStoryImages = images;
    }
    return next;
  };

  const setSlot = useCallback((column: ColumnKey, index: number, articleId: number | null) => {
    setLayout((prev) => withSlot(prev, column, index, articleId));
    markDirty();
  }, [markDirty]);

  const clearSlot = useCallback((slotId: string) => {
    const parsed = parseSlotId(slotId);
    if (!parsed) return;
    setSlot(parsed.column, parsed.index, null);
  }, [setSlot]);

  const setPhotoStoryImage = useCallback((index: number, url: string | null) => {
    setLayout((prev) => {
      const images = [...prev.photoStoryImages];
      images[index] = url;
      return { ...prev, photoStoryImages: images };
    });
    markDirty();
  }, [markDirty]);

  const addLensPhoto = useCallback((photo: SpotlightPhoto) => {
    setLayout((prev) => ({ ...prev, lens: [...prev.lens, photo] }));
    markDirty();
  }, [markDirty]);

  const removeLensPhoto = useCallback((index: number) => {
    setLayout((prev) => {
      const photos = [...prev.lens];
      photos.splice(index, 1);
      return { ...prev, lens: photos };
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
    const target = parseSlotId(overData.slotId as string);
    if (!target) return;

    // From a slot: swap the two
    if (activeData.source === 'slot' && typeof activeData.slotId === 'string') {
      const source = parseSlotId(activeData.slotId);
      if (source) {
        setLayout((prev) => {
          const targetOldId = prev[target.column][target.index];
          const afterSource = withSlot(prev, source.column, source.index, targetOldId);
          return withSlot(afterSource, target.column, target.index, draggedArticle.id);
        });
        markDirty();
        return;
      }
    }

    // From the pool
    setSlot(target.column, target.index, draggedArticle.id);
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

  const slot = (column: ColumnKey, prefix: string, index: number, label: string) => (
    <DropSlot
      key={`${prefix}-${index}`}
      slotId={`${prefix}-${index}`}
      label={label}
      article={getArticle(column, index)}
      showImage
      onClear={() => clearSlot(`${prefix}-${index}`)}
      isImageSlot
    />
  );

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
          <div className="fle-canvas-wrap">
            <p className="fle-note fle-note-top">
              Every slot is optional. An empty slot shows the newest story that isn&apos;t already on the page.
              A pinned story stays until you change it, unless it is more than six weeks older than the newest
              Features story; then the newest story takes its place, so the page never sits on old news.
            </p>

            {/* Cover across the page */}
            <div className="fle-column fle-full">
              <div className="fle-column-header">
                <span className="fle-column-title">Cover</span>
              </div>
              {slot('cover', 'cover', 0, 'Cover story (full width)')}
            </div>

            {/* Second story | The Lens */}
            <div className="fle-canvas fle-canvas-two">
              <div className="fle-column">
                <div className="fle-column-header">
                  <span className="fle-column-title">Second story</span>
                </div>
                {slot('second', 'second', 0, 'Second story (portrait photo)')}
                <div className="fle-column-header" style={{ marginTop: 12 }}>
                  <span className="fle-column-title">Strips</span>
                </div>
                {STRIP_LABELS.map((label, i) => slot('strips', 'strip', i, label))}
              </div>
              <div className="fle-column">
                <SpotlightBrowser photos={layout.lens} onAdd={addLensPhoto} onRemove={removeLensPhoto} />
              </div>
            </div>

            {/* Photo Stories */}
            <div className="fle-column fle-full">
              <div className="fle-column-header">
                <span className="fle-column-title">Photo Stories</span>
              </div>
              <p className="fle-note">
                Empty slots fill with the newest photo-led stories: &ldquo;Photo&rdquo; in the kicker, a photo
                feature, or a gallery. For a pinned story you can choose which of its photos the card shows.
              </p>
              <div className="fle-photo-stories">
                {PHOTO_STORY_LABELS.map((label, i) => (
                  <div key={label}>
                    {slot('photoStories', 'photo', i, label)}
                    {layout.photoStories[i] !== null && (
                      <PhotoStoryImagePicker
                        key={layout.photoStories[i]}
                        articleId={layout.photoStories[i] as number}
                        selected={layout.photoStoryImages[i]}
                        onSelect={(url) => setPhotoStoryImage(i, url)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="fle-note">
              From the Archive, the row of photo cards at the foot of the page, shows the next newest stories on its own.
            </p>
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
