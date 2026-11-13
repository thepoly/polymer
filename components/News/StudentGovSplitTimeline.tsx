import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { Byline } from "@/components/FrontPage/Byline";
import StudentGovMonthPanel, { type PanelMonth } from "./StudentGovMonthPanel";
import StudentGovSplitFrame from "./StudentGovSplitFrame";
import {
  STUDENT_GOV,
  STUDENT_GOV_BODIES,
  monthSectionId,
  updateAnchor,
  type StudentGovBody,
  type TimelineItem,
} from "./studentGov";
import {
  HEADLINE_SIZES,
  IMAGE_SIDE_WIDTHS,
  IMAGE_TOP_HEIGHTS,
  entryKey,
  resolveStream,
  type ResolvedEntryLayout,
  type TimelineEntryLayout,
} from "./timelinePage";

/** One month of the stream, with what the left panel shows for it */
export type TimelineMonth = PanelMonth & {
  /** "November 2026" */
  label: string;
  items: TimelineItem[];
};

type ArticleItem = Extract<TimelineItem, { kind: "article" }>;
type UpdateItem = Extract<TimelineItem, { kind: "update" }>;
type Layout = ResolvedEntryLayout & { isLead: boolean };

/**
 * Width and position on desktop, from the entry's layout. Phones ignore both:
 * every card is full width and flush left.
 */
function placement(layout: Layout): React.CSSProperties {
  const width = layout.width === null ? "100%" : `${layout.width}px`;
  const shift = layout.width === null ? 0 : layout.position / 100;
  return {
    "--w": width,
    "--ml": `calc((100% - min(${width}, 100%)) * ${shift})`,
  } as React.CSSProperties;
}
const PLACEMENT_CLASS = "w-full min-[860px]:ml-[var(--ml)] min-[860px]:max-w-[var(--w)]";

/** Desktop headline size, scaled down on phones */
const headline = (px: number): React.CSSProperties => ({ fontSize: `clamp(21px, 6.2vw, ${px}px)` });

const kickerDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
    .toUpperCase();

function Kicker({ item }: { item: TimelineItem }) {
  return (
    <p
      className={`font-meta text-[11px] font-bold uppercase tracking-[0.12em] ${
        item.kind === "article" ? "text-accent" : "text-text-muted"
      }`}
    >
      <time dateTime={item.date}>{kickerDate(item.date)}</time>
      <span aria-hidden="true"> &middot; </span>
      {item.kind === "article" ? "Article" : "Update"}
    </p>
  );
}

const CARD = "border border-[#e7e1e1] bg-bg-main dark:border-[var(--rule-color)] dark:bg-white/[0.03]";

// Photo box per placement. Phones always show it on top, 180px tall.
const IMAGE_BOX: Record<"left" | "right" | "top", string> = {
  left: "h-[180px] w-full min-[860px]:h-auto min-[860px]:min-h-[var(--img-h)] min-[860px]:w-[var(--img-w)]",
  right: "h-[180px] w-full min-[860px]:h-auto min-[860px]:min-h-[var(--img-h)] min-[860px]:w-[var(--img-w)]",
  top: "h-[180px] w-full min-[860px]:h-[var(--img-h)]",
};
const CARD_DIRECTION: Record<"left" | "right" | "top" | "none", string> = {
  left: "min-[860px]:flex-row",
  right: "min-[860px]:flex-row-reverse",
  top: "",
  none: "",
};

function ArticleCard({ item, layout, priority }: { item: ArticleItem; layout: Layout; priority: boolean }) {
  const { article } = item;
  const { size, image } = layout;
  const big = size === "large" || size === "full";
  const imageVars = {
    "--img-w": `${IMAGE_SIDE_WIDTHS[size]}px`,
    "--img-h": `${image === "top" ? IMAGE_TOP_HEIGHTS[size] : IMAGE_SIDE_WIDTHS[size]}px`,
  } as React.CSSProperties;

  return (
    <TransitionLink
      href={getArticleUrl(article)}
      style={{ ...placement(layout), ...imageVars }}
      className={`group flex flex-col overflow-hidden ${CARD} ${CARD_DIRECTION[image]} ${PLACEMENT_CLASS}`}
    >
      {image !== "none" && article.image && (
        <div className={`relative shrink-0 overflow-hidden bg-[#1c1a1a] ${IMAGE_BOX[image]}`}>
          <Image
            src={big ? article.imageFull || article.image : article.image}
            alt={article.imageTitle || article.title}
            fill
            priority={priority}
            sizes={image === "top" ? "(min-width: 860px) 800px, 100vw" : `(min-width: 860px) ${IMAGE_SIDE_WIDTHS[size]}px, 100vw`}
            className="object-cover"
            style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
          />
        </div>
      )}
      <div className={`min-w-0 flex-1 ${big ? "p-5 min-[860px]:p-7" : "p-5"}`}>
        <Kicker item={item} />
        <h3
          className="mt-1.5 font-copy font-semibold leading-[1.1] text-text-main transition-colors group-hover:text-accent"
          style={headline(HEADLINE_SIZES.article[size])}
        >
          {article.richTitle || article.title}
        </h3>
        <Byline author={article.author} variant="features" className="mt-2 text-[12px]" />
        {article.excerpt && (
          <p
            className={`mt-2 font-meta leading-[1.5] text-text-main ${
              size === "small" ? "text-[14px]" : big ? "text-[17px]" : "text-[15px]"
            }`}
          >
            {article.excerpt}
          </p>
        )}
      </div>
    </TransitionLink>
  );
}

