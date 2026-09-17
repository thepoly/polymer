export const DEFAULT_SEARCH_PAGE_SIZE = 20;
export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_QUERY_LENGTH = 140;

export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return "";

  return query
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function parseSearchPage(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function parseSearchPageSize(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_SEARCH_PAGE_SIZE;
  return Math.min(parsed, MAX_SEARCH_PAGE_SIZE);
}

export const SEARCH_SECTIONS = ["news", "features", "opinion", "sports"] as const;
export const SEARCH_RANGES = ["any", "week", "month", "year"] as const;
export const SEARCH_SORTS = ["newest", "oldest"] as const;

export type SearchFilters = {
  section: (typeof SEARCH_SECTIONS)[number] | null;
  range: (typeof SEARCH_RANGES)[number];
  sort: (typeof SEARCH_SORTS)[number];
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = { section: null, range: "any", sort: "newest" };

export function parseSearchFilters(params: { get(name: string): string | null }): SearchFilters {
  const section = params.get("section");
  const range = params.get("range");
  const sort = params.get("sort");
  return {
    section: SEARCH_SECTIONS.find((value) => value === section) ?? null,
    range: SEARCH_RANGES.find((value) => value === range) ?? "any",
    sort: SEARCH_SORTS.find((value) => value === sort) ?? "newest",
  };
}

// Only non-default filters go into the URL, so plain searches keep plain URLs.
export function appendSearchFilters(params: URLSearchParams, filters: SearchFilters): URLSearchParams {
  if (filters.section) params.set("section", filters.section);
  if (filters.range !== "any") params.set("range", filters.range);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  return params;
}

const SEARCH_RANGE_DAYS = { week: 7, month: 30, year: 365 } as const;

export function searchRangeStart(range: SearchFilters["range"], now = new Date()): Date | null {
  if (range === "any") return null;
  return new Date(now.getTime() - SEARCH_RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
}
