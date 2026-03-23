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

interface LTCGHolding extends KiteHolding {
  currentValue: number;
  costBasis: number;
  unrealizedGain: number;       // Based on true PnL from Vite API
  unrealizedGainPct: number;
  type: "LTCG" | "STCG";
  buyDateStr: string;
}

interface ConsoleTLH {
  realizedStcg: number;
  realizedLtcg: number;
  unrealizedStcl: number;
  unrealizedLtcl: number;
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

    const mfHoldingsRes = await fetch(`${KITE_API_BASE}/mf/holdings`, {
      headers,
      signal: AbortSignal.timeout(12000),
    });

    if (!holdingsRes.ok || !mfHoldingsRes.ok) {
      const errorText = await holdingsRes.text();
      console.error("[Tax API] Holdings fetch failed:", holdingsRes.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_type === "TokenException") {
          return NextResponse.json({ error: "Your Kite session has expired. Please re-authenticate.", sessionExpired: true }, { status: 403 });
        }
      } catch (e) {
        // Ignore parse error
      }
      return NextResponse.json({ error: "Failed to fetch holdings from Kite" }, { status: holdingsRes.status });
    }

    const holdingsJson = await holdingsRes.json();
    const mfHoldingsJson = await mfHoldingsRes.json();

    const rawHoldings: KiteHolding[] = holdingsJson.data || [];
    const rawMfHoldings = mfHoldingsJson.data || [];

    const parsedMfHoldings: KiteHolding[] = rawMfHoldings.map((mf: any) => ({
      tradingsymbol: mf.fund,
      exchange: "MF",
      isin: mf.tradingsymbol,
      quantity: mf.quantity,
      average_price: mf.average_price,
      last_price: mf.last_price,
      pnl: mf.pnl || ((mf.last_price - mf.average_price) * mf.quantity),
      day_change: 0,
      day_change_percentage: 0
    }));

    const allHoldings = [...rawHoldings, ...parsedMfHoldings];

    // --- Trace Buy Dates via Console Tradebook ---
    interface TradebookTrade {
      trade_date: string;
      trade_type: string;
      quantity: number;
      tradingsymbol: string;
    }

    const allBuyTrades: TradebookTrade[] = [];
    const uncoveredHoldings = new Set(allHoldings.map(h => h.tradingsymbol));
    const requiredQty: Record<string, number> = {};
    for (const h of allHoldings) requiredQty[h.tradingsymbol] = h.quantity;

    let currentDate = new Date();
    const consoleCookies = process.env.KITE_CONSOLE_COOKIES || "";
    const consoleCsrf = process.env.KITE_CSRFTOKEN || "";

    if (consoleCookies && consoleCsrf) {
      // Limit backwards fetch to max 15 years to prevent infinite loops
      const MAX_YEARS_BACK = 15;
      let yearsIterated = 0;

      while (uncoveredHoldings.size > 0 && yearsIterated < MAX_YEARS_BACK) {
        let toDate = currentDate.toISOString().split('T')[0];
        currentDate.setFullYear(currentDate.getFullYear() - 1);
        let fromDate = currentDate.toISOString().split('T')[0];

        let page = 1;
        let totalPages = 1;
        let fetchedAnyInInterval = false;

        while (page <= totalPages) {
          const url = `https://console.zerodha.com/api/reports/tradebook?segment=EQ&from_date=${fromDate}&to_date=${toDate}&page=${page}&sort_by=order_execution_time&sort_desc=false`;
          const res = await fetch(url, {
            headers: {
              "accept": "application/json, text/plain, */*",
              "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": "\"Windows\"",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
              "x-csrftoken": consoleCsrf,
              "cookie": consoleCookies
            }
          });

          if (!res.ok) {
            console.error(`[Tax API] Tradebook fetch failed at page ${page} for interval ${fromDate} to ${toDate}`);
            break;
          }

          const data = await res.json();
          if (data.status !== "success") break;

          const results = data.data.result || [];
          if (results.length > 0) fetchedAnyInInterval = true;

          const buyTrades = results.filter((t: any) => t.trade_type === 'buy');
          allBuyTrades.push(...buyTrades);

          totalPages = data.data.pagination?.total_pages || 1;
          page++;
        }

        if (!fetchedAnyInInterval) {
          // If a full year yields zero trades, we've likely hit the beginning of the user's trading history
          // Any unaccounted lots might be off-market transfers or pre-Zerodha holdings (which are definitely LTCG).
          break;
        }

        for (const symbol of Array.from(uncoveredHoldings)) {
          const buyQtySoFar = allBuyTrades.filter(t => t.tradingsymbol === symbol).reduce((sum, t) => sum + t.quantity, 0);
          if (buyQtySoFar >= requiredQty[symbol]) {
            uncoveredHoldings.delete(symbol);
          }
        }
        
        yearsIterated++;
      }
    } else {
      console.warn("[Tax API] Missing KITE_CONSOLE_COOKIES or KITE_CSRFTOKEN. Operating without lot-tracking.");
    }

    // Sort descending by date (most recent buys first) to apply FIFO accurately.
    allBuyTrades.sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());

    // --- Pull Native TLH Report ---
    let tlhReport: ConsoleTLH | null = null;
    if (consoleCookies && consoleCsrf) {
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
      const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const tlhFy = `${startYear}_${startYear + 1}`;
      
      const tlhUrl = `https://console.zerodha.com/api/reports/taxloss_harvesting?fy=${tlhFy}&from_quarter=Q1&to_quarter=Q4`;
      const tlhRes = await fetch(tlhUrl, {
        headers: {
          "accept": "application/json, text/plain, */*",
          "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-csrftoken": consoleCsrf,
          "cookie": consoleCookies
        }
      });
      
      if (tlhRes.ok) {
        const tlhJson = await tlhRes.json();
        if (tlhJson.status === "success" && tlhJson.data && tlhJson.data.result) {
          const resEq = tlhJson.data.result.eq || {};
          const resMf = tlhJson.data.result.mf || {};
          
          tlhReport = {
            realizedStcg: (resEq.short_term_profit || 0) + (resMf.short_term_trade_equity || 0) + (resMf.short_term_trade_debt || 0),
            realizedLtcg: (resEq.long_term_profit || 0) + (resMf.long_term_trade_equity || 0) + (resMf.long_term_trade_debt || 0),
            unrealizedStcl: (resEq.short_term_unrealized_profit || 0) + (resMf.short_term_trade_equity_unrealized || 0) + (resMf.short_term_trade_debt_unrealized || 0),
            unrealizedLtcl: (resEq.long_term_unrealized_profit || 0) + (resMf.long_term_trade_equity_unrealized || 0) + (resMf.long_term_trade_debt_unrealized || 0),
          };
        }
      }
    }

    const splitHoldings: (LTCGHolding & { type: "LTCG" | "STCG", buyDateStr: string })[] = [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    for (const h of allHoldings) {
      let remainingQty = h.quantity;
      let stcgQty = 0;
      let ltcgQty = 0;

      const matchingBuys = allBuyTrades.filter(t => t.tradingsymbol === h.tradingsymbol);
      for (const buy of matchingBuys) {
        if (remainingQty <= 0) break;
        const take = Math.min(buy.quantity, remainingQty);

        const tradeDate = new Date(buy.trade_date);
        if (tradeDate > oneYearAgo) {
          stcgQty += take;
        } else {
          ltcgQty += take;
        }
        remainingQty -= take;
      }

      // Unaccounted stocks are assumed mathematically oldest (pre-history or split/bonus adjusted), hence LTCG
      if (remainingQty > 0) {
        ltcgQty += remainingQty;
      }

      const costBasis = h.average_price * h.quantity;
      const perShareGain = h.pnl / (h.quantity || 1);
      const unrealizedGainPct = costBasis > 0 ? (h.pnl / costBasis) * 100 : 0;

      if (stcgQty > 0) {
        splitHoldings.push({
          ...h,
          quantity: stcgQty,
          currentValue: stcgQty * h.last_price,
          costBasis: stcgQty * h.average_price,
          unrealizedGain: stcgQty * perShareGain,
          unrealizedGainPct,
          type: "STCG",
          buyDateStr: "< 1 Year"
        });
      }

      if (ltcgQty > 0) {
        splitHoldings.push({
          ...h,
          quantity: ltcgQty,
          currentValue: ltcgQty * h.last_price,
          costBasis: ltcgQty * h.average_price,
          unrealizedGain: ltcgQty * perShareGain,
          unrealizedGainPct,
          type: "LTCG",
          buyDateStr: "> 1 Year"
        });
      }
    }

    // --- LTCG Analysis ---
    
    // Profitable holdings eligible for Tax Harvesting
    const profitable = splitHoldings
      .filter(h => h.unrealizedGain > 0)
      .sort((a, b) => b.unrealizedGain - a.unrealizedGain);

    // Losing holdings to offset the gains
    const losing = splitHoldings
      .filter(h => h.unrealizedGain <= 0)
      .sort((a, b) => a.unrealizedGain - b.unrealizedGain);

    const totalUnrealizedGain = profitable.filter(h => h.type === "LTCG").reduce((sum, h) => sum + h.unrealizedGain, 0);
    const totalUnrealizedLoss = losing.reduce((sum, h) => sum + h.unrealizedGain, 0); // all losses count
    const netUnrealizedPnl = splitHoldings.reduce((sum, h) => sum + h.unrealizedGain, 0);
    
    // Remaining LTCG threshold based on natively realized limits (if TLH available)
    const activeLTCGThreshold = tlhReport ? Math.max(0, LTCG_THRESHOLD - tlhReport.realizedLtcg) : LTCG_THRESHOLD;
    const ltcgLimitRemaining = Math.max(0, activeLTCGThreshold - totalUnrealizedGain);
    const ltcgUtilizationPct = Math.min(100, (totalUnrealizedGain / activeLTCGThreshold) * 100);

    return NextResponse.json({
      success: true,
      summary: {
        totalHoldings: allHoldings.length,
        profitableCount: profitable.length,
        losingCount: losing.length,
        totalUnrealizedGain,
        totalUnrealizedLoss,
        netUnrealizedPnl,
        ltcgThreshold: activeLTCGThreshold, // Adjusted for past realizations
        tlhReport,
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
