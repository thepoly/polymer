
export type SectionTheme = {
  accentColor: string;
  layout: 'standard' | 'wide' | 'magazine';
  showKicker: boolean;
};

export const sectionThemes: Record<string, SectionTheme> = {
  news: {
    accentColor: 'text-red-700',
    layout: 'standard',
    showKicker: true,
  },
  sports: {
    accentColor: 'text-blue-800',
    layout: 'wide',
    showKicker: false,
  },
  features: {
    accentColor: 'text-purple-700',
    layout: 'magazine',
    showKicker: true,
  },
  editorial: {
    accentColor: 'text-gray-800',
    layout: 'standard',
    showKicker: true,
  },
  opinion: {
    accentColor: 'text-blue-500',
    layout: 'standard',
    showKicker: true,
  },
  default: {
    accentColor: 'text-gray-900',
    layout: 'standard',
    showKicker: true,
  },
};

export const getSectionTheme = (section: string): SectionTheme => {
  return sectionThemes[section] || sectionThemes.default;
};
