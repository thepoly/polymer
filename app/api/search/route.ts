import { NextRequest } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";
import { Article } from "@/components/FrontPage/types";
import { Pool } from "pg";
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  parseSearchPage,
  parseSearchPageSize,
  sanitizeSearchQuery,
} from "@/utils/search";
import { checkRateLimit } from "@/utils/rateLimit";
import { getPostHogClient } from "@/lib/posthog-server";

const SEARCH_RATE_LIMIT = 40;
const SEARCH_RATE_LIMIT_WINDOW_MS = 10_000;

let legacyPool: Pool | null = null;
function getLegacyPool(): Pool {
  if (!legacyPool) legacyPool = new Pool({ connectionString: process.env.LEGACY_DATABASE_URI });
  return legacyPool;
}

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

function extractLexicalText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof obj.text === "string") parts.push(obj.text);
  if (Array.isArray(obj.children)) for (const c of obj.children) parts.push(extractLexicalText(c));
  return parts.join(" ");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function textIncludesAny(text: string | null | undefined, queryFormsLower: string[]): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return queryFormsLower.some((query) => query.length > 0 && normalized.includes(query));
}

// Title=4, kicker=3, excerpt/author=2, body=1
function scoreArticle(article: Article, bodyText: string, queryFormsLower: string[]): number {
  let s = 0;
  if (textIncludesAny(article.title, queryFormsLower)) s += 4;
  if (textIncludesAny(article.kicker, queryFormsLower)) s += 3;
  if (textIncludesAny(article.excerpt, queryFormsLower)) s += 2;
  if (textIncludesAny(article.author, queryFormsLower)) s += 2;
  if (textIncludesAny(bodyText, queryFormsLower)) s += 1;
  return s;
}

