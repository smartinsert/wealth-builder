import { NextResponse } from "next/server";
import { discoverFromSources } from "@/lib/discovery";
import { saveDiscoveries, getDiscoveries } from "@/lib/kv";

// GET /api/discover — return cached discoveries from KV
export async function GET() {
  try {
    const discoveries = await getDiscoveries();

    return NextResponse.json({
      success: true,
      discoveries,
      count: discoveries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API /discover GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve discoveries",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/discover — trigger a fresh discovery run
export async function POST(req: Request) {
  try {
    const { modelId } = await req.json().catch(() => ({ modelId: "google/gemini-2.5-flash" }));
    const discoveries = await discoverFromSources(modelId);

    // Persist to KV (or in-memory fallback)
    await saveDiscoveries(discoveries);

    const totalTickers = discoveries.reduce(
      (sum, d) => sum + d.tickers.length,
      0
    );

    return NextResponse.json({
      success: true,
      discoveries,
      meta: {
        sourcesScanned: discoveries.length,
        totalTickers,
        sectors: [
          ...new Set(discoveries.flatMap((d) => d.sectors)),
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API /discover POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Discovery run failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
