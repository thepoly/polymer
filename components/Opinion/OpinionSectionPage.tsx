"use client";
import { fillOpinionSlots } from '@/lib/opinionLayout';

import React, { useMemo } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { opinionTypeLabels } from "./opinionTypeLabels";
import AuthorSpotlightCarousel, {
  type SpotlightAuthor,
} from "./AuthorSpotlightCarousel";
import EditorsChoice from "./EditorsChoice";
import { opinionGroups } from "./opinionGroups";
import RainbowDivider from "./RainbowDivider";
import SectionSearchPrompt from "@/components/SectionSearchPrompt";
import { ChevronRight } from "lucide-react";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { shortDate } from "@/utils/articleDates";
import PhotoPitch from "@/components/PhotoPitch";
import type { PitchPhoto } from "@/lib/pitchPhoto";

/**
 * "Nov 14, 2026" on every card: an opinion piece answers a moment, and the page
 * keeps pieces for months, so readers need to know when each was written.
 * Editor's Choice and the author carousel are curated picks and stay undated.
 */
const opinionDate = (article: ComponentArticle) => shortDate(article.publishedDate || article.isoDate);

/* ── Article card — optionally shows image ── */

/**
 * The opinion type above every headline ("Staff Editorial", "Column"): the
 * Features kicker (12px, semibold, wide tracking), so the red labels mark the
 * page without shouting over the headlines
 */
const kickerClass = "block font-meta text-[12px] font-semibold uppercase tracking-[0.12em] text-accent dark:text-[#d96b76]";

/**
 * A hairline between consecutive stories in a run, so a page of text-only
 * cards still reads as separate pieces (as in the Features rail). Tablets set
 * stories in two flowing columns, where a rule could land at a column's top,
 * so they keep plain space instead.
 */
const STACK_RULE =
  "[[data-opinion-card]+&]:border-t [[data-opinion-card]+&]:border-rule [[data-opinion-card]+&]:pt-6 md:max-lg:[[data-opinion-card]+&]:border-t-0 md:max-lg:[[data-opinion-card]+&]:pt-0";