function articleTimestamp(article: Article): number {
  const candidates = [article.publishedDate, article.createdAt, article.date];
  for (const value of candidates) {
    if (!value) continue;
    const t = new Date(value).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

function dateCmp(a: Article, b: Article): number {
  return articleTimestamp(b) - articleTimestamp(a);
}

function articleKey(article: Article): string {
  return article.externalUrl ?? `${article.slug}|${article.publishedDate ?? ""}|${article.id}`;
}

type LegacyRow = {
  legacy_id: number;
  wagtail_title: string;
  headline: string;
  subdeck: string | null;
  summary: string | null;
  body: string | null;
  kicker_text: string | null;
  url_path: string;
  first_published_at: string | null;
  authors: string | null;
};

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
  content?: unknown;
  _status?: string | null;
};

function mapLegacyRow(row: LegacyRow): Article {
  const cleanPath = row.url_path.replace(/^\/home/, "");
  const section = cleanPath.split("/").filter(Boolean)[0] || "news";
  const date = row.first_published_at ? new Date(row.first_published_at) : null;
  const dateString = date ? date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  return {
    id: `legacy-${row.legacy_id}`,
    slug: cleanPath,
    title: stripHtml(row.headline || row.wagtail_title),
    excerpt: stripHtml(row.subdeck || row.summary || ""),
    author: row.authors || null,
    date: dateString,
    image: null,
    section,
    kicker: row.kicker_text || null,
    publishedDate: row.first_published_at,
    externalUrl: `https://poly.rpi.edu${cleanPath}`,
  };
}

async function searchLegacy(forms: string[]): Promise<{ article: Article; bodyText: string }[]> {
  const pool = getLegacyPool();
  const client = await pool.connect();
  try {
    // $1 = array of ILIKE patterns for all query forms
    // $2 = bare query (no separators) for normalized column comparison
    const likePatterns = forms.map(f => `%${f}%`);
    const bare = `%${forms[forms.length - 1]}%`; // last form is all-separators-stripped

    const { rows } = await client.query<LegacyRow>(
      `SELECT
        wp.id AS legacy_id,
        wp.title AS wagtail_title,
        a.headline,
        a.subdeck,
        a.summary,
        a.body,
        k.title AS kicker_text,
        wp.url_path,
        wp.first_published_at,
        STRING_AGG(c.name, ' & ' ORDER BY r.id) AS authors
      FROM core_articlepage a
      JOIN wagtailcore_page wp ON a.page_ptr_id = wp.id
      LEFT JOIN core_kicker k ON a.kicker_id = k.id
      LEFT JOIN core_articleauthorrelationship r ON r.article_id = a.page_ptr_id
      LEFT JOIN core_contributor c ON c.id = r.author_id
      WHERE wp.live = true
        AND (
          a.headline ILIKE ANY($1::text[])
          OR a.summary ILIKE ANY($1::text[])
          OR a.body ILIKE ANY($1::text[])
          OR k.title ILIKE ANY($1::text[])
          OR wp.title ILIKE ANY($1::text[])
          OR REPLACE(REPLACE(a.headline, '-', ''), ' ', '') ILIKE $2
          OR REPLACE(REPLACE(a.summary, '-', ''), ' ', '') ILIKE $2
          OR REPLACE(a.body, '-', '') ILIKE $2
          OR EXISTS (
            SELECT 1 FROM core_articleauthorrelationship r2
            JOIN core_contributor c2 ON c2.id = r2.author_id
            WHERE r2.article_id = a.page_ptr_id AND c2.name ILIKE ANY($1::text[])
          )
        )
      GROUP BY wp.id, a.page_ptr_id, k.title
      ORDER BY wp.first_published_at DESC`,
      [likePatterns, bare],
    );
    return rows.map(row => ({
      article: mapLegacyRow(row),
      bodyText: stripHtml(row.body || ""),
    }));
  } finally {
    client.release();
  }
}

async function searchPayload(queryFormsLower: string[]) {
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
    content: true,
  } as const;
  const allDocs = await payload
    .find({
      collection: "articles",
      where: { _status: { equals: "published" } },
      sort: "-publishedDate",
      limit: 0,
      depth: 1,
      select: articleSearchSelect,
    })
    .then((result) => result.docs as PayloadSearchArticle[]);

  return allDocs
    .map((doc) => {
      const article = formatArticle(doc, { absoluteDate: true });
      if (!article) return null;
      const score = scoreArticle(article, extractLexicalText(doc.content), queryFormsLower);
      if (score <= 0) return null;
      return { article, score };
    })
    .filter((entry): entry is { article: Article; score: number } => entry !== null);
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
    const [payloadResults, legacyRows] = await Promise.all([
      searchPayload(queryFormsLower).catch(() => [] as { article: Article; score: number }[]),
      searchLegacy(forms).catch(() => [] as { article: Article; bodyText: string }[]),
    ]);

    const merged = new Map<string, { article: Article; score: number }>();
    for (const result of payloadResults) {
      merged.set(articleKey(result.article), result);
    }
    for (const row of legacyRows) {
      const result = {
        article: row.article,
        score: scoreArticle(row.article, row.bodyText, queryFormsLower),
      };
      const key = articleKey(result.article);
      const existing = merged.get(key);
      if (!existing || result.score > existing.score) {
        merged.set(key, result);
      }
    }

    const allResults = [...merged.values()].sort(
      (a, b) => dateCmp(a.article, b.article) || a.article.title.localeCompare(b.article.title),
    );
    const totalResults = allResults.length;
    const totalPages = totalResults === 0 ? 0 : Math.ceil(totalResults / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const articles = allResults.slice(start, start + pageSize).map((entry) => entry.article);

    const posthog = getPostHogClient();
    const payload = await getPayload({ config });
    const { user: authUser } = await payload.auth({ headers: request.headers });
    const distinctId = authUser ? String(authUser.id) : (forwardedFor || "anonymous");

    posthog?.capture({
      distinctId,
      event: "search_api_called",
      properties: {
        query: q,
        total_results: totalResults,
        page: safePage,
        is_authenticated: !!authUser,
        $process_person_profile: !!authUser,
      },
    });

    return Response.json({
      articles,
      page: safePage,
      pageSize,
      query: q,
      totalPages,
      totalResults,
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
