import { SUMMARY_CLASS } from "@/components/summaryClass";
import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { Byline } from "@/components/FrontPage/Byline";
import StudentGovMonthPanel, { type PanelMonth, type PanelPhoto } from "./StudentGovMonthPanel";
import StudentGovSplitFrame from "./StudentGovSplitFrame";
import StudentGovBackLink from "./StudentGovBackLink";
import {
  STUDENT_GOV,
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
import { formatDay, troyDayKey } from "./studentGovTerms";

/** Markers at the term's edges and at leader changes, built in lib/studentGovPage */
export type StreamMarkers = {
  /** GM Week that ended this term: top of a past term */
  gmWeek: { day: string; text: string; href: string | null } | null;
  /**
   * Dated lines placed in the stream by day: mid-term leader changes
   * ("Philipps appointed 135th President of the Union") and, for the Senate,
   * "2026 Summer recess · No meetings" at June 1. `hideDay` places the line
   * by its day without printing the day.
   */
  dividers: { day: string; text: string; hideDay?: boolean }[];
};

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
        <Byline authors={article.authorLinks} size="sm" margin="mt-2" />
        {article.excerpt && (
          <p
            className={`mt-2 ${SUMMARY_CLASS} leading-[1.5] ${
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

/** The GM Week that ended a past term, at its top; ruled like the month headers */
function GmWeekMarker({ day, text, href }: { day: string; text: string; href: string | null }) {
  const content = (
    <>
      <time dateTime={day}>{formatDay(day)}</time>
      <span aria-hidden="true"> &mdash; </span>
      {text}
      {href && <span aria-hidden="true">&nbsp;&rsaquo;</span>}
    </>
  );
  return (
    <div className="border-b-2 border-accent pb-2.5 text-accent">
      <p className="font-meta text-[13px] font-bold uppercase leading-[1.4] tracking-[0.14em]">
        <span>GM Week &middot; </span>
        {href ? (
          <TransitionLink href={href} className="hover:underline">
            {content}
          </TransitionLink>
        ) : (
          content
        )}
      </p>
    </div>
  );
}

/** A lighter rule: a leader change or the Senate's summer recess (June 1) */
function ThinMarker({ day, text }: { day: string | null; text: string }) {
  return (
    <p className="border-b border-[var(--rule-color)] pb-2 font-meta text-[12px] font-bold uppercase tracking-[0.12em] text-text-muted">
      {day && (
        <>
          <time dateTime={day}>{formatDay(day)}</time>
          <span aria-hidden="true"> &middot; </span>
        </>
      )}
      {text}
    </p>
  );
}


type Divider = StreamMarkers["dividers"][number];

/**
 * Where each leader-change divider goes: before the first entry older than
 * the change, inside that entry's month, or before the month's heading when
 * the change happened in a later month with no entries. Changes older than
 * every entry go at the end.
 */
function placeDividers(months: TimelineMonth[], dividers: Divider[]) {
  const beforeItem = new Map<string, Divider[]>();
  const beforeMonth = new Map<string, Divider[]>();
  const atEnd: Divider[] = [];
  const add = (map: Map<string, Divider[]>, key: string, d: Divider) => map.set(key, [...(map.get(key) ?? []), d]);
  for (const d of dividers) {
    let placed = false;
    for (const month of months) {
      const index = month.items.findIndex((item) => troyDayKey(item.date) < d.day);
      if (index === -1) continue;
      const item = month.items[index];
      if (index === 0 && d.day.slice(0, 7) !== month.key) add(beforeMonth, month.key, d);
      else add(beforeItem, entryKey(item.kind, item.id), d);
      placed = true;
      break;
    }
    if (!placed) atEnd.push(d);
  }
  return { beforeItem, beforeMonth, atEnd };
}

/**
 * Split-screen timeline page: a sticky duotone photo panel on the left that
 * follows the month being read, and on the right one term's entries (GM Week
 * to GM Week) as a staggered stream, from the GM Week that ended the term
 * down to its first meeting. Each entry's size, photo placement and position
 * can be set in the page editor (`entries`); otherwise the newest article is
 * a full-width lead and the rest zig-zag.
 */
export default function StudentGovSplitTimeline({
  body,
  months,
  entries,
  termLabel,
  current,
  otherHref,
  markers,
  photo,
  panelTint,
  terms,
}: {
  body: StudentGovBody;
  months: TimelineMonth[];
  entries: Record<string, TimelineEntryLayout>;
  /** "57th Senate · 2026–27" / "2026–27" */
  termLabel: string;
  /** Link back to the term in session, when showing an older one */
  /** The term in session, when this page is a past one: its page and name ("57th Senate") */
  current: { href: string; name: string } | null;
  /** The other body's timeline for the same term */
  otherHref: string;
  markers: StreamMarkers;
  /** The term's panel photo, or null for plain red */
  photo: PanelPhoto | null;
  panelTint: number;
  /** The body's list of terms, at the very end of the stream */
  terms?: React.ReactNode;
}) {
  const meta = STUDENT_GOV[body];
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
  const dividers = placeDividers(months, markers.dividers);

  return (
    // Same column as the desktop header (max 1280px, same side padding), so the
    // photo panel and the stream line up with the header's rule however far the
    // window is zoomed out. Below lg the mobile header's rules run edge to edge,
    // and so does this. On desktop it's exactly the window height below the
    // header, and the stream scrolls inside it.
    <StudentGovSplitFrame className="mx-auto flex w-full max-w-[1280px] flex-col min-[860px]:h-[calc(100dvh-var(--split-top,142px))] min-[860px]:min-h-[480px] min-[860px]:flex-row min-[860px]:overflow-hidden lg:px-6 xl:px-[30px]">
      <StudentGovMonthPanel
        title={meta.title}
        termLabel={termLabel}
        body={body}
        otherHref={otherHref}
        months={months.map(({ key, short }) => ({ key, short }))}
        photo={photo}
        panelTint={panelTint}
      />

      {/* Moving between bodies, the stream slides as one (data-swipe-chunk,
          pageSwipe.ts): the part of the old one in view goes out one side and
          the new one, scrolled to the same place, follows right behind it.
          Clipped at its sides so neither shows outside the column. */}
      <div
        data-timeline-scroller
        data-swipe-chunk="stream"
        tabIndex={0}
        role="region"
        aria-label={`${meta.title} stream`}
        className="relative min-w-0 flex-1 overflow-x-clip px-4 pt-5 pb-8 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:max-[859px]:px-6 min-[860px]:h-full min-[860px]:overflow-y-auto min-[860px]:px-10 min-[860px]:pt-6 min-[860px]:pb-14 lg:pr-6 xl:pl-[72px]"
      >
        <div className="flex max-w-[800px] flex-col gap-7">
          {current && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-meta text-[13px] font-bold uppercase tracking-[0.14em] text-text-main">{termLabel}</p>
              <StudentGovBackLink href={current.href} name={current.name} />
            </div>
          )}

          {markers.gmWeek && (
            <GmWeekMarker day={markers.gmWeek.day} text={markers.gmWeek.text} href={markers.gmWeek.href} />
          )}

          {months.length === 0 && (
            <p className="font-meta text-[16px] text-text-muted">Nothing on the timeline for {termLabel} yet.</p>
          )}

          {months.map((month, monthIndex) => {
            // The term in session shows when the body meets beside its top month
            const meets = !current && monthIndex === 0 ? meta.meets : null;
            return (
              <React.Fragment key={month.key}>
                {(dividers.beforeMonth.get(month.key) ?? []).map((d) => (
                  <ThinMarker key={`${d.day}-${d.text}`} day={d.hideDay ? null : d.day} text={d.text} />
                ))}
                <section
                  id={monthSectionId(month.key)}
                  data-timeline-month={month.key}
                  aria-labelledby={`${monthSectionId(month.key)}-heading`}
                  className="flex scroll-mt-6 flex-col gap-7"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-text-main pb-2.5">
                    <h2
                      id={`${monthSectionId(month.key)}-heading`}
                      className="font-meta text-[13px] font-bold uppercase tracking-[0.14em] text-text-main"
                    >
                      {month.label}
                    </h2>
                    {meets && (
                      <p className="font-meta text-[12px] font-bold uppercase tracking-[0.12em] text-text-main">
                        <span className="sr-only">Meets </span>
                        {meets}
                      </p>
                    )}
                  </div>

                  {month.items.map((item) => {
                    const key = entryKey(item.kind, item.id);
                    const layout = layouts.get(key) as Layout;
                    return (
                      <React.Fragment key={key}>
                        {(dividers.beforeItem.get(key) ?? []).map((d) => (
                          <ThinMarker key={`${d.day}-${d.text}`} day={d.hideDay ? null : d.day} text={d.text} />
                        ))}
                        {item.kind === "article" ? (
                          <ArticleCard item={item} layout={layout} priority={key === firstPhotoKey} />
                        ) : (
                          <UpdateCard item={item} layout={layout} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </section>
              </React.Fragment>
            );
          })}

          {dividers.atEnd.map((d) => (
            <ThinMarker key={`${d.day}-${d.text}`} day={d.hideDay ? null : d.day} text={d.text} />
          ))}

          {/* Set off from the last entry: the list is about the body, not this term */}
          {terms && <div className="mt-10">{terms}</div>}
        </div>
      </div>
    </StudentGovSplitFrame>
  );
}
