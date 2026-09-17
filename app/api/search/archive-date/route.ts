import { NextResponse } from "next/server";

const responseHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

// Search reaches back to 2001. This used to be derived from the legacy Wagtail
// DB's MIN(first_published_at), but that column holds import dates, so it
// reported 2018 — later than what search actually covers.
const ARCHIVE_START_YEAR = 2001;

export async function GET() {
  return NextResponse.json(
    { subtitle: `Search archives date back to ${ARCHIVE_START_YEAR}` },
    { headers: responseHeaders },
  );
}
