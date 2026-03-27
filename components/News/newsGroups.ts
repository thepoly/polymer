export const newsGroups = {
  interviews: {
    label: 'Interviews',
    kickers: ['Interview'],
  },
  studentGov: {
    label: 'Student Government',
    kickers: ['Student Senate', 'Executive Board'],
  },
  other: {
    label: 'Other News',
    kickers: null, // catch-all for articles not shown above
  },
} as const;

export type NewsGroupKey = keyof typeof newsGroups;
