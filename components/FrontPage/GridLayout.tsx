import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { Article } from "./types";
import { Byline } from "./Byline";
import { ImageCaption } from "./ImageCaption";
import { getArticleUrl } from "@/utils/getArticleUrl";

type ImageDirection = "top" | "bottom" | "left" | "right" | "none";

type GridCell = {
  id: string;
  span: number;
  articleId: number | null;
  direction: ImageDirection;
  children?: GridCell[];
};

type GridRow = {
  id: string;
  cells: GridCell[];
};

export type { GridRow, GridCell, ImageDirection };

function GridArticleCard({
  article,
  direction,
  span,
}: {
  article: Article;
  direction: ImageDirection;
  span: number;
}) {
  const showImage = direction !== "none" && Boolean(article.image);
  const isHorizontal = direction === "left" || direction === "right";
  const isLarge = span >= 7;
  const isMedium = span >= 5;

  const titleSize = isLarge
    ? "text-[28px] md:text-[32px] xl:text-[36px]"
    : isMedium
      ? "text-[22px] md:text-[26px]"
      : "text-[20px] md:text-[22px]";

  const textContent = (
    <div data-header-anchor="text" className={isHorizontal ? "flex-1 min-w-0" : ""}>
      <p className="font-meta mb-1 text-[13px] md:text-[12px] font-[600] md:font-[440] italic capitalize tracking-[0.04em] text-accent dark:text-[#d96b76]">
        {article.section}
      </p>
      <h3
        data-marauders-title
        className={`relative z-[30] font-copy font-bold leading-[1.08] tracking-[-0.015em] text-text-main transition-colors [overflow-wrap:anywhere] break-words ${titleSize} ${article.section === "news" ? "!text-[1.2em]" : ""} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light" : ""} ${article.section === "opinion" ? "font-light" : ""}`}
      >
        {article.title}
      </h3>
      <Byline author={article.author} date={article.date} split={isLarge} />
      {article.excerpt && (
        <p
          data-marauders-obstacle="excerpt"
          className={`font-meta font-normal text-black dark:text-white mt-2 [overflow-wrap:anywhere] break-words ${
            isLarge
              ? "text-[14px] leading-[1.45] line-clamp-4"
              : "text-[13px] leading-[1.38] line-clamp-3"
          }`}
        >
          {article.excerpt}
        </p>
      )}
    </div>
  );

  const imageContent = showImage && article.image ? (
    <figure
      data-header-anchor="image"
      data-marauders-obstacle="image"
      className={
        isHorizontal
          ? `relative overflow-hidden flex-shrink-0 ${isLarge ? "w-[55%]" : isMedium ? "w-[50%]" : "w-[45%]"}`
          : "relative w-full overflow-hidden"
      }
    >
      <div
        className={`relative w-full overflow-hidden ${
          isHorizontal
            ? "aspect-[4/3]"
            : isLarge
              ? "aspect-[3/2] xl:aspect-[8/5]"
              : "aspect-[4/3]"
        }`}
      >
        <Image
          src={article.image}
          alt={article.imageTitle || article.title}
          fill
          className="object-cover"
          sizes={
            isLarge
              ? "(max-width: 768px) 100vw, 720px"
              : "(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 380px"
          }
        />
      </div>
      <ImageCaption
        caption={article.imageCaption}
        photographer={article.imagePhotographer}
        photographerId={article.imagePhotographerId}
        className="mt-1.5"
      />
    </figure>
  ) : null;

  if (isHorizontal) {
    return (
      <TransitionLink href={getArticleUrl(article)} className={`group block min-w-0${article.isFollytechnic ? ' follytechnic' : ''}`}>
        <div className={`flex gap-4 ${direction === "right" ? "flex-row-reverse" : "flex-row"}`}>
          {imageContent}
          {textContent}
        </div>
      </TransitionLink>
    );
  }

  return (
    <TransitionLink href={getArticleUrl(article)} className="group block min-w-0">
      {direction === "bottom" ? (
        <>
          {textContent}
          {imageContent && <div className="mt-3">{imageContent}</div>}
        </>
      ) : (
        <>
          {imageContent && <div className="mb-3">{imageContent}</div>}
          {textContent}
        </>
      )}
    </TransitionLink>
  );
}

