export const opinionGroups = {
  editorials: {
    label: 'Editorials',
    slug: 'editorials',
    types: ['staff-editorial', 'editorial-notebook', 'endorsement', 'editors-notebook', 'polys-recommendations'],
  },
  more: {
    label: 'Opinions',
    slug: 'more-in-opinion',
    types: ['opinion', 'column'],
  },
  other: {
    label: 'Other',
    slug: 'other',
    types: ['letter-to-the-editor', 'top-hat', 'candidate-profile', 'derby', 'other', 'more'],
  },
} as const;

export type OpinionGroupKey = keyof typeof opinionGroups;

/**
 * A group's stories under the columns: the lead is the newest story with a
 * photo (shown with it), or the newest of all when none has one; then the
 * `listed` newest of the rest, without photos. `stories` is newest first, so
 * the lead can be older than the stories listed under it.
 */
export function pickGroupStories<T extends { image?: string | null }>(stories: T[], listed = 3): { lead: T | null; rest: T[] } {
  const lead = stories.find((story) => Boolean(story.image)) ?? stories[0] ?? null;
  return { lead, rest: stories.filter((story) => story !== lead).slice(0, listed) };
}
