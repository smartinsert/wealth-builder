import { NextResponse } from "next/server";
import yahooFinanceDefault from "yahoo-finance2";

const yahooFinance = new (yahooFinanceDefault as any)();

// Timeframe map in days
const timeframes: Record<string, number> = {
  "1W": 7,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { holdings, timeframe } = body;

    if (!timeframes[timeframe]) {
      return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
    }

    const days = timeframes[timeframe];
    const period1 = new Date();
    period1.setDate(period1.getDate() - days);
    const period1Str = period1.toISOString().split("T")[0];

    let pastValue = 0;
    let currentValue = 0;

    // Fetch Nifty 50 historical
    let niftyReturns = 0;
    try {
      const niftyHist = await yahooFinance.historical("^NSEI", {
        period1: period1Str,
        interval: "1d",
      });
      if (niftyHist.length > 0) {
        const startPrice = niftyHist[0].close;
        const endPrice = niftyHist[niftyHist.length - 1].close;
        niftyReturns = ((endPrice - startPrice) / startPrice) * 100;
      }
    } catch (e) {
      console.error("Nifty fetch failed", e);
    }

    // Attempt to fetch portfolio historical
    await Promise.all(
      holdings.map(async (h: any) => {
        if (h.exchange === "MF") return; // Skip MFs as YF ISIN mapping is unreliable
        
        const suffix = h.exchange === "BSE" ? ".BO" : ".NS";
        const symbol = `${h.tradingsymbol}${suffix}`;
        
        try {
          const hist = await yahooFinance.historical(symbol, {
            period1: period1Str,
            interval: "1d",
          });
          
          if (hist.length > 0) {
            const startPrice = hist[0].close;
            // Weigh by current quantity
            pastValue += startPrice * h.quantity;
            currentValue += h.last_price * h.quantity;
          }
        } catch (e) {
          // Ignore unsupported symbols
        }
      })
    );

    let portfolioReturns = 0;
    if (pastValue > 0) {
      portfolioReturns = ((currentValue - pastValue) / pastValue) * 100;
    }

    return NextResponse.json({
      success: true,
      niftyReturns,
      portfolioReturns,
      timeframe,
    });

  } catch (error) {
    console.error("Historical API error:", error);
    return NextResponse.json({ error: "Failed to fetch historical" }, { status: 500 });
  }
}
