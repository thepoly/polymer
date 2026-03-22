'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type ArticleOption = {
  id: number;
  title: string;
  slug: string;
  section: string;
  featuredImage?: { url?: string | null } | number | null;
};

type SectionLayoutData = {
  skeleton?: string;
  pinnedArticles?: number[];
};

export function SectionPinEditor({ section }: { section: string }) {
  const [editableSections, setEditableSections] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Check if user can edit this section
  useEffect(() => {
    fetch('/api/section-layout')
      .then((r) => r.json())
      .then((data) => {
        setEditableSections(data.editableSections || []);
        const sectionData = data.sectionLayouts?.[section] as SectionLayoutData | undefined;
        if (sectionData?.pinnedArticles) {
          setPinnedIds(sectionData.pinnedArticles);
        }
      })
      .catch(() => {});
  }, [section]);

  const canEdit = editableSections.includes(section);

  // Load articles when opening
  const loadArticles = useCallback(() => {
    if (loaded) return;
    fetch(
      `/api/articles?where[_status][equals]=published&where[section][equals]=${section}` +
      `&sort=-publishedDate&limit=30&depth=1` +
      `&select[title]=true&select[slug]=true&select[section]=true&select[featuredImage]=true`
    )
      .then((r) => r.json())
      .then((data) => {
        setArticles(data.docs || []);
        setLoaded(true);
      })
      .catch(() => {});
  }, [section, loaded]);

  const handleOpen = () => {
    setIsOpen(true);
    loadArticles();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handlePin = (articleId: number) => {
    if (pinnedIds.includes(articleId)) return;
    setPinnedIds((prev) => [...prev, articleId]);
  };

  const handleUnpin = (articleId: number) => {
    setPinnedIds((prev) => prev.filter((id) => id !== articleId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/section-layout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, pinnedArticles: pinnedIds }),
      });
      if (res.ok) {
        setIsOpen(false);
        window.location.reload();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) return null;

  const displayName = section.charAt(0).toUpperCase() + section.slice(1);
  const filteredArticles = articles.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );
  const pinnedArticles = pinnedIds
    .map((id) => articles.find((a) => a.id === id))
    .filter(Boolean) as ArticleOption[];

  return (
    <>
      <button
        onClick={handleOpen}
        className="font-meta text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted/50 hover:text-accent transition-colors ml-3"
        title={`Edit ${displayName} section layout`}
      >
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] bg-black/40">
          <div
            ref={panelRef}
            className="w-full max-w-lg bg-bg-main border border-rule rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
              <h3 className="font-meta text-sm font-bold text-text-main">
                Pin articles — {displayName}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="font-meta text-xs font-bold px-3 py-1 rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-text-muted hover:text-text-main text-lg leading-none px-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Pinned list */}
            <div className="px-5 py-3 border-b border-rule">
              <div className="font-meta text-[10px] uppercase tracking-wider text-text-muted mb-2">
                Pinned ({pinnedIds.length})
              </div>
              {pinnedArticles.length === 0 ? (
                <p className="font-meta text-xs text-text-muted italic">
                  No pinned articles. Articles will auto-fill from recent {displayName.toLowerCase()}.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {pinnedArticles.map((article, i) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded bg-bg-main/50 border border-rule/50 group"
                    >
                      <span className="font-meta text-[10px] text-text-muted w-4 text-center">{i + 1}</span>
                      <span className="font-copy text-xs text-text-main flex-1 truncate">{article.title}</span>
                      <button
                        onClick={() => handleUnpin(article.id)}
                        className="font-meta text-[10px] text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Unpin
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Article search + list */}
            <div className="px-5 py-3">
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 mb-2 rounded border border-rule bg-transparent font-meta text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <div className="max-h-[30vh] overflow-y-auto flex flex-col gap-0.5">
                {filteredArticles.map((article) => {
                  const isPinned = pinnedIds.includes(article.id);
                  return (
                    <button
                      key={article.id}
                      onClick={() => isPinned ? handleUnpin(article.id) : handlePin(article.id)}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded text-left transition-colors w-full ${
                        isPinned
                          ? 'bg-accent/10 border border-accent/30'
                          : 'hover:bg-bg-main/80 border border-transparent'
                      }`}
                    >
                      <span className={`font-meta text-[9px] font-bold uppercase ${isPinned ? 'text-accent' : 'text-text-muted'}`}>
                        {isPinned ? 'Pinned' : 'Pin'}
                      </span>
                      <span className="font-copy text-xs text-text-main flex-1 truncate">{article.title}</span>
                    </button>
                  );
                })}
                {filteredArticles.length === 0 && loaded && (
                  <p className="font-meta text-xs text-text-muted italic py-2">No articles found.</p>
                )}
                {!loaded && (
                  <p className="font-meta text-xs text-text-muted italic py-2">Loading...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
