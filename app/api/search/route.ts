import { NextRequest } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";
import { Article } from "@/components/FrontPage/types";
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  parseSearchPage,
  parseSearchPageSize,
  sanitizeSearchQuery,
} from "@/utils/search";
import { checkRateLimit } from "@/utils/rateLimit";

const SEARCH_RATE_LIMIT = 40;
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

async function searchPayload(queryFormsLower: string[], page: number, pageSize: number) {
  const payload = await getPayload({ config });
  const articleSearchSelect = {
    title: true,
    slug: true,
    subdeck: true,
    featuredImage: true,
    section: true,
    kicker: true,
    publishedDate: true,
    createdAt: true,
    authors: true,
    writeInAuthors: true,
  } as const;

  // Build OR conditions: match any query form in title, subdeck, or kicker
  const orConditions: Record<string, unknown>[] = [];
  for (const form of queryFormsLower) {
    orConditions.push({ title: { like: form } });
    orConditions.push({ subdeck: { like: form } });
    orConditions.push({ kicker: { like: form } });
    orConditions.push({ 'writeInAuthors.name': { like: form } });
  }

  const result = await payload.find({
    collection: "articles",
    where: {
      and: [
        { _status: { equals: "published" } },
        { or: orConditions },
      ],
    },
    sort: "-publishedDate",
    limit: pageSize,
    page,
    depth: 1,
    select: articleSearchSelect,
  });

  const articles = result.docs
    .map((doc) => formatArticle(doc as PayloadSearchArticle, { absoluteDate: true }))
    .filter((a): a is Article => a !== null);

  return {
    articles,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page ?? page,
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
    const result = await searchPayload(queryFormsLower, page, pageSize);

    return Response.json({
      articles: result.articles,
      page: result.page,
      pageSize,
      query: q,
      totalPages: result.totalPages,
      totalResults: result.totalDocs,
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
