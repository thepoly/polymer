"use client";
import { inSnakeOrder, OPINION_COLUMN_SLOTS, planOpinionColumns } from '@/lib/opinionLayout';

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
import BalanceColumns from "@/components/BalanceColumns";
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
 * On computers (`balance`) the columns are squared off by BalanceColumns: the
 * card's photo may change shape between 16:9 and 4:5, at its focal point, and
 * its summary may be dropped from a column that's still far too long.
 */
const BALANCE_PHOTO = "1.7778,0.8";

function OpinionCard({ article, withImage = false, priority = false, balance = false }: { article: ComponentArticle; withImage?: boolean; priority?: boolean; balance?: boolean }) {
  const typeLabel =
    opinionTypeLabels[article.opinionType || "opinion"] || "Opinion";

  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className="group block mb-8 break-inside-avoid"
    >
      {withImage && article.image && (
        <div
          className="relative overflow-hidden mb-3 -mx-4 w-auto sm:mx-0 sm:w-full"
          style={{ aspectRatio: "3/2", ...(balance ? { height: "var(--balance-h, auto)" } : {}) }}
          {...(balance ? { "data-balance-flex": BALANCE_PHOTO } : {})}
          suppressHydrationWarning
        >
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        </div>
      )}
      {/* Opinion type — lighter weight, accent color, slightly bigger than byline */}
      <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
        {typeLabel}
      </span>
      {/* Title — largest, dominant */}
      <h3 className="font-copy font-medium leading-[1.12] text-[25px] sm:text-[28px] text-text-main transition-colors">
        {article.richTitle || article.title}
      </h3>
      {/* Byline: muted "By", names in ink (red is the type label above) */}
      <Byline authors={article.authorLinks} date={opinionDate(article)} size="md" margin="mt-2" />
      {/* Summary in muted serif, as on News and Features */}
      {article.excerpt && (
        <p className="mt-1 font-copy text-[17px] leading-[1.45] text-text-muted line-clamp-4" {...(balance ? { "data-balance-trim": "" } : {})}>
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
 * Column 1 after its lead on computers. Phones: after the sixth
 * story; tablets: beside Opinion's Choice.
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

const kickerClass = "block font-meta font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76]";

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
          <span className={`${kickerClass} mb-1.5 text-[15px]`}>{typeOf(lead)}</span>
          <h3 className="font-copy text-[24px] font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent md:text-[26px]">
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
                    <span className={`${kickerClass} mb-1 text-[13px]`}>{typeOf(a)}</span>
                    <h3 className="line-clamp-3 font-copy text-[20px] font-medium leading-[1.15] text-text-main transition-colors group-hover:text-accent">
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

/** On computers the op-ed box follows column 1's lead, and the author spotlight column 2's second story */
const PITCH_AFTER = 1;
const SPOTLIGHT_AFTER = 2;

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
  col1Images = [true, false, false],
  col2Images = [false, false, true],
  col3Images = [false, false, true],
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
    // The default: newest first along the snake (row by row, alternating),
    // photo slots taking stories with photos; pins stay where editors put them
    return planOpinionColumns([
      pad(pinnedCol1, Math.max(OPINION_COLUMN_SLOTS, col1Images.length)),
      pad(pinnedCol2, Math.max(OPINION_COLUMN_SLOTS, col2Images.length)),
      pad(pinnedCol3, Math.max(OPINION_COLUMN_SLOTS, col3Images.length)),
    ], articles, {
      excluded: editorsChoiceArticles,
      photos: [col1Images, col2Images, col3Images],
      hasPhoto: (a) => Boolean(a.image),
    });
  }, [pinnedCol1, pinnedCol2, pinnedCol3, col1Images, col2Images, col3Images, articles, editorsChoiceArticles]);

  const hasSpotlightAuthors =
    spotlightAuthors.length > 0 ||
    Boolean(pinnedSpotlightAuthors && pinnedSpotlightAuthors.length > 0);

  // Phones and tablets read the columns in snake order, so newest comes first
  const columnImages = [col1Images, col2Images, col3Images];
  const mobileOrderedArticles = inSnakeOrder([col1, col2, col3]).map(({ story, column, slot }) => ({
    article: story,
    withImage: columnImages[column][slot] ?? false,
  }));

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
        <div className={TABLET_PAIRS}>
          {mobileOrderedArticles.slice(0, 2).map(({ article, withImage }, index) => (
            <OpinionCard
              key={`mobile-top-${article.id}`}
              article={article}
              withImage={withImage}
              priority={index === 0 && withImage}
            />
          ))}
        </div>

        {hasSpotlightAuthors && (
          <div className="mb-10">
            <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
          </div>
        )}

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
      {/* The three columns end on one line: BalanceColumns stretches or
          shrinks each column's photo (16:9 to 4:5), drops summaries from a
          column still far too long, and spreads small leftovers */}
      <BalanceColumns when="(min-width: 1024px)" className="hidden lg:grid lg:grid-cols-3 lg:gap-x-6">
        {/* ── Col 1: the lead, the op-ed box, remaining slots ── */}
        <div data-balance-col className="flex flex-col lg:border-r lg:border-rule lg:pr-6" suppressHydrationWarning>
          {col1.slice(0, PITCH_AFTER).map((article, i) => (
            article && <OpinionCard key={`col1-${article.id}`} article={article} withImage={col1Images[i] ?? false} priority={i === 0 && (col1Images[0] ?? true)} balance />
          ))}

          <div style={{ marginBottom: 30 }}>
            <GuestWriterPitch photo={guestPitch} />
          </div>

          {col1.slice(PITCH_AFTER).map((article, i) => (
            article && <OpinionCard key={`col1-after-${article.id}`} article={article} withImage={col1Images[i + PITCH_AFTER] ?? false} balance />
          ))}
        </div>

        {/* ── Col 2: first 2 slots, the author spotlight, remaining slots ── */}
        <div data-balance-col className="flex flex-col lg:border-r lg:border-rule lg:pr-6" suppressHydrationWarning>
          {col2.slice(0, SPOTLIGHT_AFTER).map((article, i) => (
            article && <OpinionCard key={`col2-${article.id}`} article={article} withImage={col2Images[i] ?? false} balance />
          ))}

          {hasSpotlightAuthors && (
            <div className="hidden lg:block">
              <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
            </div>
          )}

          {col2.slice(SPOTLIGHT_AFTER).map((article, i) => (
            article && <OpinionCard key={`col2-after-${article.id}`} article={article} withImage={col2Images[i + SPOTLIGHT_AFTER] ?? false} balance />
          ))}
        </div>

        {/* ── Col 3: editors choice, then all slots ── */}
        <div data-balance-col className="flex flex-col" suppressHydrationWarning>
          {editorsChoiceArticles.length > 0 && (
            <div className="mb-3">
              <EditorsChoice
                articles={editorsChoiceArticles}
                label={editorsChoiceLabel}
              />
            </div>
          )}

          {col3.map((article, i) => (
            article && <OpinionCard key={`col3-${article.id}`} article={article} withImage={col3Images[i] ?? false} balance />
          ))}
        </div>
      </BalanceColumns>

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
