import React from "react";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import TransitionLink from "@/components/TransitionLink";
import NewsLead from "./NewsLead";
import StudentGovColumn, { type StudentGovBoxContent } from "./StudentGovColumn";
import { DEFAULT_LEAD_TEXT_POSITION, NEWS_CONTACT_MAILTO, type LeadTextPosition } from "./newsLayout";

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
  studentGovBoxes = [],
}: {
  title: string;
  articles: ComponentArticle[];
  /** Editor-pinned lead; when empty, the newest story with a photo leads */
  lead?: ComponentArticle | null;
  leadTextPosition?: LeadTextPosition;
  /** Senate and Executive Board boxes, top one first */
  studentGovBoxes?: StudentGovBoxContent[];
  pinnedArticles?: ComponentArticle[];
  hasOlderArticles?: boolean;
}) {
  const leadArticle = lead ?? articles.find((a) => a.image) ?? articles[0] ?? null;

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-8 md:px-6 xl:px-[30px]">
      {/* Header: title, then Archive and Contact (same as the previous layout) */}
      <div className="mt-6 mb-8 flex flex-col items-center gap-4 text-center sm:mb-10 lg:flex-row lg:items-center lg:gap-6 lg:text-left">
        <h1
          className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px] lg:text-[60px]"
          style={{ fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[24px] sm:text-[28px] lg:justify-start lg:text-[36px]">
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <TransitionLink
            href="/news/more-in-news"
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Archive
          </TransitionLink>
          <span className="font-meta text-text-muted lg:hidden" aria-hidden="true">
            &middot;
          </span>
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <a
            href={NEWS_CONTACT_MAILTO}
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Contact
          </a>
        </div>
      </div>

      {/* Top block: lead takes two thirds, right column the rest */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-0">
        <div className="lg:border-r lg:border-[var(--rule-color)] lg:pr-[clamp(16px,2vw,24px)]">
          {leadArticle && <NewsLead article={leadArticle} position={leadTextPosition} />}
        </div>
        <div className="lg:pl-[clamp(16px,2vw,24px)]">
          <StudentGovColumn boxes={studentGovBoxes} />
        </div>
      </div>
    </div>
  );
}
