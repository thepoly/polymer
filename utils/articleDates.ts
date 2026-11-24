import { formatRelativeTime } from '@/components/LiveArticle/relativeTime';
import { TROY_TIME_ZONE } from '@/lib/troyTime';

/*
 * Byline dates, one set of rules for the whole site:
 * - cards show how long ago a story ran ("3 hours ago") for its first week,
 *   then nothing (recentAge);
 * - a lead story always shows a date, so after that week it shows the publish
 *   date instead (leadDate);
 * - publish dates are read in Troy's time zone, so a story posted at 9 pm
 *   doesn't show the next day's date on a server running in UTC.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toDate = (input: string | Date | null | undefined): Date | null => {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "3 hours ago" for a story's first week; null after that */
export function recentAge(input: string | Date | null | undefined, now: Date = new Date()): string | null {
  const date = toDate(input);
  if (!date || now.getTime() - date.getTime() >= WEEK_MS) return null;
  return formatRelativeTime(date, now) || null;
}

const longFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: TROY_TIME_ZONE,
});

const shortFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: TROY_TIME_ZONE,
});

/** "October 22, 2026", in Troy's time zone */
export function longDate(input: string | Date | null | undefined): string | null {
  const date = toDate(input);
  return date ? longFormat.format(date) : null;
}

/** "Oct 22, 2026", in Troy's time zone */
export function shortDate(input: string | Date | null | undefined): string | null {
  const date = toDate(input);
  return date ? shortFormat.format(date) : null;
}

/** A lead story's date: how long ago in its first week, the publish date after */
export function leadDate(article: { date?: string | null; publishedDate?: string | null }): string | null {
  return article.date || longDate(article.publishedDate);
}
