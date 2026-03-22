export const opinionGroups = {
  editorials: {
    label: 'Editorials',
    slug: 'editorials',
    types: ['staff-editorial', 'editorial-notebook', 'endorsement'],
  },
  more: {
    label: 'More in Opinion',
    slug: 'more-in-opinion',
    types: ['opinion', 'letter-to-the-editor', 'other', 'more'],
  },
  other: {
    label: 'Other',
    slug: 'other',
    types: ['column', 'editors-notebook', 'top-hat', 'candidate-profile', 'derby', 'polys-recommendations'],
  },
} as const;

export type OpinionGroupKey = keyof typeof opinionGroups;
