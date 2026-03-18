import { NextRequest } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";
import { Article } from "@/components/FrontPage/types";
import { Article as PayloadArticle } from "@/payload-types";
import { Pool } from "pg";

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

// Title=4, kicker=3, excerpt/author=2, body=1
function scoreArticle(article: Article, bodyText: string, ql: string): number {
  let s = 0;
  if (article.title.toLowerCase().includes(ql)) s += 4;
  if (article.kicker?.toLowerCase().includes(ql)) s += 3;
  if (article.excerpt?.toLowerCase().includes(ql)) s += 2;
  if (article.author?.toLowerCase().includes(ql)) s += 2;
  if (bodyText.toLowerCase().includes(ql)) s += 1;
  return s;
}

function dateCmp(a: Article, b: Article): number {
  const ta = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
  const tb = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
  return tb - ta;
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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, articles: Article[]) => {
    try { controller.enqueue(encoder.encode(JSON.stringify({ articles }) + "\n")); } catch {}
  };

  if (!q) {
    return new Response('{"articles":[]}\n', { headers: { "Content-Type": "application/x-ndjson" } });
  }

  const ql = q.toLowerCase();
  const forms = queryForms(q);

  const stream = new ReadableStream({
    async start(controller) {
      let pending = 2;
      const finish = () => { if (--pending === 0) { try { controller.close(); } catch {} } };

      try {
        const payload = await getPayload({ config });

        // Payload pipeline
        (async () => {
          try {
            const orConditions = ["title", "subdeck", "kicker"].flatMap(field =>
              forms.map(f => ({ [field]: { contains: f } }))
            );
            const [textDocs, users] = await Promise.all([
              payload.find({
                collection: "articles",
                where: { and: [{ _status: { equals: "published" } }, { or: orConditions }] },
                sort: "-publishedDate", limit: 0, depth: 2,
              }).then(r => r.docs),
              payload.find({
                collection: "users",
                where: { or: [{ firstName: { contains: q } }, { lastName: { contains: q } }] },
                limit: 50, depth: 0,
              }).then(r => r.docs).catch(() => [] as never[]),
            ]);

            const authorDocs = users.length > 0
              ? await payload.find({
                  collection: "articles",
                  where: { and: [{ _status: { equals: "published" } }, { authors: { in: users.map((u: { id: number }) => u.id) } }] },
                  sort: "-publishedDate", limit: 0, depth: 2,
                }).then(r => r.docs).catch(() => [] as PayloadArticle[])
              : [] as PayloadArticle[];

            const allDocs = new Map<number, PayloadArticle>();
            for (const doc of [...textDocs, ...authorDocs]) allDocs.set(doc.id, doc);

            const scored = [...allDocs.values()]
              .map(doc => {
                const article = formatArticle(doc, { absoluteDate: true });
                if (!article) return null;
                return { article, score: scoreArticle(article, extractLexicalText(doc.content), ql) };
              })
              .filter((x): x is { article: Article; score: number } => x !== null);

            scored.sort((a, b) => b.score - a.score || dateCmp(a.article, b.article));
            send(controller, scored.map(s => s.article));
          } catch { send(controller, []); }
          finish();
        })();

        // Legacy pipeline
        (async () => {
          try {
            const rows = await searchLegacy(forms);
            const scored = rows
              .map(({ article, bodyText }) => ({ article, score: scoreArticle(article, bodyText, ql) }));
            scored.sort((a, b) => b.score - a.score || dateCmp(a.article, b.article));
            send(controller, scored.map(s => s.article));
          } catch { send(controller, []); }
          finish();
        })();

      } catch {
        send(controller, []);
        pending = 0;
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
