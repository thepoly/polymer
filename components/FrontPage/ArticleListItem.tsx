import React from "react";
import TransitionLink from "@/components/TransitionLink";
import { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { Byline } from "./Byline";

export const ArticleListItem = ({ article }: { article: Article }) => (
  <li className={`border-t border-rule py-3 first:border-t-0 first:pt-0${article.isFollytechnic ? ' follytechnic' : ''}`}>
    <TransitionLink href={getArticleUrl(article)} className="group block" data-header-anchor="text">
      <h4 className={`text-[22px] md:text-[24px] font-bold leading-[1.12] tracking-[-0.01em] text-text-main transition-colors font-copy ${article.section === "opinion" ? "font-light" : ""} ${article.section === "news" ? "text-[23px] md:text-[25px]" : ""} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light text-[23px] md:text-[25px]" : ""}`}>
        {article.richTitle || article.title}
      </h4>
      <Byline author={article.author} date={article.date} className="mt-1 block text-[10px] md:text-[10px]" />
    </TransitionLink>
  </li>
);
