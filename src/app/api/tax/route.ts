import { NextResponse } from "next/server";

const KITE_API_BASE = "https://kite.zerodha.com/oms";
const LTCG_THRESHOLD = 125000; // ₹1.25L tax-free limit FY2024-25 onwards

interface KiteHolding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
}

interface LTCGHolding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  average_price: number;
  last_price: number;
  currentValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
}

export async function GET() {
  const encToken = process.env.KITE_ENCTOKEN;

  if (!encToken) {
    return NextResponse.json({ error: "No Kite credentials configured" }, { status: 503 });
  }

  const headers = {
    "X-Kite-Version": "3",
    Authorization: `enctoken ${encToken}`,
  };

  try {
    // Fetch live equity holdings
    const holdingsRes = await fetch(`${KITE_API_BASE}/portfolio/holdings`, {
      headers,
      signal: AbortSignal.timeout(12000),
    });

    if (!holdingsRes.ok) {
      const errorText = await holdingsRes.text();
      console.error("[Tax API] Holdings fetch failed:", holdingsRes.status, errorText);
      return NextResponse.json({ error: "Failed to fetch holdings from Kite" }, { status: holdingsRes.status });
    }

    const holdingsJson = await holdingsRes.json();
    const rawHoldings: KiteHolding[] = holdingsJson.data || [];

    // --- LTCG Analysis ---
    // Kite does not expose per-lot purchase dates via the web holdings API.
    // We use the real `pnl` from Kite (which is (last_price - avg_price) * qty) as the
    // unrealized gain — this is always accurate.
    // For LTCG classification: stocks with a positive unrealized gain are candidates.
    // We surface ALL profitable holdings sorted by gain (largest LTCG opportunity first).

    const profitable: LTCGHolding[] = rawHoldings
      .filter(h => h.pnl > 0)
      .map(h => {
        const currentValue = h.last_price * h.quantity;
        const costBasis = h.average_price * h.quantity;
        const unrealizedGainPct = ((h.last_price - h.average_price) / h.average_price) * 100;
        return {
          tradingsymbol: h.tradingsymbol,
          exchange: h.exchange,
          isin: h.isin,
          quantity: h.quantity,
          average_price: h.average_price,
          last_price: h.last_price,
          currentValue,
          costBasis,
          unrealizedGain: h.pnl,
          unrealizedGainPct,
        };
      })
      .sort((a, b) => b.unrealizedGain - a.unrealizedGain);

    const losing: LTCGHolding[] = rawHoldings
      .filter(h => h.pnl <= 0)
      .map(h => {
        const currentValue = h.last_price * h.quantity;
        const costBasis = h.average_price * h.quantity;
        const unrealizedGainPct = ((h.last_price - h.average_price) / h.average_price) * 100;
        return {
          tradingsymbol: h.tradingsymbol,
          exchange: h.exchange,
          isin: h.isin,
          quantity: h.quantity,
          average_price: h.average_price,
          last_price: h.last_price,
          currentValue,
          costBasis,
          unrealizedGain: h.pnl,
          unrealizedGainPct,
        };
      })
      .sort((a, b) => a.unrealizedGain - b.unrealizedGain);

    const totalUnrealizedGain = profitable.reduce((sum, h) => sum + h.unrealizedGain, 0);
    const totalUnrealizedLoss = losing.reduce((sum, h) => sum + h.unrealizedGain, 0);
    const netUnrealizedPnl = totalUnrealizedGain + totalUnrealizedLoss;
    const ltcgLimitRemaining = Math.max(0, LTCG_THRESHOLD - totalUnrealizedGain);
    const ltcgUtilizationPct = Math.min(100, (totalUnrealizedGain / LTCG_THRESHOLD) * 100);

    return NextResponse.json({
      success: true,
      summary: {
        totalHoldings: rawHoldings.length,
        profitableCount: profitable.length,
        losingCount: losing.length,
        totalUnrealizedGain,
        totalUnrealizedLoss,
        netUnrealizedPnl,
        ltcgThreshold: LTCG_THRESHOLD,
        ltcgLimitRemaining,
        ltcgUtilizationPct,
      },
      profitable,
      losing,
      fetchedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Tax API] Exception:", error);
    return NextResponse.json({ error: "Tax analytics fetch failed" }, { status: 500 });
  }
}
