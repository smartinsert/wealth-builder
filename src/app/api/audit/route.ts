import { NextResponse } from "next/server";
import { fetchHoldings, matchDiscoveriesWithHoldings } from "@/lib/portfolio";
import { getDiscoveries } from "@/lib/kv";

// GET /api/audit — run a full portfolio audit against cached discoveries
export async function GET() {
  try {
    // 1. Fetch live holdings from Kite (or demo fallback)
    const portfolio = await fetchHoldings();

    // 2. Get cached discoveries from KV (or in-memory)
    const discoveries = await getDiscoveries();

    if (discoveries.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No discoveries cached. Run POST /api/discover first to populate recommendations.",
        portfolio: {
          holdingCount: portfolio.holdingCount,
          totalValue: portfolio.totalValue,
          totalPnl: portfolio.totalPnl,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Compare discoveries against holdings
    const auditResult = matchDiscoveriesWithHoldings(discoveries, portfolio);

    return NextResponse.json({
      success: true,
      audit: {
        alreadyOwned: auditResult.alreadyOwned,
        newOpportunities: auditResult.newOpportunities,
        summary: {
          ownedCount: auditResult.alreadyOwned.length,
          newCount: auditResult.newOpportunities.length,
          holdingCount: auditResult.portfolio.holdingCount,
          totalPortfolioValue: auditResult.portfolio.totalValue,
          totalPnl: auditResult.portfolio.totalPnl,
          discoveriesAnalyzed: auditResult.discoveryCount,
        },
      },
      timestamp: auditResult.timestamp,
    });
  } catch (error) {
    console.error("[API /audit GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Portfolio audit failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
