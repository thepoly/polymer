import React from "react";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import BalanceColumns from "@/components/BalanceColumns";
import { FeaturedCard, OverlayCard } from "./NewsFeatured";
import NewsTopicTabs from "./NewsTopicTabs";
import { NEWS_TOPICS, TOPIC_CARDS, type NewsTopicKey } from "./newsTopics";
import NewsLead from "./NewsLead";
import NewsSecondary from "./NewsSecondary";
import StudentGovColumn, { type StudentGovBoxContent } from "./StudentGovColumn";
import SectionSearchPrompt from "@/components/SectionSearchPrompt";
import {
  DEFAULT_LEAD_TEXT_POSITION,
  DEFAULT_TOPIC_CARDS,
  NEWS_CONTACT_MAILTO,
  leadFrameStyles,
  type LeadFrame,
  type LeadTextPosition,
  type TopicCardStyle,
} from "./newsLayout";

/** How wide a topic row photo is drawn, for the download size */
const TOPIC_CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 410px";

/** Separate responsive sets keep tablet-only placements out of its topic cards. */
function renderTopicStories({
  articles,
  cardStyle,
  tablet,
  label,
}: {
  articles: ComponentArticle[];
  cardStyle: TopicCardStyle;
  tablet: boolean;
  label: string;
}) {
  if (articles.length === 0) {
    return (
      <p data-topic-card className={`${tablet ? "hidden md:block lg:hidden" : "md:hidden lg:block"} py-6 font-meta text-[15px] text-text-muted`}>
        No {label} stories yet.
      </p>
    );
  }
  return (
    <div
      data-topic-grid={tablet ? "tablet" : "default"}
      className={`${tablet ? "hidden md:grid lg:hidden" : "grid md:hidden lg:grid"} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${cardStyle.overlay ? "gap-5" : "gap-x-5 gap-y-8"}`}
    >
      {articles.map((article, i) => (
        <div
          key={article.id}
          data-topic-card
          className={!tablet && i >= 3 ? "hidden lg:block" : undefined}
          style={{ "--i": i } as React.CSSProperties}
        >
          {cardStyle.overlay ? (
            <OverlayCard article={article} sizes={TOPIC_CARD_SIZES} />
          ) : (
            <FeaturedCard article={article} large subdeck={cardStyle.subdeck} sizes={TOPIC_CARD_SIZES} />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * How far the lead column's type may grow to reach the bottom of the Student
 * Government column (BalanceColumns). The strips under the lead take the
 * full scale; the lead's own text, where it has any outside the photo, half.
 * With the text above or below the photo, the lead's headline runs the full
 * width and a strip under it can follow (shown even if it overshoots), so the
 * type grows less: a strip at 1.5 came close to the lead's own size.
 */
const LEAD_COLUMN_SCALE = "1,1.5";
const STACKED_LEAD_COLUMN_SCALE = "1,1.25";

/**
 * /news section page. Layout choices come from the
 * News Layout editor in the dashboard (collection `news-page-layout`).
 *
 * The previous layout, `NewsSectionPage.tsx`, is kept in the repo but no
 * longer rendered. Remove or archive it once this page ships.
 */
export default function NewsPage({
  title,
  articles,
  lead = null,
  leadTextPosition = DEFAULT_LEAD_TEXT_POSITION,
  leadFrame = null,
  secondaryPins = [],
  secondaryPhotos = true,
  topics = null,
  topicCards = DEFAULT_TOPIC_CARDS,
  topicPins = {},
  bulletsHeadlinesOnly = false,
  studentGovBoxes = [],
}: {
  title: string;
  articles: ComponentArticle[];
  /** Editor-pinned lead; when empty, the newest story with a photo leads */
  lead?: ComponentArticle | null;
  leadTextPosition?: LeadTextPosition;
  /** Editor's crop of the lead photo; ignored when it's for another story */
  leadFrame?: LeadFrame | null;
  /** Stories the editor pinned under the lead, by slot; null slots fill automatically */
  secondaryPins?: (ComponentArticle | null)[];
  /** Stories under the lead show their photo on the right (News Layout editor) */
  secondaryPhotos?: boolean;
  /** Newest stories per topic for the tabbed row, a few spare in each */
  topics?: Record<NewsTopicKey, ComponentArticle[]> | null;
  /** Topic row card style, set in the News Layout editor */
  topicCards?: TopicCardStyle;
  /**
   * Topic tabs set to chosen stories in the News Layout editor, by slot; a
   * null slot takes the topic's next newest story. Tabs not here show the
   * newest stories (three on phones, four on tablets, six on desktops).
   */
  topicPins?: Partial<Record<NewsTopicKey, (ComponentArticle | null)[]>>;
  /** Senate and Executive Board bullets as headlines only (News Layout editor) */
  bulletsHeadlinesOnly?: boolean;
  /** Senate and Executive Board boxes, top one first */
  studentGovBoxes?: StudentGovBoxContent[];
  pinnedArticles?: ComponentArticle[];
  hasOlderArticles?: boolean;
}) {
  // Government boxes claim their stories before automatic lead selection.
  const shown = new Set<number | string>();
  for (const box of studentGovBoxes) {
    if (box.kind === "article") shown.add(box.article.id);
    else for (const item of box.items) if (item.kind === "article") shown.add(item.article.id);
  }
  const leadCandidates = articles.filter((a) => !shown.has(a.id));
  const leadArticle = lead ?? leadCandidates.find((a) => a.image) ?? leadCandidates[0] ?? null;
  if (leadArticle) shown.add(leadArticle.id);
  // Overlay without a photo is laid out as south (see NewsLead)
  const position = leadTextPosition === "overlay" && !leadArticle?.image ? "south" : leadTextPosition;
  // Strips under the lead, by its layout. Beside its photo the lead is short,
  // so two strips follow; a photo with the text over it takes one. Text above
  // or below the photo already runs about as deep as the Student Government
  // column, so a strip only appears if the lead still ends well short of it.
  const stripCount = position === "east" || position === "west" ? 2 : 1;
  // With headlines-only bullets the Student Government column is short, so
  // the lead usually matches it alone: the strips only show if there's room
  const stripsOptional = position === "north" || position === "south" || bulletsHeadlinesOnly;
  // Fills `slots` places: a pinned story takes its slot (unless it's the lead
  // or already placed by an earlier pin), and the others take the newest
  // stories not on the page yet. Everything placed counts as shown after.
  const placed = new Set(shown);
  const fillSlots = (
    pinned: (ComponentArticle | null)[],
    slots: number,
    eligible: (a: ComponentArticle) => boolean = () => true,
  ): ComponentArticle[] => {
    const pins: (ComponentArticle | null)[] = [];
    for (let i = 0; i < slots; i += 1) {
      const pin = pinned[i] ?? null;
      const usable = pin !== null && !placed.has(pin.id);
      if (usable) placed.add(pin.id);
      pins.push(usable ? pin : null);
    }
    for (const pin of pins) if (pin) shown.add(pin.id);
    const unpinned = articles.filter((a) => !shown.has(a.id) && eligible(a));
    const filled = pins
      .map((pin) => pin ?? unpinned.shift() ?? null)
      .filter((a): a is ComponentArticle => a !== null);
    for (const a of filled) {
      shown.add(a.id);
      placed.add(a.id);
    }
    return filled;
  };
  const secondary = fillSlots(secondaryPins, stripCount);
  // This extra row only appears on tablets. Keep its exclusions separate so
  // phone and desktop topic selections retain their existing stories.
  const tabletStories = articles.filter((article) => !shown.has(article.id)).slice(0, 3);
  const tabletShown = new Set(shown);
  for (const article of tabletStories) tabletShown.add(article.id);
  // Topic rows: three on phones, four on tablets, six on desktops.
  // A tab with chosen stories shows them in the
  // editor's order (even if they're also higher up: the editor picked them
  // for this tab), and its empty slots take the topic's newest stories.
  // Newest stories leave out anything already shown above.
  const topicSetsFor = (excluded: Set<number | string>, count: number) => NEWS_TOPICS.map((t) => {
    const pins = (topicPins[t.key] ?? []).slice(0, count);
    const pinned = new Set<number | string>();
    for (const pin of pins) if (pin) pinned.add(pin.id);
    const newest = (topics?.[t.key] ?? []).filter((a) => !excluded.has(a.id) && !pinned.has(a.id));
    const slots = Array.from({ length: count }, (_, i) => pins[i] ?? null);
    const seen = new Set<number | string>();
    return slots
      .map((pin) => pin ?? newest.shift() ?? null)
      .filter((a): a is ComponentArticle => {
        if (!a || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
  });
  const topicSets = topicSetsFor(shown, TOPIC_CARDS);
  const tabletTopicSets = topicSetsFor(tabletShown, 4);
  // Open on the first topic that has stories
  const firstTopic = Math.max(0, topicSets.findIndex((set) => set.length > 0));

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pt-7 pb-8 md:px-6 lg:pt-5 xl:px-[30px]">
      {/* Keep a page heading for screen readers without a visible title row. */}
      <h1 className="sr-only">{title}</h1>

      {/* Top block: lead takes two thirds, right column the rest. On desktop
          the two columns are squared off to end on the same line: the shorter
          one's type is set larger (the strips under the lead, or the Student
          Government entries) and the lead photo's height closes what's left.
          See BalanceColumns. */}
      <BalanceColumns
        when="(min-width: 1024px)"
        className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-0"
      >
        <div
          data-balance-col
          // The lead photo grows before the strips' type does, so the type
          // only grows when the photo can't (held to the first screen, say)
          data-balance-art-first
          data-balance-scale={position === "north" || position === "south" ? STACKED_LEAD_COLUMN_SCALE : LEAD_COLUMN_SCALE}
          suppressHydrationWarning
          className="flex flex-col lg:border-r lg:border-[var(--rule-color)] lg:pr-[clamp(16px,2vw,24px)]"
        >
          {leadArticle && (
            <NewsLead
              article={leadArticle}
              position={leadTextPosition}
              frames={leadFrameStyles(leadFrame, leadArticle.id, leadArticle.imageFocus)}
            />
          )}
          <NewsSecondary articles={secondary} optional={stripsOptional} photos={secondaryPhotos} />
        </div>
        {tabletStories.length > 0 && (
          <section
            data-tablet-news-row
            aria-labelledby="news-tablet-stories-heading"
            className="hidden md:grid md:grid-cols-3 md:gap-5 lg:hidden"
          >
            <h2 id="news-tablet-stories-heading" className="sr-only">More News</h2>
            {tabletStories.map((article) => (
              <FeaturedCard key={article.id} article={article} subdeck={false} sizes="(min-width: 768px) and (max-width: 1023px) 33vw, 1px" />
            ))}
          </section>
        )}
        <StudentGovColumn
          boxes={studentGovBoxes}
          headlinesOnly={bulletsHeadlinesOnly}
          className="lg:pl-[clamp(16px,2vw,24px)]"
        />
      </BalanceColumns>

      {topics && (
        <NewsTopicTabs tabs={NEWS_TOPICS.map(({ key, label }) => ({ key, label }))} initial={firstTopic}>
          {topicSets.map((set, t) => (
            <React.Fragment key={NEWS_TOPICS[t].key}>
              {renderTopicStories({ articles: set, cardStyle: topicCards, tablet: false, label: NEWS_TOPICS[t].label })}
              {renderTopicStories({ articles: tabletTopicSets[t], cardStyle: topicCards, tablet: true, label: NEWS_TOPICS[t].label })}
            </React.Fragment>
          ))}
        </NewsTopicTabs>
      )}

      <SectionSearchPrompt section="news" name="News" archiveHref="/news/more-in-news" contactHref={NEWS_CONTACT_MAILTO} />
    </div>
  );
}
