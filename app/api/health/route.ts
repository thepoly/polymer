import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkPrimaryDatabase() {
  const payload = await getPayload({ config });

  await payload.find({
    collection: "layout",
    limit: 1,
    depth: 0,
    pagination: false,
  });
}

export async function GET() {
  try {
    await checkPrimaryDatabase();

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          app: "ok",
          database: "ok",
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Health check failed", error);

    return NextResponse.json(
      {
        status: "error",
        checks: {
          app: "ok",
          database: "error",
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}

export async function HEAD() {
  try {
    await checkPrimaryDatabase();
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Health check failed", error);

    return new NextResponse(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
}
