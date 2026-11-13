/**
 * Shared shape of the news section page layout, stored as JSON in the
 * `news-page-layout` collection (see collections/NewsPageLayout.ts). Used by
 * the dashboard editor, the section route and the page components.
 */
import type { StudentGovLayout } from './studentGov';
import type { TimelinePagesLayout } from './timelinePage';

/**
 * Where the lead story's text (kicker, headline, byline, subdeck) sits
 * relative to its photo on desktop:
 * - north: above the photo
 * - south: below the photo
 * - east: to the right of the photo
 * - west: to the left of the photo
 */
/** "Contact" link in the /news header: emails the news editor and the EIC */
export const NEWS_CONTACT_MAILTO =
  'mailto:news@poly.rpi.edu,eic@poly.rpi.edu?subject=News%2C%20Request%2FComment';

export type LeadTextPosition = 'north' | 'south' | 'east' | 'west';

export const LEAD_TEXT_POSITIONS: { value: LeadTextPosition; label: string; hint: string }[] = [
  { value: 'north', label: 'North', hint: 'Text above the photo' },
  { value: 'south', label: 'South', hint: 'Text below the photo' },
  { value: 'east', label: 'East', hint: 'Text right of the photo' },
  { value: 'west', label: 'West', hint: 'Text left of the photo' },
];

export const DEFAULT_LEAD_TEXT_POSITION: LeadTextPosition = 'west';

export const isLeadTextPosition = (value: unknown): value is LeadTextPosition =>
  value === 'north' || value === 'south' || value === 'east' || value === 'west';

export type NewsLayout = {
  /** Lead story, top left (two thirds of the page width). Null auto-fills. */
  lead: number | null;
  leadTextPosition: LeadTextPosition;
  /** Right column: Senate and Executive Board boxes */
  studentGov: StudentGovLayout;
  /** /news/senate and /news/executive-board: photos, hidden entries, stats */
  timelinePages?: TimelinePagesLayout;
};
