export const DEFAULT_SEARCH_PAGE_SIZE = 20;
export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_QUERY_LENGTH = 35;

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
