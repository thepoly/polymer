// The sports a sports article can be filed under. Values match RPI Athletics'
// URL slugs (rpiathletics.com/sports/<value>) so they can double as per-sport
// page slugs. Adding one needs a migration: the `sport` column is a Postgres
// enum (enum_articles_sport / enum__articles_v_version_sport).
export const SPORTS = [
  { value: 'mens-ice-hockey', label: "Men's Hockey" },
  { value: 'womens-ice-hockey', label: "Women's Hockey" },
  { value: 'mens-basketball', label: "Men's Basketball" },
  { value: 'womens-basketball', label: "Women's Basketball" },
  { value: 'football', label: 'Football' },
  { value: 'mens-soccer', label: "Men's Soccer" },
  { value: 'womens-soccer', label: "Women's Soccer" },
  { value: 'mens-lacrosse', label: "Men's Lacrosse" },
  { value: 'womens-lacrosse', label: "Women's Lacrosse" },
  { value: 'baseball', label: 'Baseball' },
  { value: 'softball', label: 'Softball' },
  { value: 'field-hockey', label: 'Field Hockey' },
  { value: 'mens-swimming-and-diving', label: "Men's Swimming & Diving" },
  { value: 'womens-swimming-and-diving', label: "Women's Swimming & Diving" },
  { value: 'mens-track-and-field', label: "Men's Track & Field" },
  { value: 'womens-track-and-field', label: "Women's Track & Field" },
  { value: 'mens-cross-country', label: "Men's Cross Country" },
  { value: 'womens-cross-country', label: "Women's Cross Country" },
  { value: 'mens-tennis', label: "Men's Tennis" },
  { value: 'womens-tennis', label: "Women's Tennis" },
  { value: 'golf', label: 'Golf' },
  { value: 'club-sports', label: 'Club Sports' },
  { value: 'intramurals', label: 'Intramurals' },
  { value: 'general', label: 'General / Multiple Sports' },
] as const

export type SportValue = (typeof SPORTS)[number]['value']

export const sportLabel = (value: string | null | undefined): string | null =>
  SPORTS.find((s) => s.value === value)?.label ?? null
