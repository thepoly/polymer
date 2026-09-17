import { NextRequest } from "next/server";
import { getPayload } from "payload";
import type { Where } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";
import { Article } from "@/components/FrontPage/types";
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  parseSearchFilters,
  parseSearchPage,
  parseSearchPageSize,
  sanitizeSearchQuery,
  searchRangeStart,
  type SearchFilters,
} from "@/utils/search";
import { checkRateLimit } from "@/utils/rateLimit";

const SEARCH_RATE_LIMIT = 80; // each overlay search sends two requests (headline + full)
const SEARCH_RATE_LIMIT_WINDOW_MS = 10_000;

// Generate alternate separator forms of the query so "anti-discrimination",
// "anti discrimination", and "antidiscrimination" all match each other.
function queryForms(q: string): string[] {
  const forms = new Set<string>();
  forms.add(q);
  forms.add(q.replace(/-/g, " "));       // hyphens → spaces
  forms.add(q.replace(/\s+/g, "-"));     // spaces → hyphens
  forms.add(q.replace(/-/g, ""));        // remove hyphens
  forms.add(q.replace(/\s+/g, ""));      // remove spaces
  forms.add(q.replace(/[\s-]+/g, ""));   // remove all separators
  return [...forms].filter(f => f.trim().length > 0);
}

type PayloadSearchArticle = {
  id: number;
  title: string;
  slug?: string | null;
  subdeck?: string | null;
  featuredImage?: number | { url?: string | null } | null;
  section: string;
  kicker?: string | null;
  publishedDate?: string | null;
  createdAt: string;
  authors?: Array<number | { firstName: string; lastName: string }> | null;
  _status?: string | null;
};

const articleSearchSelect = {
  title: true,
  plainTitle: true,
  slug: true,
  subdeck: true,
  featuredImage: true,
  section: true,
  kicker: true,
  publishedDate: true,
  createdAt: true,
  authors: true,
  writeInAuthors: true,
  isFollytechnic: true,
} as const;

// Short fields scan fast, so these matches come back first (title is a richText
// field; plainTitle is the auto-derived plain-text version used for search).
const HEADLINE_FIELDS = ["plainTitle", "subdeck", "kicker", "writeInAuthors.name"];
const BODY_FIELDS = ["plainContent"];

function matchAny(fields: string[], queryFormsLower: string[]): Where {
  return { or: queryFormsLower.flatMap((form) => fields.map((field) => ({ [field]: { like: form } }))) };
}

type Payload = Awaited<ReturnType<typeof getPayload>>;

async function matchingIds(payload: Payload, where: Where, sort: string): Promise<number[]> {
  const result = await payload.find({
    collection: "articles",
    where,
    sort,
    pagination: false,
    depth: 0,
    select: { publishedDate: true },
  });
  return result.docs.map((doc) => doc.id);
}

async function articlesByIds(payload: Payload, ids: number[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const result = await payload.find({
    collection: "articles",
    where: { id: { in: ids } },
    pagination: false,
    depth: 1,
    select: articleSearchSelect,
  });
  const docsById = new Map(result.docs.map((doc) => [doc.id, doc]));
  return ids
    .map((id) => docsById.get(id))
    .map((doc) => doc && formatArticle(doc as unknown as Parameters<typeof formatArticle>[0], { absoluteDate: true }))
    .filter((a): a is Article => !!a);
}

// Headline matches come first, then articles that only mention the query in the
// body, each newest (or oldest) first. `headlineOnly` skips the slow body scan so
// the client can show the first results while the full search finishes.
async function searchPayload(
  queryFormsLower: string[],
  page: number,
  pageSize: number,
  filters: SearchFilters,
  headlineOnly: boolean,
) {
  const payload = await getPayload({ config });
  const base: Where[] = [{ _status: { equals: "published" } }];
  if (filters.section) base.push({ section: { equals: filters.section } });
  const since = searchRangeStart(filters.range);
  if (since) base.push({ publishedDate: { greater_than_equal: since.toISOString() } });
  const sort = filters.sort === "oldest" ? "publishedDate" : "-publishedDate";

  const headlineWhere: Where = { and: [...base, matchAny(HEADLINE_FIELDS, queryFormsLower)] };
  const bodyWhere: Where = { and: [...base, matchAny(BODY_FIELDS, queryFormsLower)] };
  const [headlineIds, bodyIds] = await Promise.all([
    matchingIds(payload, headlineWhere, sort),
    headlineOnly ? Promise.resolve([]) : matchingIds(payload, bodyWhere, sort),
  ]);
  const headlineSet = new Set(headlineIds);
  const ids = [...headlineIds, ...bodyIds.filter((id) => !headlineSet.has(id))];

  const offset = (page - 1) * pageSize;
  return {
    articles: await articlesByIds(payload, ids.slice(offset, offset + pageSize)),
    totalDocs: ids.length,
    totalPages: Math.ceil(ids.length / pageSize),
    page,
  };
}

export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateLimitKey = `search:${forwardedFor || "anonymous"}`;
  const rateLimit = checkRateLimit(
    rateLimitKey,
    SEARCH_RATE_LIMIT,
    SEARCH_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many search requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const q = sanitizeSearchQuery(request.nextUrl.searchParams.get("q"));
  const page = parseSearchPage(request.nextUrl.searchParams.get("page"));
  const pageSize = parseSearchPageSize(request.nextUrl.searchParams.get("pageSize"));
  const filters = parseSearchFilters(request.nextUrl.searchParams);
  const headlineOnly = request.nextUrl.searchParams.get("part") === "headline";

  if (!q) {
    return Response.json({
      articles: [],
      page,
      pageSize,
      query: "",
      totalPages: 0,
      totalResults: 0,
    });
  }

  const forms = queryForms(q);
  const queryFormsLower = forms.map((form) => form.toLowerCase()).filter((form) => form.length > 0);

  try {
    const result = await searchPayload(queryFormsLower, page, pageSize, filters, headlineOnly);

    return Response.json({
      articles: result.articles,
      page: result.page,
      pageSize,
      query: q,
      totalPages: result.totalPages,
      totalResults: result.totalDocs,
      partial: headlineOnly,
    });
  } catch {
    return Response.json({
      articles: [],
      page,
      pageSize: DEFAULT_SEARCH_PAGE_SIZE,
      query: q,
      totalPages: 0,
      totalResults: 0,
    });
  }
}
