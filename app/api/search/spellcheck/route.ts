import { NextRequest } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { Pool } from "pg";
import { sanitizeSearchQuery } from "@/utils/search";
import { checkRateLimit } from "@/utils/rateLimit";

const SPELLCHECK_RATE_LIMIT = 12;
const SPELLCHECK_RATE_LIMIT_WINDOW_MS = 10_000;

let legacyPool: Pool | null = null;
function getLegacyPool(): Pool {
  if (!legacyPool) legacyPool = new Pool({ connectionString: process.env.LEGACY_DATABASE_URI });
  return legacyPool;
}

// Corpus: word → frequency, cached for 10 minutes
let cachedCorpus: Map<string, number> | null = null;
let corpusAge = 0;
const CORPUS_TTL = 10 * 60 * 1000;

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

function extractWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
}

async function getCorpus(): Promise<Map<string, number>> {
  if (cachedCorpus && Date.now() - corpusAge < CORPUS_TTL) return cachedCorpus;

  const corpus = new Map<string, number>();

  // Legacy DB words from headlines
  try {
    const client = await getLegacyPool().connect();
    try {
      const { rows } = await client.query<{ word: string; freq: string }>(
        `SELECT lower(word) AS word, count(*) AS freq
         FROM (
           SELECT regexp_split_to_table(
             lower(regexp_replace(headline, '[^a-zA-Z\\s]', '', 'g')),
             '\\s+'
           ) AS word
           FROM core_articlepage
           JOIN wagtailcore_page wp ON page_ptr_id = wp.id
           WHERE wp.live = true
         ) words
         WHERE length(word) > 2
         GROUP BY lower(word)`,
      );
      for (const row of rows) corpus.set(row.word, parseInt(row.freq, 10));
    } finally {
      client.release();
    }
  } catch {}

  // Payload DB words from titles
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "articles",
      where: { _status: { equals: "published" } },
      limit: 0,
      depth: 0,
      select: {
        plainTitle: true,
      },
    });
    for (const doc of docs) {
      for (const w of extractWords(doc.plainTitle || '')) {
        corpus.set(w, (corpus.get(w) || 0) + 1);
      }
    }
  } catch {}

  cachedCorpus = corpus;
  corpusAge = Date.now();
  return corpus;
}

function correctWord(word: string, corpus: Map<string, number>): string {
  if (corpus.has(word)) return word;

  let best = word;
  let bestDist = 3;
  let bestFreq = 0;

  for (const [corpusWord, freq] of corpus) {
    if (Math.abs(corpusWord.length - word.length) > 2) continue;
    const dist = levenshtein(word, corpusWord);
    if (dist < bestDist || (dist === bestDist && freq > bestFreq)) {
      best = corpusWord;
      bestDist = dist;
      bestFreq = freq;
    }
  }

  return bestDist <= 2 ? best : word;
}

export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateLimitKey = `spellcheck:${forwardedFor || "anonymous"}`;
  const rateLimit = checkRateLimit(
    rateLimitKey,
    SPELLCHECK_RATE_LIMIT,
    SPELLCHECK_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      { suggestion: null },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const q = sanitizeSearchQuery(request.nextUrl.searchParams.get("q"));
  if (!q) return Response.json({ suggestion: null });

  try {
    const corpus = await getCorpus();
    if (corpus.size === 0) return Response.json({ suggestion: null });

    const words = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const cleaned = words.map((w) => w.replace(/[^a-z]/g, ""));
    const corrected = cleaned.map((w) => (w.length <= 2 ? w : correctWord(w, corpus)));
    const suggestion = corrected.join(" ");

    return Response.json({
      suggestion: suggestion !== cleaned.join(" ") ? suggestion : null,
    });
  } catch {
    return Response.json({ suggestion: null });
  }
}
