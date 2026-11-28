"use client";
import { SUMMARY_CLASS } from "@/components/summaryClass";
import { inSnakeOrder, OPINION_COLUMN_SLOTS, planOpinionColumns } from '@/lib/opinionLayout';

import React, { useMemo } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { opinionTypeLabels } from "./opinionTypeLabels";
import AuthorSpotlightCarousel from "./AuthorSpotlightCarousel";
import type { SpotlightAuthor } from "./spotlight";
import EditorsChoice from "./EditorsChoice";
import type { ChoiceStyle } from "@/lib/opinionLayout";
import { opinionGroups, pickGroupStories } from "./opinionGroups";
import BalanceColumns from "@/components/BalanceColumns";
import TabletOpinionColumns from "./TabletOpinionColumns";
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

function OpinionCard({ article, withImage = false, priority = false, balance = false, spacing = "mb-8" }: { article: ComponentArticle; withImage?: boolean; priority?: boolean; balance?: boolean; spacing?: string }) {
  const typeLabel =
    opinionTypeLabels[article.opinionType || "opinion"] || "Opinion";

  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className={`group block ${spacing} break-inside-avoid`}
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
      {/* Summary: the site-wide summary style (components/summaryClass) */}
      {article.excerpt && (
        <p className={`mt-1 ${SUMMARY_CLASS} text-[15px] leading-[1.5] line-clamp-4`} {...(balance ? { "data-balance-trim": "" } : {})}>
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
 * Column 1 after its second story on computers. Phones: after the fourth
 * story. Tablets place it themselves (TabletOpinionColumns).
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
/** Stories listed under each category group's lead (pickGroupStories) */
const GROUP_LISTED = 2;
/** Tablets list more beside the lead, which sits next to the list there (the last only if it fits better) */
const GROUP_LISTED_TABLET = 4;
/** Tablets only (768–1023px), where a group's lead sits beside its list */
const TABLET_ONLY = "(min-width: 768px) and (max-width: 1023.98px)";

const kickerClass = "block font-meta font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76]";

/**
 * A category group under the columns (Editorials, Opinions, Other): its
 * title, linking to the full list, over a rule (as on Features); its lead,
 * the newest story with a photo, shown with it; then the two newest of the
 * rest, listed without photos (pickGroupStories), so the lead can be older
 * than the stories under it. Tablets put the lead beside the list and list
 * four.
 */
function OpinionGroup({
  id,
  label,
  href,
  lead,
  rest,
  className = "",
}: {
  id: string;
  label: string;
  href: string;
  lead: ComponentArticle;
  rest: ComponentArticle[];
  className?: string;
}) {
  const typeOf = (a: ComponentArticle) => opinionTypeLabels[a.opinionType || "opinion"] || "Opinion";
  return (
    <section aria-labelledby={id} className={`min-w-0 ${className}`}>
      <div className="border-b-2 border-rule-strong pb-1.5">
        <h2 className="font-meta text-[22px] uppercase tracking-[0.04em] text-text-main md:text-[26px]" style={{ fontWeight: 500 }}>
          <TransitionLink href={href} className="group inline-flex items-center gap-1.5 transition-colors hover:text-accent">
            <span id={id}>{label}</span>
            <ChevronRight aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-text-muted transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent md:h-6 md:w-6" />
          </TransitionLink>
        </h2>
      </div>
      {/* Tablets: the list beside the lead shows three or four stories,
          whichever ends nearer the lead's byline (BalanceColumns' "reach"
          option, with no photo or type changes: the gaps are compared as they
          stand, so the fourth shows only if that leaves less blank space) */}
      <BalanceColumns when={TABLET_ONLY} feather={0} className="mt-4 md:grid md:grid-cols-2 md:gap-x-6 lg:block">
        <TransitionLink href={getArticleUrl(lead)} className="group block" data-balance-col suppressHydrationWarning>
          {lead.image && (
            <div className="relative -mx-4 mb-3 aspect-[3/2] overflow-hidden bg-rule sm:mx-0">
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
          <ul className="mt-4 md:mt-0 lg:mt-4" data-balance-col suppressHydrationWarning>
            {rest.map((a, i) => (
              <li
                key={a.id}
                // Past GROUP_LISTED, tablets only; the last of those only when
                // it brings the list nearer the lead's end. Phones and tablets
                // space the items with a top margin rather than bottom
                // padding, so the list ends at its last byline: tablets
                // measure it against the lead's byline fairly, and phones
                // keep the groups close together.
                className={`mt-4 border-t border-rule pt-4 first:mt-0 md:first:border-t-0 md:first:pt-0 lg:mt-0 lg:pb-4 lg:first:border-t lg:first:pt-4 ${i >= GROUP_LISTED ? "hidden md:block lg:hidden" : ""}`}
                {...(i === GROUP_LISTED_TABLET - 1 ? { "data-balance-opt": "reach" } : {})}
                suppressHydrationWarning
              >
                <TransitionLink href={getArticleUrl(a)} className="group block">
                  <span className={`${kickerClass} mb-1 text-[13px]`}>{typeOf(a)}</span>
                  <h3 className="line-clamp-3 font-copy text-[20px] font-medium leading-[1.15] text-text-main transition-colors group-hover:text-accent">
                    {a.richTitle || a.title}
                  </h3>
                  <Byline authors={a.authorLinks} date={opinionDate(a)} size="sm" margin="mt-1.5" />
                </TransitionLink>
              </li>
            ))}
          </ul>
        )}
      </BalanceColumns>
    </section>
  );
}

/** On computers the op-ed box follows column 1's second story, and the author spotlight column 2's first */
const PITCH_AFTER = 2;
const SPOTLIGHT_AFTER = 1;

/**
 * The op-ed box on tablets may be set between 2.4:1 and 1.4:1 (about 155 to
 * 265px tall) to help square the columns off; its photo is cropped to fit
 */
const TABLET_PITCH = "2.4,1.4";

/**
 * A computer column: its last item drops its bottom margin, so the column
 * (and the rule beside it) ends where its content does, and the groups below
 * sit a set distance under all three
 */
const COLUMN_END = "flex flex-col [&>*:last-child]:mb-0";

/**
 * Computers: the story columns and the groups under them share one grid,
 * three equal columns with 48px gutters, so every column is the same width
 * and the rules line up from top to bottom. A column's rule is drawn down the
 * middle of the gutter after it (not as its border, which would leave the
 * columns unequal: the last has no rule or padding beside it).
 */
const OPINION_GRID = "lg:grid lg:grid-cols-3 lg:gap-x-12";
const RULE_AFTER = "lg:relative lg:after:absolute lg:after:inset-y-0 lg:after:-right-6 lg:after:w-px lg:after:bg-rule";

/* ── Main Page ── */

export default function OpinionSectionPage({
  title,
  articles,
  spotlightAuthors,
  pinnedCol1,
  pinnedCol2,
  pinnedCol3,
  col1Images = [true, false],
  col2Images = [false, true],
  col3Images = [false, true],
  editorsChoiceArticles,
  editorsChoiceLabel,
  editorsChoiceStyle = "keyline",
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
  /** How Opinion's Choice is set off, picked in the Opinion Layout editor */
  editorsChoiceStyle?: ChoiceStyle;
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
  // Opinion's Choice already show, and pick a lead and two more from the rest
  const shownIds = new Set(
    [...col1, ...col2, ...col3, ...editorsChoiceArticles].flatMap((a) => (a ? [String(a.id)] : [])),
  );
  const groups = Object.entries(opinionGroups)
    .map(([key, group]) => ({
      key,
      label: group.label,
      href: `/opinion/${group.slug}`,
      ...pickGroupStories((groupedArticles[key] || []).filter((a) => !shownIds.has(String(a.id))), GROUP_LISTED_TABLET),
    }))
    .flatMap(({ lead, ...group }) => (lead ? [{ ...group, lead }] : []));

  return (
    // Phones: the header adds no space under its date rule here, so the
    // first story starts 28px below it, the rule's own height (as on News)
    <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-7 md:px-6 md:pt-5 xl:px-[30px]">
      {/* No visible title: the header's section nav already says Opinion */}
      <h1 className="sr-only">{title}</h1>

      {/* Phones: one column, the author spotlight after the second story */}
      <div className="md:hidden">
        <div>
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

        <div>
          {mobileOrderedArticles.slice(2, 4).map(({ article, withImage }) => (
            <OpinionCard key={`mobile-middle-${article.id}`} article={article} withImage={withImage} />
          ))}
        </div>

        <div className="mb-8">
          {/* Edge to edge, past the page's margins */}
          <div className="mb-6 flex mx-[calc(50%_-_50vw)]">
            <div className="flex w-full flex-col">
              <GuestWriterPitch photo={guestPitch} />
            </div>
          </div>
          {editorsChoiceArticles.length > 0 && (
            <EditorsChoice
              articles={editorsChoiceArticles}
              label={editorsChoiceLabel}
              style={editorsChoiceStyle}
            />
          )}
        </div>

        <div>
          {mobileOrderedArticles.slice(4).map(({ article, withImage }) => (
            <OpinionCard key={`mobile-rest-${article.id}`} article={article} withImage={withImage} />
          ))}
        </div>
      </div>

      {/* Tablets (768–1023px): two columns, no author spotlight. The stories
          (newest first, the first at top left), the op-ed box and Opinion's
          Choice are placed so the columns end together, with no two photos
          and no two boxes side by side (TabletOpinionColumns) */}
      <div className="hidden md:block lg:hidden">
        <TabletOpinionColumns when={TABLET_ONLY} className="mb-8">
          {mobileOrderedArticles.map(({ article, withImage }, index) => (
            <div key={`tablet-${article.id}`} data-tc-item className="flow-root" suppressHydrationWarning>
              <OpinionCard article={article} withImage={withImage} priority={index === 0 && withImage} balance spacing="" />
            </div>
          ))}
          <div
            data-tc-item
            data-tc-fn
            data-balance-flex={TABLET_PITCH}
            className="flex flex-col"
            style={{ height: "var(--balance-h, auto)" }}
            suppressHydrationWarning
          >
            <PhotoPitch
              href="/submit"
              question="Have an opinion?"
              action="Submit an op-ed"
              size="large"
              photo={guestPitch}
              className="min-h-[150px] flex-1"
              plainClassName="flex-1 border-y border-rule py-4"
            />
          </div>
          {editorsChoiceArticles.length > 0 && (
            <div data-tc-item data-tc-fn className="flow-root" suppressHydrationWarning>
              <EditorsChoice articles={editorsChoiceArticles} label={editorsChoiceLabel} style={editorsChoiceStyle} />
            </div>
          )}
        </TabletOpinionColumns>
      </div>

      {/* 3-column grid — inline styles to guarantee layout */}
      {/* The three columns end on one line: BalanceColumns stretches or
          shrinks each column's photo (16:9 to 4:5), drops summaries from a
          column still far too long, and spreads small leftovers */}
      <BalanceColumns when="(min-width: 1024px)" className={`hidden ${OPINION_GRID}`}>
        {/* ── Col 1: the lead and second slot, the op-ed box, any added slots ── */}
        <div data-balance-col className={`${COLUMN_END} ${RULE_AFTER}`} suppressHydrationWarning>
          {col1.slice(0, PITCH_AFTER).map((article, i) => (
            article && <OpinionCard key={`col1-${article.id}`} article={article} withImage={col1Images[i] ?? false} priority={i === 0 && (col1Images[0] ?? true)} balance />
          ))}

          {/* A class, not an inline style, so COLUMN_END can drop it when the box ends the column */}
          <div className="mb-8">
            <GuestWriterPitch photo={guestPitch} />
          </div>

          {col1.slice(PITCH_AFTER).map((article, i) => (
            article && <OpinionCard key={`col1-after-${article.id}`} article={article} withImage={col1Images[i + PITCH_AFTER] ?? false} balance />
          ))}
        </div>

        {/* ── Col 2: first 2 slots, the author spotlight, remaining slots ── */}
        <div data-balance-col className={`${COLUMN_END} ${RULE_AFTER}`} suppressHydrationWarning>
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
        <div data-balance-col className={COLUMN_END} suppressHydrationWarning>
          {col3.map((article, i) => (
            article && <OpinionCard key={`col3-${article.id}`} article={article} withImage={col3Images[i] ?? false} balance />
          ))}

          {/* Opinion's Choice closes the column */}
          {editorsChoiceArticles.length > 0 && (
            <EditorsChoice articles={editorsChoiceArticles} label={editorsChoiceLabel} style={editorsChoiceStyle} />
          )}
        </div>
      </BalanceColumns>

      {groups.length > 0 && (
        <>
          {/* The three category groups, side by side on computers, one under
              another below that; each title links to its full list. White
              space, not a rule, sets them off from the columns: their titles
              carry rules of their own */}
          <div className={`mt-10 grid grid-cols-1 gap-y-6 lg:mt-8 lg:gap-y-12 ${OPINION_GRID}`}>
            {groups.map(({ key, label, href, lead, rest }, i) => (
              <OpinionGroup
                key={key}
                id={`opinion-group-${key}`}
                label={label}
                href={href}
                lead={lead}
                rest={rest}
                className={i < groups.length - 1 ? RULE_AFTER : ""}
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
        spacing="mt-7 md:mt-9"
        headingSize="text-[26px] md:text-[34px] lg:text-[clamp(26px,2.6vw,32px)]"
      />
    </div>
  );
}
