"use client";

import React, { useState } from "react";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article } from "@/components/FrontPage/types";

export default function EditorsChoice({
  label,
  articles,
}: {
  label: string;
  articles: Article[];
}) {
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  if (articles.length === 0) return null;

  return (
    <div>
      <div style={{ borderTop: "2px solid var(--accent-color)", paddingTop: 8, marginLeft: -1, marginRight: -1 }}>
        <p
          className="font-meta text-[12px] font-semibold uppercase tracking-[0.12em] text-accent dark:text-[#d96b76]"
          style={{ margin: "2px 0 2px", paddingLeft: 1 }}
        >
          {label}
        </p>
        <div className="flex flex-col">
          {articles.map((article, i) => (
            <TransitionLink
              key={article.id}
              href={getArticleUrl(article)}
              className="flex items-baseline no-underline transition-colors duration-150"
              style={{
                gap: 8,
                padding: "7px 0",
                color: hoveredId === article.id ? "var(--accent-color)" : "inherit",
                borderBottom:
                  i < articles.length - 1
                    ? "1px solid var(--rule-color, #e0e0e0)"
                    : "none",
              }}
              onMouseEnter={() => setHoveredId(article.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span
                className="font-copy"
                style={{
                  fontSize: 26,
                  fontWeight: 500,
                  color: "var(--accent-color)",
                  minWidth: 20,
                }}
              >
                {i + 1}
              </span>
              <span
                className="font-copy"
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  lineHeight: 1.15,
                }}
              >
                {article.richTitle || article.title}
              </span>
            </TransitionLink>
          ))}
        </div>
      </div>
    </div>
  );
}