function OpinionCard({
  article,
  withImage = false,
  priority = false,
  lead = false,
}: {
  article: ComponentArticle;
  withImage?: boolean;
  priority?: boolean;
  /** The page's first story: a larger headline and full summary, so the page has an entry point with or without a photo */
  lead?: boolean;
}) {
  const typeLabel =
    opinionTypeLabels[article.opinionType || "opinion"] || "Opinion";

  return (
    <TransitionLink
      href={getArticleUrl(article)}
      data-opinion-card=""
      className={`group block mb-6 break-inside-avoid md:max-lg:mb-8 ${lead ? "md:max-lg:mb-10" : ""} ${STACK_RULE}`}
    >
      {withImage && article.image && (
        <div className="relative overflow-hidden mb-3 -mx-4 w-auto bg-rule sm:mx-0 sm:w-full" style={{ aspectRatio: "3/2" }}>
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            sizes={lead ? "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 33vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            priority={priority}
          />
        </div>
      )}
      <span className={`${kickerClass} mb-1.5`}>{typeLabel}</span>
      {lead ? (
        <h3 className="text-balance font-copy text-[30px] font-normal leading-[1.08] tracking-[-0.015em] text-text-main transition-colors group-hover:text-accent md:text-[36px] lg:text-[38px]">
          {article.richTitle || article.title}
        </h3>
      ) : (
        <h3 className="font-copy text-[23px] font-normal leading-[1.14] text-text-main transition-colors group-hover:text-accent lg:text-[24px]">
          {article.richTitle || article.title}
        </h3>
      )}
      {/* Byline: muted "By", names in ink (red is the type label above) */}
      <Byline authors={article.authorLinks} date={opinionDate(article)} size="md" margin="mt-2" />
      {/* Summary in muted serif, as on News and Features */}
      {article.excerpt && (
        <p className={`mt-1.5 font-copy leading-[1.45] text-text-muted ${lead ? "text-[17px] md:text-[18px]" : "text-[16px] line-clamp-3 lg:text-[17px]"}`}>
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/**
 * "Have an opinion? Submit an op-ed →", linking to the
 * submission form: the Features pitch box (components/PhotoPitch) on a pinned
 * photo the editor picks and places per screen in the Opinion Layout editor.
 * Column 1 after its third slot on computers; after the fifth story on
 * phones and tablets.
 */
function GuestWriterPitch({ photo }: { photo: PitchPhoto | null }) {
  return (
    <PhotoPitch
      href="/submit"
      question="Have an opinion?"
      action="Submit an op-ed"
      size="large"
      photo={photo}
      className="min-h-[150px] flex-1"
      plainClassName="border-y border-rule py-4"
    />
  );
}

const OPINION_CONTACT_MAILTO = "mailto:edop@poly.rpi.edu";
/** Stories in each category group under the columns: one with its photo, three listed */
const GROUP_STORIES = 4;

/**
 * A category group under the columns (Editorials, Opinions, Other): its
 * title, linking to the full list, over a rule (as on Features); the newest
 * story with its photo, then the next ones listed with small photos. Tablets
 * put the first story beside the list. `inset` adds the left padding the
 * second and third columns need beside the rules on computers.
 */
function OpinionGroup({
  id,
  label,
  href,
  stories,
  className = "",
  inset = false,
}: {
  id: string;
  label: string;
  href: string;
  stories: ComponentArticle[];
  className?: string;
  inset?: boolean;
}) {
  const [lead, ...rest] = stories;
  const typeOf = (a: ComponentArticle) => opinionTypeLabels[a.opinionType || "opinion"] || "Opinion";
  return (
    <section aria-labelledby={id} className={`min-w-0 ${inset ? "lg:pl-6" : ""} ${className}`}>
      <div className="border-b-2 border-rule-strong pb-1.5">
        <h2 className="font-meta text-[22px] uppercase tracking-[0.04em] text-text-main md:text-[26px]" style={{ fontWeight: 500 }}>
          <TransitionLink href={href} className="group inline-flex items-center gap-1.5 transition-colors hover:text-accent">
            <span id={id}>{label}</span>
            <ChevronRight aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-text-muted transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent md:h-6 md:w-6" />
          </TransitionLink>
        </h2>
      </div>
      <div className="mt-4 md:grid md:grid-cols-2 md:gap-x-6 lg:block">
        <TransitionLink href={getArticleUrl(lead)} className="group block">
          {lead.image && (
            <div className="relative mb-3 aspect-[3/2] overflow-hidden bg-rule">
              <Image src={lead.image} alt={lead.imageTitle || ""} fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 400px" className="object-cover" />
            </div>
          )}
          <span className={`${kickerClass} mb-1.5`}>{typeOf(lead)}</span>
          <h3 className="font-copy text-[23px] font-normal leading-[1.12] text-text-main transition-colors group-hover:text-accent md:text-[24px]">
            {lead.richTitle || lead.title}
          </h3>
          <Byline authors={lead.authorLinks} date={opinionDate(lead)} size="md" margin="mt-2" />
        </TransitionLink>
        {rest.length > 0 && (
          <ul className="mt-4 md:mt-0 lg:mt-4">
            {rest.map((a) => (
              <li key={a.id} className="border-t border-rule py-4 md:first:border-t-0 md:first:pt-0 lg:first:border-t lg:first:pt-4">
                <TransitionLink href={getArticleUrl(a)} className="group flex flex-row-reverse items-start gap-4">
                  {a.image && (
                    <div className="relative aspect-[3/2] w-[112px] shrink-0 overflow-hidden bg-rule">
                      <Image src={a.image} alt={a.imageTitle || ""} fill sizes="112px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className={`${kickerClass} mb-1`}>{typeOf(a)}</span>
                    <h3 className="line-clamp-3 font-copy text-[19px] font-normal leading-[1.18] text-text-main transition-colors group-hover:text-accent">
                      {a.richTitle || a.title}
                    </h3>
                    <Byline authors={a.authorLinks} date={opinionDate(a)} size="sm" margin="mt-1.5" />
                  </div>
                </TransitionLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Tablets set a run of stories in two columns that fill top to bottom, so a
 * story with a photo beside one without leaves no hole; phones and computers
 * ignore it
 */
const TABLET_PAIRS = "md:columns-2 md:gap-x-6";

/* ── Main Page ── */

export default function OpinionSectionPage({
  title,
  articles,
  spotlightAuthors,
  pinnedCol1,
  pinnedCol2,
  pinnedCol3,
  col1Images = [true, false, false, false, false],
  col2Images = [false, false, true, false],
  col3Images = [false, false, false, true],
  editorsChoiceArticles,
  editorsChoiceLabel,
  groupedArticles,
  pinnedSpotlightAuthors,
  guestPitch = null,
}: {
  title: string;
  articles: ComponentArticle[];
  spotlightAuthors: SpotlightAuthor[];
  pinnedCol1: (ComponentArticle | null)[];
  pinnedCol2: (ComponentArticle | null)[];
  pinnedCol3: (ComponentArticle | null)[];
  col1Images?: boolean[];
  col2Images?: boolean[];
  col3Images?: boolean[];
  editorsChoiceArticles: ComponentArticle[];
  editorsChoiceLabel: string;
  groupedArticles: Record<string, ComponentArticle[]>;
  pinnedSpotlightAuthors?: SpotlightAuthor[];
  /** The photo behind the guest-writer box (the editor's pick, else the newest opinion photo) */
  guestPitch?: PitchPhoto | null;
}) {
  const [col1, col2, col3] = useMemo(() => {
    const pad = (pins: (ComponentArticle | null)[], count: number) =>
      Array.from({ length: Math.max(count, pins.length) }, (_, i) => pins[i] || null);
    return fillOpinionSlots([
      pad(pinnedCol1, Math.max(5, col1Images.length)),
      pad(pinnedCol2, Math.max(4, col2Images.length)),
      pad(pinnedCol3, Math.max(4, col3Images.length)),
    ], articles, editorsChoiceArticles);
  }, [pinnedCol1, pinnedCol2, pinnedCol3, col1Images.length, col2Images.length, col3Images.length, articles, editorsChoiceArticles]);

  const hasSpotlightAuthors =
    spotlightAuthors.length > 0 ||
    Boolean(pinnedSpotlightAuthors && pinnedSpotlightAuthors.length > 0);

  const mobileOrderedArticles = [col1, col2, col3].flatMap((column, columnIndex) =>
    column.flatMap((article, slot) => article ? [{ article, withImage: [col1Images, col2Images, col3Images][columnIndex][slot] ?? false }] : []),
  );

  // Each story once on the page: the groups skip what the columns and
  // Opinion's Choice already show, and keep the newest four left
  const shownIds = new Set(
    [...col1, ...col2, ...col3, ...editorsChoiceArticles].flatMap((a) => (a ? [String(a.id)] : [])),
  );
  const groups = Object.entries(opinionGroups)
    .map(([key, group]) => ({
      key,
      label: group.label,
      href: `/opinion/${group.slug}`,
      stories: (groupedArticles[key] || []).filter((a) => !shownIds.has(String(a.id))).slice(0, GROUP_STORIES),
    }))
    .filter((g) => g.stories.length > 0);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 pb-8 md:px-6 xl:px-[30px]">
      {/* No visible title: the header's section nav already says Opinion */}
      <h1 className="sr-only">{title}</h1>

      {/* Phones: one column. Tablets (768–1023px): the same order, stories two
          across, the guest-writer box beside Opinion's Choice. */}
      <div className="lg:hidden">
        {/* The lead across the page; on tablets the next story sits beside
            the author carousel, so neither is left alone on its row */}
        {mobileOrderedArticles[0] && (
          <OpinionCard
            article={mobileOrderedArticles[0].article}
            withImage={mobileOrderedArticles[0].withImage}
            priority={mobileOrderedArticles[0].withImage}
            lead
          />
        )}

        <div className={`md:mb-8 md:grid md:grid-cols-2 md:items-center md:gap-x-6 ${mobileOrderedArticles.length > 1 ? "border-t border-rule pt-6 md:border-t-0 md:pt-0" : ""}`}>
          {mobileOrderedArticles.slice(1, 2).map(({ article, withImage }) => (
            <OpinionCard key={`mobile-top-${article.id}`} article={article} withImage={withImage} />
          ))}
          {hasSpotlightAuthors && (
            <div className="mb-10 md:mb-0">
              <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
            </div>
          )}
        </div>

        <div className={TABLET_PAIRS}>
          {mobileOrderedArticles.slice(2, 6).map(({ article, withImage }) => (
            <OpinionCard key={`mobile-middle-${article.id}`} article={article} withImage={withImage} />
          ))}
        </div>

        <div className="mb-8 md:grid md:grid-cols-2 md:items-start md:gap-x-6">
          <div className="mb-6 flex md:mb-0 md:self-stretch">
            <div className="flex w-full flex-col">
              <GuestWriterPitch photo={guestPitch} />
            </div>
          </div>
          {editorsChoiceArticles.length > 0 && (
            <EditorsChoice
              articles={editorsChoiceArticles}
              label={editorsChoiceLabel}
            />
          )}
        </div>

        <div className={TABLET_PAIRS}>
          {mobileOrderedArticles.slice(6).map(({ article, withImage }) => (
            <OpinionCard key={`mobile-rest-${article.id}`} article={article} withImage={withImage} />
          ))}
        </div>
      </div>

      {/* 3-column grid — inline styles to guarantee layout */}
      <div
        className="hidden lg:grid lg:grid-cols-3"
        style={{
          columnGap: 24,
        }}
      >
        {/* ── Col 1: first 3 slots, CTA, remaining slots ── */}
        <div className="lg:border-r lg:border-rule lg:pr-6">
          {col1.slice(0, 3).map((article, i) => (
            article && <OpinionCard key={`col1-${article.id}`} article={article} withImage={col1Images[i] ?? false} priority={i === 0 && (col1Images[0] ?? true)} lead={i === 0} />
          ))}

          <div style={{ marginBottom: 30 }}>
            <GuestWriterPitch photo={guestPitch} />
          </div>

          {col1.slice(3).map((article, i) => (
            article && <OpinionCard key={`col1-after-${article.id}`} article={article} withImage={col1Images[i + 3] ?? false} />
          ))}
        </div>

        {/* ── Col 2: first slot, carousel, remaining slots ── */}
        <div className="lg:border-r lg:border-rule lg:pr-6">
          {col2[0] && <OpinionCard article={col2[0]} withImage={col2Images[0] ?? false} />}

          {hasSpotlightAuthors && (
            <div className="hidden lg:block">
              <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
            </div>
          )}

          {col2.slice(1).map((article, i) => (
            article && <OpinionCard key={`col2-${article.id}`} article={article} withImage={col2Images[i + 1] ?? false} />
          ))}
        </div>

        {/* ── Col 3: editors choice, then all slots ── */}
        <div>
          {editorsChoiceArticles.length > 0 && (
            <div className="mb-8">
              <EditorsChoice
                articles={editorsChoiceArticles}
                label={editorsChoiceLabel}
              />
            </div>
          )}

          {col3.map((article, i) => (
            article && <OpinionCard key={`col3-${article.id}`} article={article} withImage={col3Images[i] ?? false} />
          ))}
        </div>
      </div>

      {groups.length > 0 && (
        <>
          <RainbowDivider />

          {/* The three category groups, side by side on computers, one under
              another below that; each title links to its full list */}
          <div className="mt-10 grid grid-cols-1 gap-y-12 lg:mt-12 lg:grid-cols-3 lg:gap-x-0">
            {groups.map(({ key, label, href, stories }, i) => (
              <OpinionGroup
                key={key}
                id={`opinion-group-${key}`}
                label={label}
                href={href}
                stories={stories}
                className={i < groups.length - 1 ? "lg:border-r lg:border-rule lg:pr-6" : ""}
                inset={i > 0}
              />
            ))}
          </div>
        </>
      )}

      <SectionSearchPrompt
        section="opinion"
        name="Opinion"
        question="Looking for an article"
        contactHref={OPINION_CONTACT_MAILTO}
        spacing="mt-12 md:mt-14 lg:mt-16"
        headingSize="text-[26px] md:text-[34px] lg:text-[clamp(26px,2.6vw,32px)]"
      />
    </div>
  );
}
