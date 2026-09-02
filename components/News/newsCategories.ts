/**
 * News categories carried over from the previous /news page.
 *
 * `kickers` bias which column an article lands in — they are a preference, not a
 * filter, so a column still fills from the general news pool when no article
 * carries its kicker (see `NewsSectionPage`). `GM Week 2026` and any other
 * one-off kicker fall through to Other News.
 */
export const newsCategories = {
  studentGov: {
    label: 'Student Government',
    kickers: ['Student Senate', 'Executive Board'],
  },
  campusInfrastructure: {
    label: 'Campus Infrastructure',
    kickers: ['Campus Infrastructure'],
  },
  interviews: {
    label: 'Interviews',
    kickers: ['Interview', 'Town Hall'],
  },
  pressReleases: {
    label: 'Press Releases',
    kickers: ['Press Release'],
  },
  otherNews: {
    label: 'Other News',
    kickers: [] as string[], // catch-all for everything not placed above
  },
} as const;

export type NewsCategoryKey = keyof typeof newsCategories;