/** Mobile-only card: always vertical image-on-top, full width */
function MobileArticleCard({ article }: { article: Article }) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      {article.image && (
        <figure className="mb-3">
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
            <div className="relative w-full aspect-[3/2]">
              <Image
                src={article.image}
                alt={article.imageTitle || article.title}
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>
          </div>
          <ImageCaption
            caption={article.imageCaption}
            photographer={article.imagePhotographer}
            photographerId={article.imagePhotographerId}
            className="mt-1.5"
          />
        </figure>
      )}
      <p className="font-meta mb-1 text-[13px] font-[600] italic capitalize tracking-[0.04em] text-accent dark:text-[#d96b76]">
        {article.section}
      </p>
      <h3
        data-marauders-title
        className={`relative z-[30] font-copy font-bold leading-[1.08] tracking-[-0.015em] text-text-main transition-colors [overflow-wrap:anywhere] break-words text-[26px] ${article.section === "news" ? "!text-[1.2em]" : ""} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light" : ""} ${article.section === "opinion" ? "font-light" : ""}`}
      >
        {article.title}
      </h3>
      <Byline author={article.author} date={article.date} />
      {article.excerpt && (
        <p
          data-marauders-obstacle="excerpt"
          className="font-meta font-normal text-black dark:text-white mt-2 text-[14px] leading-[1.45] line-clamp-3 [overflow-wrap:anywhere] break-words"
        >
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

const cellHasContent = (cell: GridCell, articleMap: Map<number, Article>): boolean => {
  if (cell.articleId && articleMap.has(cell.articleId)) return true;
  if (cell.children) return cell.children.some((c) => cellHasContent(c, articleMap));
  return false;
};

/** Collect all articles from the grid in order, for the mobile flat list */
const collectGridArticles = (rows: GridRow[], articleMap: Map<number, Article>): Article[] => {
  const result: Article[] = [];
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.children) {
        for (const sub of cell.children) {
          const a = sub.articleId ? articleMap.get(sub.articleId) : undefined;
          if (a) result.push(a);
        }
      } else {
        const a = cell.articleId ? articleMap.get(cell.articleId) : undefined;
        if (a) result.push(a);
      }
    }
  }
  return result;
};

export function GridLayout({
  rows,
  articleMap,
}: {
  rows: GridRow[];
  articleMap: Map<number, Article>;
}) {
  if (rows.length === 0) return null;

  const mobileArticles = collectGridArticles(rows, articleMap);

  return (
    <div data-header-scope="primary">
      {/* Mobile: flat stacked list */}
      <div className="flex flex-col md:hidden">
        {mobileArticles.map((article, i) => (
          <div key={article.id} className={i > 0 ? "mt-10 border-t border-rule pt-10" : ""}>
            <MobileArticleCard article={article} />
          </div>
        ))}
      </div>

      {/* Desktop: 12-column grid */}
      <div className="hidden md:flex md:flex-col md:gap-7">
        {rows.map((row) => {
          const hasContent = row.cells.some((cell) => cellHasContent(cell, articleMap));
          if (!hasContent) return null;

          return (
            <div
              key={row.id}
              className="grid gap-5 md:gap-6"
              style={{
                gridTemplateColumns: `repeat(12, minmax(0, 1fr))`,
              }}
            >
              {row.cells.map((cell) => {
                if (!cellHasContent(cell, articleMap)) return null;

                // Stacked cell — render children vertically
                if (cell.children && cell.children.length > 0) {
                  return (
                    <div
                      key={cell.id}
                      style={{ gridColumn: `span ${cell.span}` }}
                      className="min-w-0 flex flex-col gap-5"
                    >
                      {cell.children.map((sub) => {
                        const subArticle = sub.articleId ? articleMap.get(sub.articleId) : null;
                        if (!subArticle) return null;
                        return (
                          <GridArticleCard
                            key={sub.id}
                            article={subArticle}
                            direction={sub.direction}
                            span={cell.span}
                          />
                        );
                      })}
                    </div>
                  );
                }

                // Flat cell
                const article = cell.articleId ? articleMap.get(cell.articleId) : null;
                if (!article) return null;

                return (
                  <div
                    key={cell.id}
                    style={{ gridColumn: `span ${cell.span}` }}
                    className="min-w-0"
                  >
                    <GridArticleCard
                      article={article}
                      direction={cell.direction}
                      span={cell.span}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
