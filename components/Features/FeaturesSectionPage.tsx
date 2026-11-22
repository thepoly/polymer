import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import SectionSearchPrompt from "@/components/SectionSearchPrompt";
import SportsHeading from "@/components/Sports/SportsHeading";
import SportsByline from "@/components/Sports/SportsByline";
import SportsFeatured from "@/components/Sports/SportsFeatured";
import { shortDate } from "@/components/Sports/sportsFormat";
import type { FeaturesLens, FeaturesPageData, FeaturesStory } from "@/lib/featuresPage";

const FEATURES_CONTACT_MAILTO =
  "mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip";

/*
 * /features, in the language of /sports and /news: one cover story across the
 * page, then a two-to-one row (a big second story, and The Lens beside it),
 * two wide strips, a row of Photo Stories, and the archive as a carousel.
 * Fewer stories than the other sections, each bigger, each with its dek.
 *
 * Phone order follows the DOM: cover, second story, The Lens, strips, Photo
 * Stories, archive.
 */

/* ── Labels ── */

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/**
 * The kicker, unless it only says "Features" or already opens the headline
 * ("Photo" over "Photo: …")
 */
function visibleKicker(article: FeaturesStory): string | null {
  const kicker = article.kicker?.trim();
  if (!kicker) return null;
  if (normalize(kicker) === "features") return null;
  if (article.title?.toLowerCase().startsWith(`${kicker.toLowerCase()}:`)) return null;
  return kicker;
}

/** "Nov 3", with the year once it isn't this year's */
function storyDate(article: FeaturesStory): string {
  const iso = article.publishedDate || article.createdAt;
  const thisYear = iso ? new Date(iso).getFullYear() === new Date().getFullYear() : true;
  return shortDate(article, !thisYear);
}

/** Kicker in black, then the date: one quiet line above a headline */
function Kicker({ article, className = "" }: { article: FeaturesStory; className?: string }) {
  const kicker = visibleKicker(article);
  const date = storyDate(article);
  if (!kicker && !date) return null;
  return (
    <div className={`font-meta text-[12px] uppercase tracking-[0.06em] text-text-muted ${className}`}>
      {kicker && <span className="font-bold text-text-main">{kicker}</span>}
      {kicker && date && <span aria-hidden="true" className="mx-1.5">·</span>}
      {date && <span className="whitespace-nowrap">{date}</span>}
    </div>
  );
}

/** Authors in red (the card's one red), then what the reader is signing up for */
function Byline({
  article,
  extent = "read",
  className = "",
}: {
  article: FeaturesStory;
  /** Which length to state: reading time, or the number of photos */
  extent?: "read" | "photos" | "none";
  className?: string;
}) {
  const length =
    extent === "read" && article.readMinutes
      ? `${article.readMinutes} min read`
      : extent === "photos" && article.photoCount && article.photoCount > 1
        ? `${article.photoCount} photos`
        : null;
  return (
    <p className={`font-meta text-[12px] font-medium uppercase leading-[1.5] tracking-[0.04em] text-accent ${className}`}>
      <SportsByline article={article} linkClassName="transition-colors hover:text-text-main" />
      {length && (
        <>
          <span aria-hidden="true" className="mx-1.5 text-text-muted">·</span>
          <span className="whitespace-nowrap text-text-muted">{length}</span>
        </>
      )}
    </p>
  );
}

/** A story's photo, filling its box from the photo's focal point */
function StoryPhoto({
  article,
  sizes,
  priority = false,
  src,
}: {
  article: FeaturesStory;
  sizes: string;
  priority?: boolean;
  src?: string | null;
}) {
  const image = src || article.imageFull || article.image;
  if (!image) return null;
  return (
    <Image
      src={image}
      alt={article.imageTitle || article.title}
      fill
      priority={priority}
      sizes={sizes}
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      style={{ objectPosition: src ? undefined : article.imageFocus || undefined }}
    />
  );
}

/* ── Cover: the photo across the page, the title box over its foot ── */

