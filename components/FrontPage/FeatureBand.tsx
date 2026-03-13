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
      <p className="font-ui mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
        {article.section}
      </p>
      <h3 className="font-display text-[19px] font-bold leading-[1.06] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent md:text-[24px]">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="font-copy mt-3 max-w-3xl text-[13px] leading-[1.4] text-text-main">
          {article.excerpt}
        </p>
      )}
      <Byline author={article.author} date={article.date} />
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
