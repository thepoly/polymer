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
      <div style={{ borderTop: "2px solid #C41E3A", paddingTop: 12, marginLeft: -1, marginRight: -1 }}>
        <p
          className="font-meta uppercase"
          style={{
            fontSize: 15,
            letterSpacing: "0.08em",
            color: "#C41E3A",
            fontWeight: 500,
            margin: "0 0 1px",
          }}
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
                gap: 10,
                padding: "10px 0",
                color: hoveredId === article.id ? "#C41E3A" : "inherit",
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
                  color: "#C41E3A",
                  minWidth: 20,
                }}
              >
                {i + 1}
              </span>
              <span
                className="font-copy"
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  lineHeight: 1.12,
                }}
              >
                {article.title}
              </span>
            </TransitionLink>
          ))}
        </div>
      </div>
    </div>
  );
}
