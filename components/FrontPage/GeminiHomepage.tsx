import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { Byline } from "./Byline";
import { ImageCaption } from "./ImageCaption";
import { ArticleCard } from "./ArticleCard";
import type { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { getSlotNumber } from "@/lib/homepageSlots";

const getLeadDate = (article: Article): string | null => {
  if (article.date) return article.date;
  if (!article.publishedDate) return null;
  const diffDays = Math.floor(
    (Date.now() - new Date(article.publishedDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  return `${diffDays} DAY${diffDays !== 1 ? "S" : ""} AGO`;
};

const sectionFontClasses = (section: string | undefined): string => {
  if (section === "sports") return "font-normal tracking-[0.015em]";
  if (section === "features") return "font-light";
  if (section === "opinion") return "font-light";
  return "";
};

function CenterLead({
  article,
  important,
  photoPosition = "above",
  showSubdeck = true,
}: {
  article: Article;
  important?: boolean;
  photoPosition?: "above" | "below";
  showSubdeck?: boolean;
}) {
  const hasImage = Boolean(article.imageFull || article.image);
  const photo = hasImage ? (
    <figure data-marauders-obstacle="image" className="w-full">
      <div className="relative w-full overflow-hidden aspect-[3/2]">
        <Image
          src={article.imageFull || article.image!}
          alt={article.imageTitle || ""}
          fill
          className="object-cover"
          priority
          quality={100}
          sizes="(max-width: 1024px) 100vw, 620px"
        />
      </div>
      <ImageCaption
        caption={article.imageCaption}
        photographer={article.imagePhotographer}
        photographerId={article.imagePhotographerId}
        className="mt-2"
      />
    </figure>
  ) : null;
  const text = (
    <div className={photoPosition === "below" ? "mb-4" : "mt-4"}>
      <h1
        data-marauders-title
        className={`relative z-[30] font-copy font-bold leading-[1.06] tracking-[-0.015em] text-text-main [overflow-wrap:anywhere] break-words ${
          important ? "uppercase md:font-extrabold" : ""
        } ${sectionFontClasses(article.section)} text-[22px] md:text-[26px] xl:text-[30px]`}
      >
        {article.richTitle || article.title}
      </h1>
      {showSubdeck && article.excerpt && (
        <p
          data-marauders-obstacle="excerpt"
          className="font-meta font-normal text-text-main mt-3 text-[14px] leading-[1.5] md:text-[15px] [overflow-wrap:anywhere] break-words"
        >
          {article.excerpt}
        </p>
      )}
      <div className="mt-2">
        <Byline author={article.author} date={getLeadDate(article)} />
      </div>
    </div>
  );
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className={`flex flex-col group cursor-pointer min-w-0${article.isFollytechnic ? " follytechnic" : ""}`}
    >
      {photoPosition === "below" ? (
        <>
          {text}
          {photo}
        </>
      ) : (
        <>
          {photo}
          {text}
        </>
      )}
    </TransitionLink>
  );
}

function TextOnlyItem({ article, showSubdeck = true }: { article: Article; showSubdeck?: boolean }) {
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className={`block group cursor-pointer min-w-0${article.isFollytechnic ? " follytechnic" : ""}`}
    >
      <h3 className={`font-copy font-bold leading-[1.15] tracking-[-0.005em] text-text-main text-[17px] md:text-[18px] ${sectionFontClasses(article.section)}`}>
        {article.richTitle || article.title}
      </h3>
      {showSubdeck && article.excerpt && (
        <p className="font-meta font-normal text-text-muted mt-1.5 text-[12.5px] leading-[1.4] line-clamp-2">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

function SideFeature({ article, showSubdeck = true }: { article: Article; showSubdeck?: boolean }) {
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className={`flex flex-col group cursor-pointer min-w-0${article.isFollytechnic ? " follytechnic" : ""}`}
    >
      {article.image && (
        <figure className="w-full">
          <div className="relative w-full overflow-hidden aspect-[3/2]">
            <Image
              src={article.image}
              alt={article.imageTitle || ""}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 300px"
            />
          </div>
        </figure>
      )}
      <div className="mt-3">
        <h3 className={`font-copy font-bold leading-[1.12] tracking-[-0.005em] text-text-main text-[19px] md:text-[20px] ${sectionFontClasses(article.section)}`}>
          {article.richTitle || article.title}
        </h3>
        {showSubdeck && article.excerpt && (
          <p className="font-meta font-normal text-text-muted mt-1.5 text-[12.5px] leading-[1.4] line-clamp-3">
            {article.excerpt}
          </p>
        )}
      </div>
    </TransitionLink>
  );
}

export function GeminiHomepage({
  lead,
  leftStack,
  rightFeatures,
  bottomRow,
  leadImportant,
  leadPhotoPosition = "above",
  showSubdeckLead = true,
  showSubdeckLeft = [],
  showSubdeckRight = [],
  showSubdeckBottom = [],
  sectionBlocks,
}: {
  lead: Article;
  leftStack: Article[];
  rightFeatures: Article[];
  bottomRow: Article[];
  leadImportant: boolean;
  leadPhotoPosition?: "above" | "below";
  showSubdeckLead?: boolean;
  showSubdeckLeft?: boolean[];
  showSubdeckRight?: boolean[];
  showSubdeckBottom?: boolean[];
  sectionBlocks: React.ReactNode;
}) {
  return (
    <div className="homepage-zodiac w-full bg-bg-main text-text-main transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 pb-14 md:px-6 xl:px-[30px]">
        <div data-frontpage-top className="pt-5 pb-6 md:pt-7 md:pb-8">
          <div className="gemini-top-grid grid grid-cols-1 gap-6 md:gap-7 lg:gap-8">
            <aside className="order-2 md:order-none md:col-start-1 md:row-start-1 md:border-r md:border-rule md:pr-6 lg:pr-7">
              <div className="flex flex-col divide-y divide-rule">
                {leftStack.map((article, i) => (
                  <div
                    key={article.id}
                    className={i === 0 ? "pb-5" : "py-5 last:pb-0"}
                    data-homepage-layout="gemini"
                    data-homepage-slot={getSlotNumber("gemini", `left-${i}`) ?? undefined}
                  >
                    <TextOnlyItem article={article} showSubdeck={showSubdeckLeft[i] !== false} />
                  </div>
                ))}
              </div>
            </aside>

            <div
              className="order-1 md:order-none md:col-start-2 md:row-start-1"
              data-homepage-layout="gemini"
              data-homepage-slot={getSlotNumber("gemini", "lead") ?? undefined}
            >
              <CenterLead
                article={lead}
                important={leadImportant}
                photoPosition={leadPhotoPosition}
                showSubdeck={showSubdeckLead}
              />
            </div>

            <aside className="order-4 md:order-none md:col-start-3 md:row-start-1 md:row-span-2 md:border-l md:border-rule md:pl-6 lg:pl-7">
              <div className="flex flex-col divide-y divide-rule">
                {rightFeatures.map((article, i) => (
                  <div
                    key={article.id}
                    className={i === 0 ? "pb-5" : "py-5 last:pb-0"}
                    data-homepage-layout="gemini"
                    data-homepage-slot={getSlotNumber("gemini", `right-${i}`) ?? undefined}
                  >
                    <SideFeature article={article} showSubdeck={showSubdeckRight[i] !== false} />
                  </div>
                ))}
              </div>
            </aside>

            {bottomRow.length > 0 && (
              <div className="order-3 md:order-none md:col-start-1 md:col-span-2 md:row-start-2 md:mt-2 md:border-t md:border-rule md:pt-6 md:pr-6 lg:pr-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-10 sm:divide-x sm:divide-rule">
                  {bottomRow.slice(0, 2).map((article, i) => (
                    <div
                      key={article.id}
                      className={`${i > 0 ? "pt-5 border-t border-rule sm:border-t-0 sm:pt-0 sm:pl-5" : "sm:pr-5"}`}
                      data-homepage-layout="gemini"
                      data-homepage-slot={getSlotNumber("gemini", `bottom-${i}`) ?? undefined}
                    >
                      <ArticleCard
                        article={article}
                        showImage
                        showExcerpt={showSubdeckBottom[i] === true}
                        imageAspectClassName="aspect-[3/2]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {sectionBlocks}
      </div>
    </div>
  );
}

export default GeminiHomepage;
