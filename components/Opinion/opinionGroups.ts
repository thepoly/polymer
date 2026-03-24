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
