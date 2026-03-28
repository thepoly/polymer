import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { Pool } from "pg";

const responseHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

let legacyPool: Pool | null = null;

function getLegacyPool(): Pool {
  if (!legacyPool) {
    legacyPool = new Pool({ connectionString: process.env.LEGACY_DATABASE_URI });
  }
  return legacyPool;
}

export async function GET() {
  // Try legacy DB first
  try {
    const pool = getLegacyPool();
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT MIN(wp.first_published_at) AS oldest
         FROM core_articlepage a
         JOIN wagtailcore_page wp ON a.page_ptr_id = wp.id
         WHERE wp.live = true AND wp.first_published_at IS NOT NULL`,
      );
      const oldest: Date | null = rows[0]?.oldest ?? null;
      if (oldest) {
        const year = new Date(oldest).getFullYear();
        return NextResponse.json(
          { subtitle: `Search archives date back to ${year}` },
          { headers: responseHeaders },
        );
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[archive-date] Legacy DB error:", err);
  }

  // Fallback: oldest Payload article
  try {
    const payload = await getPayload({ config });
    const results = await payload.find({
      collection: "articles",
      where: { _status: { equals: "published" } },
      sort: "publishedDate",
      limit: 1,
      depth: 0,
    });
    const oldest = results.docs[0]?.publishedDate;
    if (oldest) {
      const date = new Date(oldest);
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return NextResponse.json(
        { subtitle: `Search archives date back to ${label}` },
        { headers: responseHeaders },
      );
    }
  } catch (err) {
    console.error("[archive-date] Payload error:", err);
  }

  return NextResponse.json({ subtitle: null }, { headers: responseHeaders });
}
