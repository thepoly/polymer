import React from "react";
import Link from "next/link";
import { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";

export const ArticleListItem = ({ article }: { article: Article }) => (
  <li className="border-t border-rule py-3 first:border-t-0 first:pt-0">
    <Link href={getArticleUrl(article)} className="group block">
      <h4 className={`font-display text-[20px] md:text-[22px] font-bold leading-[1.15] text-text-main transition-colors group-hover:text-accent ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic text-[21px] md:text-[23px]" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
        {article.title}
      </h4>
      <span className="font-meta mt-1 block text-[10px] font-normal tracking-[0.04em] text-text-muted">
        {article.author && (
          <span className="font-[440] text-accent">{article.author}</span>
        )}
        {article.author && article.date && <span className="mx-1.5" />}
        {article.date && <span className="font-medium">{article.date}</span>}
      </span>
    </Link>
  </li>
);
