"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";

export default function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue || "");
  const [articles, setArticles] = useState<Article[]>([]);
  const [searched, setSearched] = useState(!!defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    abortRef.current?.abort();

    if (!q.trim()) {
      setArticles([]);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      setArticles(data.articles);
      setSearched(true);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 250);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  // Fetch initial results if there's a default value
  useEffect(() => {
    if (defaultValue) fetchResults(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative flex items-center border-b-2 border-rule-strong transition-colors focus-within:border-accent">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full bg-transparent py-2 pl-3 pr-36 font-display text-xl md:text-3xl font-bold text-text-main placeholder:text-text-muted/30 outline-none"
        />
        <Image
          src="/logo.svg"
          alt="The Polytechnic"
          width={160}
          height={42}
          style={{ filter: "var(--header-logo-invert)" }}
          className="absolute right-2 top-1/2 -translate-y-1/3 opacity-20 pointer-events-none"
        />
      </div>

      <p className="mt-3 font-meta text-[12px] text-text-muted">
        {searched && (
          <>
            We found <span className="text-accent font-bold">{articles.length}</span> result{articles.length !== 1 ? "s" : ""} that matched your query.{" "}
          </>
        )}
        Our search algorithm uses title, subtitle, and kicker matching. You are currently searching our online database, containing articles published after 2009. You can access older articles in our archive at the Richard G. Folsom Library.
      </p>

      {searched && articles.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col divide-y divide-rule">
            {articles.map((article) => (
              <div key={article.id} className="py-4 first:pt-0">
                <Link href={getArticleUrl(article)} className="flex flex-col group cursor-pointer">
                  <h3 className={`font-display font-bold text-text-main mb-1 text-[16px] md:text-[18px] leading-tight group-hover:text-accent transition-colors ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
                    {article.title}
                  </h3>
                  <p className="font-copy text-text-main text-[13px] md:text-[14px] leading-[1.4] mb-2 transition-colors">
                    {article.excerpt}
                  </p>
                  <Byline author={article.author} date={article.date} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
