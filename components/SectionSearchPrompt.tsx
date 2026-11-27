"use client";

import React from "react";
import UnderlinedSearchForm from "@/components/UnderlinedSearchForm";
import { ArrowRight } from "lucide-react";
import TransitionLink from "@/components/TransitionLink";

/**
 * The foot of a section page (/news, /features, /opinion): a question, centred
 * ("Missed something?" on News, which is its own; other sections pass their
 * own with `question`). A search box limited to the section (it goes to the site search
 * as /search?q=…&section=<section>) on a red underline, a link to the
 * section's archive, and its contact email. The section pages have no
 * header row for these any more.
 *
 * Like the header search, the underline turns into a travelling rainbow wave
 * while you type, and stays rainbow once the search is submitted. Works
 * without scripts: the search is a plain form and the underline stays red.
 */
export default function SectionSearchPrompt({
  section,
  name,
  archiveHref,
  archiveLabel = "Browse back issues",
  contactHref,
  question = "Missed something",
  spacing = "mt-12 lg:mt-16",
  headingSize = "text-[clamp(26px,2.6vw,32px)]",
}: {
  /** The section's slug, as the search filter expects it ("news") */
  section: string;
  /** How the section is named in the copy ("News") */
  name: string;
  /** Every past story in the section. Opinion has none (its group titles link to their own lists), so it leaves this out */
  archiveHref?: string;
  /** The archive link's words ("Browse all Features"); News keeps "Browse back issues" */
  archiveLabel?: string;
  contactHref?: string;
  /** The heading, without its question mark, which is added in red */
  question?: string;
  /** The space above it, to match the page's own gaps between sections */
  spacing?: string;
  /** The heading's font size classes (Features sets a larger one for tablets) */
  headingSize?: string;
}) {
  const headingId = `${section}-search-prompt`;
  const inputId = `${section}-search-prompt-q`;
  return (
    <section aria-labelledby={headingId} className={`mx-auto max-w-[460px] text-center ${spacing}`}>
      <h2
        id={headingId}
        className={`font-copy ${headingSize} font-semibold leading-tight tracking-[-0.01em] text-text-main`}
      >
        {question}<span className="text-accent">?</span>
      </h2>

      <UnderlinedSearchForm
        section={section}
        label={`Search past ${name}`}
        inputId={inputId}
        className="mt-5"
      />

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6">
        {archiveHref && (
        <TransitionLink
          href={archiveHref}
          className="group inline-flex min-h-11 items-center gap-1.5 font-meta text-[15px] font-medium text-accent underline-offset-4 hover:underline"
        >
          {archiveLabel}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
        </TransitionLink>
        )}
        {contactHref && (
          <a
            href={contactHref}
            className="group inline-flex min-h-11 items-center gap-1.5 font-meta text-[15px] font-medium text-accent underline-offset-4 hover:underline"
          >
            Contact {name}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
          </a>
        )}
      </div>
    </section>
  );
}
