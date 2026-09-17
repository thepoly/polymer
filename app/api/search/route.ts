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

const SEARCH_RATE_LIMIT = 80; // typing fires a search per pause; headroom for shared campus IPs
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

function searchConditions(queryFormsLower: string[], filters: SearchFilters) {
  const base: Where[] = [{ _status: { equals: "published" } }];
  if (filters.section) base.push({ section: { equals: filters.section } });
  const since = searchRangeStart(filters.range);
  if (since) base.push({ publishedDate: { greater_than_equal: since.toISOString() } });
  return {
    // Short fields only: fast enough to show while the body scan is still running.
    headlineWhere: { and: [...base, matchAny(HEADLINE_FIELDS, queryFormsLower)] } as Where,
    allWhere: { and: [...base, matchAny([...HEADLINE_FIELDS, ...BODY_FIELDS], queryFormsLower)] } as Where,
    sort: filters.sort === "oldest" ? "publishedDate" : "-publishedDate",
  };
}

async function searchPayload(
  queryFormsLower: string[],
  page: number,
  pageSize: number,
  filters: SearchFilters,
) {
  const payload = await getPayload({ config });
  const { allWhere, sort } = searchConditions(queryFormsLower, filters);
  const result = await payload.find({
    collection: "articles",
    where: allWhere,
    sort,
    limit: pageSize,
    page,
    depth: 1,
    select: articleSearchSelect,
  });

  return {
    articles: result.docs
      .map((doc) => formatArticle(doc as unknown as Parameters<typeof formatArticle>[0], { absoluteDate: true }))
      .filter((a): a is Article => a !== null),
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page ?? page,
  };
}

// Streams the search as it runs: headline matches (title, subdeck, kicker, write-in
// authors) come back in small batches within a few hundred ms, then the full scan's
// page — body mentions included, newest first — replaces them, so later matches
// displace earlier ones in the list and the count climbs as it goes.
const STREAM_BATCH = 5;

type SearchStreamEvent = {
  articles?: Article[];
  order?: number[];
  totalResults?: number;
  totalPages?: number;
  partial?: boolean;
  done?: boolean;
  error?: string;
};

function streamSearch(
  queryFormsLower: string[],
  page: number,
  pageSize: number,
  filters: SearchFilters,
): Response {
  const encoder = new TextEncoder();
  const offset = (page - 1) * pageSize;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SearchStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Reader went away (new keystroke aborted this search).
        }
      };
      try {
        const payload = await getPayload({ config });
        const { headlineWhere, allWhere, sort } = searchConditions(queryFormsLower, filters);
        const allIdsPromise = matchingIds(payload, allWhere, sort);
        allIdsPromise.catch(() => {});

        const sent = new Set<number>();
        const order: number[] = [];
        const sendBatch = async (ids: number[]) => {
          const fresh = ids.filter((id) => !sent.has(id));
          fresh.forEach((id) => sent.add(id));
          order.push(...ids);
          send({ articles: await articlesByIds(payload, fresh), order: [...order] });
        };

        const headlineIds = await matchingIds(payload, headlineWhere, sort);
        send({ totalResults: headlineIds.length, partial: true });
        const headlinePage = headlineIds.slice(offset, offset + pageSize);
        for (let i = 0; i < headlinePage.length; i += STREAM_BATCH) {
          await sendBatch(headlinePage.slice(i, i + STREAM_BATCH));
        }

        const allIds = await allIdsPromise;
        const finalPage = allIds.slice(offset, offset + pageSize);
        order.length = 0;
        order.push(...finalPage);
        send({
          articles: await articlesByIds(payload, finalPage.filter((id) => !sent.has(id))),
          order: finalPage,
          totalResults: allIds.length,
          totalPages: Math.ceil(allIds.length / pageSize),
          done: true,
        });
      } catch {
        send({ error: "Search failed. Please try again.", done: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Tell nginx not to buffer, or the batches arrive as one chunk.
      "X-Accel-Buffering": "no",
    },
  });
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

  if (request.nextUrl.searchParams.get("stream") === "1") {
    return streamSearch(queryFormsLower, page, pageSize, filters);
  }

  try {
    const result = await searchPayload(queryFormsLower, page, pageSize, filters);

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
