import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";
import { Article } from "@/components/FrontPage/types";
import { Pool } from "pg";

let legacyPool: Pool | null = null;

function getLegacyPool(): Pool {
  if (!legacyPool) {
    legacyPool = new Pool({ connectionString: process.env.LEGACY_DATABASE_URI });
  }
  return legacyPool;
}

function mapLegacyRow(row: {
  legacy_id: number;
  wagtail_title: string;
  headline: string;
  subdeck: string | null;
  summary: string | null;
  kicker_text: string | null;
  url_path: string;
  first_published_at: string | null;
}): Article {
  // url_path looks like /home/news/2026/03/grace-meehan-candidate-profile/
  // Strip leading /home to get /{section}/{year}/{month}/{slug}/
  const cleanPath = row.url_path.replace(/^\/home/, "");
  const section = cleanPath.split("/").filter(Boolean)[0] || "news";

  const date = row.first_published_at ? new Date(row.first_published_at) : null;
  const dateString = date
    ? date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const rawTitle = row.headline || row.wagtail_title;
  const title = rawTitle.replace(/<[^>]*>/g, "").trim();

  const rawExcerpt = row.subdeck || row.summary || "";
  const excerpt = rawExcerpt.replace(/<[^>]*>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();

  return {
    id: `legacy-${row.legacy_id}`,
    slug: cleanPath,
    title,
    excerpt,
    author: null,
    date: dateString,
    image: null,
    section,
    kicker: row.kicker_text || null,
    publishedDate: row.first_published_at,
    externalUrl: `https://poly.rpi.edu${cleanPath}`,
  };
}

async function searchLegacy(q: string): Promise<Article[]> {
  const pool = getLegacyPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT
        wp.id AS legacy_id,
        wp.title AS wagtail_title,
        a.headline,
        a.subdeck,
        a.summary,
        k.title AS kicker_text,
        wp.url_path,
        wp.first_published_at
      FROM core_articlepage a
      JOIN wagtailcore_page wp ON a.page_ptr_id = wp.id
      LEFT JOIN core_kicker k ON a.kicker_id = k.id
      WHERE wp.live = true
        AND (
          a.headline ILIKE $1
          OR a.subdeck ILIKE $1
          OR k.title ILIKE $1
          OR wp.title ILIKE $1
        )
      ORDER BY wp.first_published_at DESC`,
      [`%${q}%`],
    );
    return rows.map(mapLegacyRow);
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ articles: [] });
  }

  const payload = await getPayload({ config });

  const [payloadResults, legacyResults] = await Promise.all([
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
      .then((r) => r.docs.map((doc) => formatArticle(doc, { absoluteDate: true })).filter((a): a is Article => a !== null)),
    searchLegacy(q).catch((err) => {
      console.error("[search] Legacy DB error:", err);
      return [] as Article[];
    }),
  ]);

  // Combine and sort by publishedDate descending
  const combined = [...payloadResults, ...legacyResults].sort((a, b) => {
    const ta = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
    const tb = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ articles: combined });
}
