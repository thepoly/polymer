import React from "react";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import BalanceColumns from "@/components/BalanceColumns";
import NewsFeatured, { FeaturedCard, OverlayCard } from "./NewsFeatured";
import NewsTopicTabs from "./NewsTopicTabs";
import { NEWS_TOPICS, TOPIC_CARDS, type NewsTopicKey } from "./newsTopics";
import NewsLead from "./NewsLead";
import NewsSecondary from "./NewsSecondary";
import StudentGovColumn, { type StudentGovBoxContent } from "./StudentGovColumn";
import NewsSearchPrompt from "./NewsSearchPrompt";
import {
  DEFAULT_LEAD_TEXT_POSITION,
  DEFAULT_TOPIC_CARDS,
  FEATURED_SLOTS,
  NEWS_CONTACT_MAILTO,
  leadFrameStyles,
  type LeadFrame,
  type LeadTextPosition,
  type TopicCardStyle,
} from "./newsLayout";

/** How wide a topic row photo is drawn, for the download size */
const TOPIC_CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 410px";

/**
 * How far the lead column's type may grow to reach the bottom of the Student
 * Government column (BalanceColumns). The strips under the lead take the
 * full scale; the lead's own text, where it has any outside the photo, half.
 */
const LEAD_COLUMN_SCALE = "1,1.5";

/**
 * New /news section page (work in progress on the `news-page` branch).
 * Built top to bottom, one component at a time; layout choices come from the
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
  featuredPins = [],
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
  /** Stories the editor pinned in the Featured row, by slot; null slots fill automatically */
  featuredPins?: (ComponentArticle | null)[];
  /** Newest stories per topic for the tabbed row, a few spare in each */
  topics?: Record<NewsTopicKey, ComponentArticle[]> | null;
  /** Topic row card style, set in the News Layout editor */
  topicCards?: TopicCardStyle;
  /**
   * Topic tabs set to chosen stories in the News Layout editor, by slot; a
   * null slot takes the topic's next newest story. Tabs not here show the
   * six newest.
   */
  topicPins?: Partial<Record<NewsTopicKey, (ComponentArticle | null)[]>>;
  /** Senate and Executive Board bullets as headlines only (News Layout editor) */
  bulletsHeadlinesOnly?: boolean;
  /** Senate and Executive Board boxes, top one first */
  studentGovBoxes?: StudentGovBoxContent[];
  pinnedArticles?: ComponentArticle[];
  hasOlderArticles?: boolean;
}) {
  const leadArticle = lead ?? articles.find((a) => a.image) ?? articles[0] ?? null;

  // Stories already on the page, so nothing is shown twice: the lead, and
  // whatever is in the Senate / Executive Board boxes
  const shown = new Set<number | string>(leadArticle ? [leadArticle.id] : []);
  for (const box of studentGovBoxes) {
    if (box.kind === "article") shown.add(box.article.id);
    else for (const item of box.items) if (item.kind === "article") shown.add(item.article.id);
  }
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
  const placed = new Set<number | string>(leadArticle ? [leadArticle.id] : []);
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
  // Featured pins are claimed before the strips auto-fill, so a story pinned
  // to the Featured row isn't used up under the lead first
  for (const pin of featuredPins.slice(0, FEATURED_SLOTS)) if (pin) shown.add(pin.id);
  const secondary = fillSlots(secondaryPins, stripCount);
  // Featured cards lead with their photo, so only stories with one fill in
  const featured = fillSlots(featuredPins, FEATURED_SLOTS, (a) => Boolean(a.image));
  // Topic rows: six each. A tab with chosen stories shows them in the
  // editor's order (even if they're also higher up: the editor picked them
  // for this tab), and its empty slots take the topic's newest stories.
  // Newest stories leave out anything already shown above.
  const topicSets = NEWS_TOPICS.map((t) => {
    const pins = (topicPins[t.key] ?? []).slice(0, TOPIC_CARDS);
    const pinned = new Set<number | string>();
    for (const pin of pins) if (pin) pinned.add(pin.id);
    const newest = (topics?.[t.key] ?? []).filter((a) => !shown.has(a.id) && !pinned.has(a.id));
    const slots = Array.from({ length: TOPIC_CARDS }, (_, i) => pins[i] ?? null);
    const seen = new Set<number | string>();
    return slots
      .map((pin) => pin ?? newest.shift() ?? null)
      .filter((a): a is ComponentArticle => {
        if (!a || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
  });
  // Open on the first topic that has stories
  const firstTopic = Math.max(0, topicSets.findIndex((set) => set.length > 0));

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-8 md:px-6 xl:px-[30px]">
      {/* Title. On desktop the masthead already marks News (red, with a bar
          on the rule), so the title is for screen readers only and the lead
          starts right under the header. The mobile header has no section
          links, so the title shows there, small. Archive and Contact are at
          the foot of the page (NewsSearchPrompt). */}
      <h1
        className="mt-2 mb-6 text-center font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[32px] sm:text-[40px] lg:sr-only"
        style={{ fontWeight: 400, lineHeight: 1 }}
      >
        {title}
      </h1>

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
          data-balance-scale={LEAD_COLUMN_SCALE}
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
          <NewsSecondary articles={secondary} optional={stripsOptional} />
        </div>
        <StudentGovColumn
          boxes={studentGovBoxes}
          headlinesOnly={bulletsHeadlinesOnly}
          className="lg:pl-[clamp(16px,2vw,24px)]"
        />
      </BalanceColumns>

      <NewsFeatured articles={featured} />

      {topics && (
        <NewsTopicTabs tabs={NEWS_TOPICS.map(({ key, label }) => ({ key, label }))} initial={firstTopic}>
          {topicSets.map((set, t) =>
            set.length > 0 ? (
              <div
                key={NEWS_TOPICS[t].key}
                // Overlay cards sit close, as one block of photos; cards with text under need room
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${topicCards.overlay ? "gap-5" : "gap-x-5 gap-y-8"}`}
              >
                {set.map((article, i) => (
                  <div key={article.id} data-topic-card style={{ "--i": i } as React.CSSProperties}>
                    {topicCards.overlay ? (
                      <OverlayCard article={article} sizes={TOPIC_CARD_SIZES} />
                    ) : (
                      <FeaturedCard article={article} large subdeck={topicCards.subdeck} sizes={TOPIC_CARD_SIZES} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p key={NEWS_TOPICS[t].key} data-topic-card className="py-6 font-meta text-[15px] text-text-muted">
                No {NEWS_TOPICS[t].label} stories yet.
              </p>
            ),
          )}
        </NewsTopicTabs>
      )}

      <NewsSearchPrompt contactHref={NEWS_CONTACT_MAILTO} />
    </div>
  );
}