function Cover({ article }: { article: FeaturesStory }) {
  const href = getArticleUrl(article);
  const hasPhoto = Boolean(article.imageFull || article.image);
  return (
    <article className="group relative">
      {hasPhoto && (
        // Portrait on phones, so a photo-led story fills the first screen
        <TransitionLink
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative -mx-4 block aspect-[4/5] overflow-hidden bg-rule sm:mx-0 sm:aspect-[16/9] lg:aspect-[2.35/1]"
        >
          <StoryPhoto article={article} priority sizes="(max-width: 1280px) 100vw, 1220px" />
        </TransitionLink>
      )}
      <div
        className={`relative z-10 pt-4 sm:pt-5 ${hasPhoto ? "lg:-mt-28 lg:w-[58%] lg:bg-bg-main lg:pr-10 lg:pt-6" : "lg:w-[72%]"}`}
      >
        <Kicker article={article} className="mb-2.5" />
        <h2 className="font-copy text-[34px] font-light leading-[1.06] tracking-[-0.015em] text-text-main text-balance sm:text-[44px] lg:text-[54px] lg:leading-[1.04]">
          <TransitionLink href={href} className="transition-colors group-hover:text-accent">
            {article.richTitle ?? article.title}
          </TransitionLink>
        </h2>
        {article.excerpt && (
          <p className="mt-3 max-w-[40em] font-copy text-[18px] leading-[1.4] text-text-muted sm:text-[20px] lg:mt-4 lg:text-[21px]">
            {article.excerpt}
          </p>
        )}
        <Byline article={article} className="mt-3 lg:mt-4" />
      </div>
    </article>
  );
}

/* ── Second story: a portrait photo beside its text ── */

function SecondStory({ article }: { article: FeaturesStory }) {
  const href = getArticleUrl(article);
  const hasPhoto = Boolean(article.imageFull || article.image);
  return (
    <article className="group relative flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:gap-7">
      {hasPhoto && (
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-rule md:aspect-[4/5]">
          <StoryPhoto article={article} sizes="(max-width: 768px) 100vw, 380px" />
        </div>
      )}
      <div className={`min-w-0 ${hasPhoto ? "" : "md:col-span-2"}`}>
        <Kicker article={article} className="mb-2" />
        <h2 className="font-copy text-[28px] font-light leading-[1.08] text-text-main text-balance sm:text-[32px] lg:text-[34px]">
          {/* Stretched over the card so the whole card opens the story */}
          <TransitionLink href={href} className="transition-colors after:absolute after:inset-0 group-hover:text-accent">
            {article.richTitle ?? article.title}
          </TransitionLink>
        </h2>
        {article.excerpt && (
          <p className="mt-3 font-copy text-[17px] leading-[1.4] text-text-muted lg:text-[19px]">{article.excerpt}</p>
        )}
        <Byline article={article} className="mt-3" />
      </div>
    </article>
  );
}

/* ── The Lens: one photo, its photographer named like an author ── */

function Lens({ lens }: { lens: FeaturesLens }) {
  const { photo } = lens;
  const photoEl = (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-rule lg:aspect-[4/5]">
      <Image
        src={photo.url}
        alt={photo.caption || photo.articleTitle || "Photo of the day"}
        fill
        sizes="(max-width: 1024px) 100vw, 400px"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
      />
    </div>
  );
  return (
    <section aria-labelledby="features-lens">
      <SportsHeading id="features-lens">The Lens</SportsHeading>
      <figure className="group m-0">
        {photo.articleUrl ? (
          <TransitionLink href={photo.articleUrl} tabIndex={-1} aria-hidden="true" className="block">
            {photoEl}
          </TransitionLink>
        ) : (
          photoEl
        )}
        <figcaption className="mt-3">
          {photo.photographerName && (
            <p className="font-copy text-[22px] font-light leading-[1.15] text-text-main">
              <span className="mr-2 align-[2px] font-meta text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                Photo by
              </span>
              {photo.photographerUrl ? (
                <TransitionLink href={photo.photographerUrl} className="transition-colors hover:text-accent">
                  {photo.photographerName}
                </TransitionLink>
              ) : (
                photo.photographerName
              )}
            </p>
          )}
          {photo.caption && (
            <p className="mt-1.5 font-copy text-[16px] leading-[1.4] text-text-muted line-clamp-4">{photo.caption}</p>
          )}
          {photo.articleTitle && photo.articleUrl && (
            <p className="mt-2 font-meta text-[12px] uppercase leading-[1.45] tracking-[0.04em] text-text-muted">
              From{" "}
              <TransitionLink href={photo.articleUrl} className="text-accent transition-colors hover:text-text-main">
                {photo.articleTitle}
              </TransitionLink>
            </p>
          )}
        </figcaption>
      </figure>
    </section>
  );
}

