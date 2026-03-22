import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Article } from "./types";
import { Byline } from "./Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";

export const FeatureBand = ({ article }: { article: Article }) => (
  <Link
    href={getArticleUrl(article)}
    className="group grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-start"
  >
    <div>
      <p className="font-meta mb-2 text-[11px] md:text-[12px] font-[440] italic capitalize tracking-[0.04em] text-accent">
        {article.section}
      </p>
      <h3 className={`font-display text-[24px] font-bold leading-[1.06] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent md:text-[30px] ${article.section === "news" ? "font-meta !font-[600] !text-[1.2em]" : ""} ${article.section === "features" ? "font-light italic text-[25px] md:text-[31px]" : ""} ${article.section === "sports" ? "font-[560] italic tracking-[0.015em]" : ""}`}>
        {article.title}
      </h3>
      <Byline author={article.author} date={article.date} />
      {article.excerpt && (
        <p className="font-meta mt-3 max-w-3xl text-[13px] font-normal leading-[1.4] text-text-main">
          {article.excerpt}
        </p>
      )}
    </div>

    {article.image ? (
      <div className="relative overflow-hidden">
        <div className="relative aspect-[16/10]">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 360px"
          />
        </div>
      </div>
    ) : null}
  </Link>
);
