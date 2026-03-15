'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

type Result = {
  id: number;
  title: string;
  section: string;
  url: string;
};

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto p-2 hover:bg-gray-100 rounded transition-colors"
      >
        <Search className="w-5 h-5 text-black" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-md">
            <div className="flex items-center h-[58px] px-4 md:px-6 gap-3">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles..."
                className="flex-1 text-[16px] text-black placeholder-gray-400 outline-none bg-transparent"
              />
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            {(results.length > 0 || loading) && (
              <div className="border-t border-gray-200 max-h-[60vh] overflow-y-auto">
                {loading && (
                  <div className="px-6 py-4 text-[14px] text-gray-400">Searching...</div>
                )}
                {!loading && results.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={r.url}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col px-6 py-3 hover:bg-gray-50 transition-colors ${
                      idx < results.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                      {r.section}
                    </span>
                    <span className="text-[15px] font-semibold text-gray-900 leading-snug">
                      {r.title}
                    </span>
                  </Link>
                ))}
                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="px-6 py-4 text-[14px] text-gray-400">No results for "{query}"</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
