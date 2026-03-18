import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";
import { Article } from "@/components/FrontPage/types";
import { Article as PayloadArticle } from "@/payload-types";
import { Pool } from "pg";

let legacyPool: Pool | null = null;

function getLegacyPool(): Pool {
  if (!legacyPool) {
    legacyPool = new Pool({ connectionString: process.env.LEGACY_DATABASE_URI });
  }
  return legacyPool;
}

// Extract plain text from Payload Lexical JSON
function extractLexicalText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof obj.text === "string") parts.push(obj.text);
  if (Array.isArray(obj.children)) {
    for (const child of obj.children) parts.push(extractLexicalText(child));
  }
  return parts.join(" ");
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Relevance scoring: title=4, kicker=3, excerpt/author=2, body=1
function scoreArticle(article: Article, bodyText: string, ql: string): number {
  let s = 0;
  if (article.title.toLowerCase().includes(ql)) s += 4;
  if (article.kicker?.toLowerCase().includes(ql)) s += 3;
  if (article.excerpt?.toLowerCase().includes(ql)) s += 2;
  if (article.author?.toLowerCase().includes(ql)) s += 2;
  if (bodyText.toLowerCase().includes(ql)) s += 1;
  return s;
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

function mapLegacyRow(row: LegacyRow): Article {
  const cleanPath = row.url_path.replace(/^\/home/, "");
  const section = cleanPath.split("/").filter(Boolean)[0] || "news";
  const date = row.first_published_at ? new Date(row.first_published_at) : null;
  const dateString = date
    ? date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const title = stripHtml(row.headline || row.wagtail_title);
  const excerpt = stripHtml(row.subdeck || row.summary || "");
  return {
    id: `legacy-${row.legacy_id}`,
    slug: cleanPath,
    title,
    excerpt,
    author: row.authors || null,
    date: dateString,
    image: null,
    section,
    kicker: row.kicker_text || null,
    publishedDate: row.first_published_at,
    externalUrl: `https://poly.rpi.edu${cleanPath}`,
  };
}

async function searchLegacy(q: string): Promise<{ article: Article; bodyText: string }[]> {
  const pool = getLegacyPool();
  const client = await pool.connect();
  try {
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
          a.headline ILIKE $1
          OR a.summary ILIKE $1
          OR a.body ILIKE $1
          OR k.title ILIKE $1
          OR wp.title ILIKE $1
          OR EXISTS (
            SELECT 1 FROM core_articleauthorrelationship r2
            JOIN core_contributor c2 ON c2.id = r2.author_id
            WHERE r2.article_id = a.page_ptr_id AND c2.name ILIKE $1
          )
        )
      GROUP BY wp.id, a.page_ptr_id, k.title
      ORDER BY wp.first_published_at DESC`,
      [`%${q}%`],
    );
    return rows.map((row) => ({
      article: mapLegacyRow(row),
      bodyText: stripHtml(row.body || ""),
    }));
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ articles: [] });
  }

  const ql = q.toLowerCase();
  const payload = await getPayload({ config });

  // Step 1: run title/kicker/subdeck search, user lookup, and legacy search in parallel
  const [payloadDocs, matchingUsers, legacyRows] = await Promise.all([
    payload
      .find({
        collection: "articles",
        where: {
          and: [
            { _status: { equals: "published" } },
            {
              or: [
                { title: { contains: q } },
                { subdeck: { contains: q } },
                { kicker: { contains: q } },
              ],
            },
          ],
        },
        sort: "-publishedDate",
        limit: 0,
        depth: 2,
      })
      .then((r) => r.docs),
    payload
      .find({
        collection: "users",
        where: {
          or: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        },
        limit: 50,
        depth: 0,
      })
      .then((r) => r.docs)
      .catch(() => []),
    searchLegacy(q).catch((err) => {
      console.error("[search] Legacy DB error:", err);
      return [] as { article: Article; bodyText: string }[];
    }),
  ]);

  // Step 2: author-based article search (sequential, needs user IDs from step 1)
  let authorDocs: PayloadArticle[] = [];
  if (matchingUsers.length > 0) {
    const authorIds = matchingUsers.map((u) => u.id);
    authorDocs = await payload
      .find({
        collection: "articles",
        where: {
          and: [
            { _status: { equals: "published" } },
            { authors: { in: authorIds } },
          ],
        },
        sort: "-publishedDate",
        limit: 0,
        depth: 2,
      })
      .then((r) => r.docs)
      .catch(() => []);
  }

  // Merge Payload docs (dedup by ID)
  const allPayloadDocs = new Map<number, PayloadArticle>();
  for (const doc of [...payloadDocs, ...authorDocs]) {
    if (!allPayloadDocs.has(doc.id)) allPayloadDocs.set(doc.id, doc);
  }

  // Score and format Payload results
  type Scored = { article: Article; score: number };
  const scored: Scored[] = [];

  for (const doc of allPayloadDocs.values()) {
    const formatted = formatArticle(doc, { absoluteDate: true });
    if (!formatted) continue;
    const bodyText = extractLexicalText(doc.content);
    const score = scoreArticle(formatted, bodyText, ql);
    scored.push({ article: formatted, score });
  }

  // Score legacy results
  for (const { article, bodyText } of legacyRows) {
    const score = scoreArticle(article, bodyText, ql);
    scored.push({ article, score });
  }

  // Sort by score desc, then date desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ta = a.article.publishedDate ? new Date(a.article.publishedDate).getTime() : 0;
    const tb = b.article.publishedDate ? new Date(b.article.publishedDate).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ articles: scored.map((s) => s.article) });
}
