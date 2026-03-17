import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Article } from "./types";
import { Byline } from "./Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";

export const ArticleCard = ({
  article,
  caption,
  showImage = Boolean(article.image),
  imageAspectClassName = "aspect-[4/3]",
  titleClassName = "text-[21px] md:text-[24px]",
  excerptClassName = "mt-1.5 line-clamp-3 text-[13px] leading-[1.38]",
}: {
  article: Article;
  caption?: string | null;
  showImage?: boolean;
  imageAspectClassName?: string;
  titleClassName?: string;
  excerptClassName?: string;
}) => (
  <Link href={getArticleUrl(article)} className="group block">
    {showImage && article.image && (
      <figure className="mb-3">
        <div className={`relative w-full overflow-hidden ${imageAspectClassName}`}>
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 380px"
          />
        </div>
        {caption && (
          <figcaption className="font-meta mt-1.5 text-[10px] leading-snug tracking-wide text-text-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    )}

    <h3
      className={`font-display font-bold leading-[1.12] tracking-[-0.01em] text-text-main transition-colors group-hover:text-accent ${titleClassName} ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic text-[22px] md:text-[25px]" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}
    >
      {article.title}
    </h3>
    {article.excerpt && (
      <p className={`font-meta font-normal text-text-muted ${excerptClassName}`}>
        {article.excerpt}
      </p>
    )}
    <Byline author={article.author} date={article.date} />
  </Link>
);