/* ── Strips: headline and dek beside a photo, the width of the page ── */

function Strip({ article }: { article: FeaturesStory }) {
  const hasPhoto = Boolean(article.imageFull || article.image);
  return (
    <article
      className={`group relative grid items-start gap-4 border-t border-rule py-5 sm:items-center sm:gap-7 lg:py-6 ${
        hasPhoto ? "grid-cols-[minmax(0,1fr)_104px] sm:grid-cols-[minmax(0,1fr)_minmax(0,28%)]" : "grid-cols-1"
      }`}
    >
      <div className="min-w-0">
        <Kicker article={article} className="mb-1.5" />
        <h3 className="font-copy text-[21px] font-light leading-[1.12] text-text-main sm:text-[26px] lg:text-[28px]">
          <TransitionLink
            href={getArticleUrl(article)}
            className="transition-colors after:absolute after:inset-0 group-hover:text-accent"
          >
            {article.richTitle ?? article.title}
          </TransitionLink>
        </h3>
        {article.excerpt && (
          <p className="mt-2 hidden font-copy text-[17px] leading-[1.4] text-text-muted line-clamp-3 sm:block lg:text-[18px]">
            {article.excerpt}
          </p>
        )}
        <Byline article={article} className="mt-2" />
      </div>
      {hasPhoto && (
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-rule sm:aspect-[3/2]">
          <StoryPhoto article={article} sizes="(max-width: 640px) 104px, 360px" />
        </div>
      )}
    </article>
  );
}

/* ── Photo Stories ── */

function PhotoStoryCard({ article }: { article: FeaturesStory }) {
  return (
    <article className="group relative">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-rule">
        <StoryPhoto article={article} src={article.cardImage} sizes="(max-width: 640px) 100vw, 400px" />
      </div>
      {/* "Photo Short Story" would only repeat the row's heading */}
      <h3 className="mt-3 font-copy text-[21px] leading-[1.15] text-text-main lg:text-[22px]">
        <TransitionLink
          href={getArticleUrl(article)}
          className="transition-colors after:absolute after:inset-0 group-hover:text-accent"
        >
          {article.richTitle ?? article.title}
        </TransitionLink>
      </h3>
      <Byline article={article} extent="photos" className="mt-2" />
    </article>
  );
}

/* ── Page ── */

export default function FeaturesSectionPage({
  title,
  cover,
  second,
  strips,
  photoStories,
  archive,
  lens,
}: FeaturesPageData & { title: string }) {
  const hasRow = Boolean(second || lens);
  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-5 md:px-6 xl:px-[30px]">
      {/* The masthead marks the section on desktop and News shows no title
          on phones either, so the title is for screen readers and search */}
      <h1 className="sr-only">{title}</h1>

      {cover && <Cover article={cover} />}

      {hasRow && (
        <div className="mt-12 flex flex-col gap-12 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-0">
          {second && (
            <div className={lens ? "lg:pr-7" : "lg:col-span-2"}>
              <SecondStory article={second} />
            </div>
          )}
          {lens && (
            <div className={second ? "lg:border-l lg:border-rule lg:pl-7" : "lg:col-start-2"}>
              <Lens lens={lens} />
            </div>
          )}
        </div>
      )}

      {strips.length > 0 && (
        <section aria-label="More stories" className="mt-10 border-b border-rule lg:mt-12">
          {strips.map((article) => (
            <Strip key={article.id} article={article} />
          ))}
        </section>
      )}

      {photoStories.length > 0 && (
        <section aria-labelledby="features-photo-stories" className="mt-12 lg:mt-14">
          <SportsHeading id="features-photo-stories">Photo Stories</SportsHeading>
          <div className="flex flex-col gap-10 sm:grid sm:grid-cols-3 sm:gap-6">
            {photoStories.map((article) => (
              <PhotoStoryCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {archive.length > 0 && (
        <div className="mt-8 lg:mt-10">
          <SportsFeatured
            articles={archive}
            heading="From the Archive"
            headingId="features-archive-heading"
            allHref="/features/archive"
            allLabel="View all in Features"
          />
        </div>
      )}

      {/* Search, archive and contact, where News has them */}
      <SectionSearchPrompt
        section="features"
        name="Features"
        archiveHref="/features/archive"
        contactHref={FEATURES_CONTACT_MAILTO}
      />
    </div>
  );
}
