import React from "react";
import TransitionLink from "@/components/TransitionLink";
import { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";

export const ArticleListItem = ({ article }: { article: Article }) => (
  <li className="border-t border-rule py-3 first:border-t-0 first:pt-0">
    <TransitionLink href={getArticleUrl(article)} className="group block" data-header-anchor="text">
      <h4 className={`text-[22px] md:text-[24px] font-bold leading-[1.12] tracking-[-0.01em] text-text-main transition-colors group-hover:text-accent ${article.section === "opinion" ? "font-copy font-light" : "font-display"} ${article.section === "news" ? "font-meta !font-[600] !text-[1.2em]" : ""} ${article.section === "features" ? "font-light italic text-[23px] md:text-[25px]" : ""} ${article.section === "sports" ? "font-[560] italic tracking-[0.015em]" : ""}`}>
        {article.title}
      </h4>
      <span className="font-meta mt-1 block text-[10px] font-normal tracking-[0.04em] text-text-muted">
        {article.author && (
          <span className="font-[440] text-accent">{article.author}</span>
        )}
        {article.author && article.date && <span className="mx-1.5" />}
        {article.date && <span className="font-medium">{article.date}</span>}
      </span>
    </TransitionLink>
  </li>
);
