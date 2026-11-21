import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { newsBylineDate } from "./newsLayout";

/** One card: 3:2 photo, headline, byline with date, subdeck */
export function FeaturedCard({
  article,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px",
  large = false,
  subdeck = !large,
}: {
  article: ComponentArticle;
  /** How wide the photo is drawn, for the download size */
  sizes?: string;
  /** A bigger headline (the topic row) */
  large?: boolean;
  /** Show the subdeck; by default only on the regular-size card */
  subdeck?: boolean;
}) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      <article>
        {article.image && (
          <div className="relative mb-3 aspect-[3/2] overflow-hidden">
            <Image
              src={article.image}
              alt={article.imageTitle || ""}
              fill
              className="object-cover"
              style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
              sizes={sizes}
            />
          </div>
        )}
        <h3
          className={`font-copy font-medium text-text-main transition-colors group-hover:text-accent ${
            large ? "text-[clamp(24px,2.2vw,29px)] leading-[1.1]" : "text-[clamp(22px,1.95vw,25px)] leading-[1.12]"
          }`}
        >
          {article.richTitle || article.title}
        </h3>
        <Byline
          author={article.author}
          date={newsBylineDate(article)}
          variant="features"
          className={`text-[12px] ${large ? "mt-2.5" : "mt-2"}`}
        />
        {subdeck && article.excerpt && (
          <p className="mt-2 font-meta text-[15px] font-medium leading-[1.45] text-text-main line-clamp-4">
            {article.excerpt}
          </p>
        )}
      </article>
    </TransitionLink>
  );
}

/**
 * A card with the headline and byline over the bottom of its 3:2 photo,
 * white on a dark gradient (the topic row). Hovering darkens the photo a
 * little, as on the lead. A story without a photo gets a plain dark panel.
 */
export function OverlayCard({ article, sizes }: { article: ComponentArticle; sizes: string }) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      <article className="relative aspect-[3/2] overflow-hidden bg-[#1a1a1a]">
        {article.image && (
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
            sizes={sizes}
          />
        )}
        {/* Dark from the bottom up past the text, clear above */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.72)_34%,rgba(0,0,0,0.28)_60%,rgba(0,0,0,0)_78%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-[0.18]"
        />
        {/* A faint shadow keeps the type legible over bright photos */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
          <h3 className="font-copy text-[clamp(22px,2vw,27px)] font-medium leading-[1.1] text-white">
            {article.richTitle || article.title}
          </h3>
          <Byline
            author={article.author}
            date={newsBylineDate(article)}
            variant="features"
            className="mt-2 text-[12px] [&_span]:text-white/90"
          />
        </div>
      </article>
    </TransitionLink>
  );
}
