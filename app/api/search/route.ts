import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { formatArticle } from "@/utils/formatArticle";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ articles: [] });
  }

  const payload = await getPayload({ config });

  const results = await payload.find({
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
    limit: 20,
    depth: 2,
  });

  const articles = results.docs.map(formatArticle).filter(Boolean);

  return NextResponse.json({ articles });
}
