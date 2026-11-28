import React from 'react';
import { joinNames } from '@/utils/joinNames';

type BylineAuthor = { name: string; href?: string | null };

const HOUSE_NAME = 'The Polytechnic';

/**
 * Byline size by the headline it sits under. Sentence case reads smaller
 * than the old all-caps line, so these sit a step or two under the dek
 * rather than three or four.
 */
const BYLINE_SIZES = {
  sm: 'text-[13px]', // headlines under ~22px: compact items, small story cards
  md: 'text-[14px]', // 22–30px: most cards, lists, search
  lg: 'text-[15px]', // leads, 32px and up
} as const;

/**
 * "By", separators and dates. The muted token in light mode; in dark mode the
 * muted token sits too close to the names (about 1.3:1), so it's mixed toward
 * the background to keep the same step as light mode (about 3.2:1) while
 * staying above 4.5:1 on the page. Built from the theme's own tokens, so it
 * follows colours set in the Theme global, and resolved where it's used, so
 * containers that restyle the tokens (the dark search overlay) get it right.
 */
export const BYLINE_META_CLASS =
  'text-text-muted dark:text-[color:color-mix(in_oklab,var(--foreground-muted)_65%,var(--background))]';

/**
 * Card byline: "By Morgan Patel and Ethan Gallagher · 3 hours ago".
 * Names are ink at 600; "By", separators and the date are muted at 400.
 * Never the accent colour: red on a card belongs to the kicker.
 *
 * Names are plain text. The card is already one link to the story, and a
 * second link inside it can't be valid HTML; profiles are linked from the
 * article header instead.
 */
export const Byline = ({
  authors,
  date,
  size = 'md',
  margin = 'mt-1 md:mt-1.5',
  className = '',
}: {
  /** formatArticle's authorLinks, in byline order. Empty means "By The Polytechnic". */
  authors?: BylineAuthor[] | null;
  date?: string | null;
  /** Matched to the headline above: see BYLINE_SIZES */
  size?: keyof typeof BYLINE_SIZES;
  /** Space above the byline; replaces the default rather than competing with it */
  margin?: string;
  className?: string;
}) => {
  // An empty list means the house byline; no list at all means a date-only line
  const names = authors ? authors.filter((a) => a.name?.trim()) : null;
  const people = names ? (names.length > 0 ? names : [{ name: HOUSE_NAME }]) : null;

  if (!people && !date) return null;

  return (
    <div
      data-marauders-obstacle="meta"
      className={`font-meta overflow-x-clip ${margin} ${BYLINE_SIZES[size]} font-normal tracking-[0.01em] leading-snug ${BYLINE_META_CLASS} ${className}`}
    >
      {people && (
        <span>
          By{' '}
          {/* Each name wraps as a whole: it moves to the next line only
              when it doesn't fit, never splitting first name from last */}
          {joinNames(people).map(({ item, sep }, index) => (
            <React.Fragment key={index}>
              {sep}
              <span className="whitespace-nowrap font-semibold text-text-main">{item.name}</span>
            </React.Fragment>
          ))}
        </span>
      )}
      {/* The em space is the only break point between the authors and the
          date, so the whole date moves to the next line together. The dot
          sits in that gap, 0.35em off the date's left edge: when the date
          wraps it falls outside the byline and is clipped (overflow-x-clip),
          so the new line doesn't start with a dot. */}
      {people && date && ' '}
      {date && (
        <span className="relative whitespace-nowrap">
          {people && (
            <span aria-hidden="true" className="absolute right-full mr-[0.35em]">
              &middot;
            </span>
          )}
          <span suppressHydrationWarning>{date}</span>
        </span>
      )}
    </div>
  );
};
