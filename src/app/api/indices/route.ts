import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET() {
  try {
    const symbols = ["^NSEI", "^NSEBANK"];
    const quotes = await Promise.all(
      symbols.map((symbol) => yahooFinance.quote(symbol))
    );

    const data = quotes.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to fetch indices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch indices" },
      { status: 500 }
    );
  }
}