function UpdateCard({ item, layout }: { item: UpdateItem; layout: Layout }) {
  return (
    <article
      id={updateAnchor(item.id)}
      style={placement(layout)}
      className={`scroll-mt-6 bg-[#f6f1f1] dark:bg-white/[0.06] ${PLACEMENT_CLASS} ${
        layout.size === "large" || layout.size === "full" ? "p-6 min-[860px]:p-7" : "p-5"
      }`}
    >
      <Kicker item={item} />
      <h3
        className="mt-1.5 font-copy font-semibold leading-[1.2] text-text-main"
        style={headline(HEADLINE_SIZES.update[layout.size])}
      >
        {item.title}
      </h3>
      <p
        className={`mt-1.5 whitespace-pre-line font-meta leading-[1.55] text-text-muted ${
          layout.size === "large" || layout.size === "full" ? "text-[15px]" : "text-[14px]"
        }`}
      >
        {item.blurb}
      </p>
    </article>
  );
}

const PILL =
  "inline-flex h-11 items-center border border-text-main px-5 font-meta text-[12px] font-bold uppercase tracking-[0.1em] text-text-main transition-colors hover:border-accent hover:text-accent";

/**
 * Split-screen timeline page: a sticky duotone photo panel on the left that
 * follows the month being read, and on the right one school year's entries
 * as a staggered stream. Each entry's size, photo placement and position can
 * be set in the page editor (`entries`); otherwise the newest article is a
 * full-width lead and the rest zig-zag.
 */
export default function StudentGovSplitTimeline({
  body,
  months,
  entries,
  yearLabel,
  current,
  olderYears,
}: {
  body: StudentGovBody;
  months: TimelineMonth[];
  entries: Record<string, TimelineEntryLayout>;
  /** "2026–27" */
  yearLabel: string;
  /** Link back to the current school year, when showing an older one */
  current: { href: string; label: string } | null;
  olderYears: { href: string; label: string }[];
}) {
  const meta = STUDENT_GOV[body];
  const other = STUDENT_GOV[STUDENT_GOV_BODIES.find((b) => b !== body) as StudentGovBody];
  const layouts = resolveStream(
    months.flatMap((m) => m.items).map((item) => ({
      kind: item.kind,
      id: item.id,
      hasImage: item.kind === "article" && Boolean(item.article.image),
    })),
    entries,
  );
  const firstPhotoKey = months
    .flatMap((m) => m.items)
    .map((item) => entryKey(item.kind, item.id))
    .find((key) => layouts.get(key)?.image !== "none");

  return (
    // Same column as the desktop header (max 1280px, same side padding), so the
    // photo panel and the stream line up with the header's rule however far the
    // window is zoomed out. Below lg the mobile header's rules run edge to edge,
    // and so does this. On desktop it's exactly the window height below the
    // header, and the stream scrolls inside it.
    <StudentGovSplitFrame className="mx-auto flex w-full max-w-[1280px] flex-col min-[860px]:h-[calc(100dvh-var(--split-top,142px))] min-[860px]:min-h-[480px] min-[860px]:flex-row min-[860px]:overflow-hidden lg:px-6 xl:px-[30px]">
      <StudentGovMonthPanel
        title={meta.title}
        otherTitle={other.title}
        otherHref={other.href}
        months={months.map(({ key, short, year, articles, updates, photo }) => ({
          key,
          short,
          year,
          articles,
          updates,
          photo,
        }))}
      />

      <div
        data-timeline-scroller
        tabIndex={0}
        role="region"
        aria-label={`${meta.title} stream`}
        className="min-w-0 flex-1 px-4 pt-5 pb-8 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-6 min-[860px]:h-full min-[860px]:overflow-y-auto min-[860px]:px-10 min-[860px]:pt-6 min-[860px]:pb-14 lg:pr-6 xl:pl-[72px]"
      >
        <div className="flex max-w-[800px] flex-col gap-10">
          {current && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-meta text-[13px] font-bold uppercase tracking-[0.14em] text-text-main">
                {yearLabel} school year
              </p>
              <TransitionLink href={current.href} className={PILL}>
                &lsaquo; Back to {current.label}
              </TransitionLink>
            </div>
          )}

          {months.length === 0 && (
            <p className="font-meta text-[16px] text-text-muted">Nothing yet in the {yearLabel} school year.</p>
          )}

          {months.map((month) => (
            <section
              key={month.key}
              id={monthSectionId(month.key)}
              data-timeline-month={month.key}
              aria-labelledby={`${monthSectionId(month.key)}-heading`}
              className="flex scroll-mt-6 flex-col gap-10"
            >
              <div className="border-b-2 border-text-main pb-2.5">
                <h2
                  id={`${monthSectionId(month.key)}-heading`}
                  className="font-meta text-[13px] font-bold uppercase tracking-[0.14em] text-text-main"
                >
                  {month.label}
                </h2>
              </div>

              {month.items.map((item) => {
                const key = entryKey(item.kind, item.id);
                const layout = layouts.get(key) as Layout;
                return item.kind === "article" ? (
                  <ArticleCard key={key} item={item} layout={layout} priority={key === firstPhotoKey} />
                ) : (
                  <UpdateCard key={key} item={item} layout={layout} />
                );
              })}
            </section>
          ))}

          {olderYears.length > 0 && (
            <nav aria-label="Previous school years" className="mt-4 border-t border-[var(--rule-color)] pt-8">
              <h2 className="font-meta text-[13px] font-bold uppercase tracking-[0.14em] text-text-main">
                Explore previous years
              </h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {olderYears.map((y) => (
                  <li key={y.href}>
                    <TransitionLink href={y.href} className={PILL}>
                      {y.label} &rsaquo;
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </StudentGovSplitFrame>
  );
}
