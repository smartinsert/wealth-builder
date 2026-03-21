import type {
  Holding,
  PortfolioSummary,
  DiscoveryResult,
  MatchedRecommendation,
  PortfolioAuditResult,
  Trade,
  PortfolioAnalytics
} from "./types";

// ── Kite Holdings API ──

const KITE_API_BASE = "https://kite.zerodha.com/oms";

interface KiteHoldingRaw {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change_percentage: number;
  isin: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Fetch holdings and MF holdings from Kite API.
 * Locally we sidestep the ₹2000 API fee by using the browser's enctoken.
 * Falls back to a demo dataset if the token is missing or expired.
 */
export async function fetchHoldings(): Promise<PortfolioSummary> {
  const encToken = process.env.KITE_ENCTOKEN;

  if (encToken) {
    const headers = {
      "X-Kite-Version": "3",
      Authorization: `enctoken ${encToken}`,
    };

    try {
      // Fetch Equity Holdings
      const eqResponse = await fetch(`${KITE_API_BASE}/portfolio/holdings`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      // Fetch MF Holdings (in web, it sits under /mf/holdings instead of /portfolio/mf/holdings)
      const mfResponse = await fetch(`${KITE_API_BASE}/mf/holdings`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!eqResponse.ok || !mfResponse.ok) {
        console.warn(`[Portfolio] Kite API returned non-200. Falling back to demo data.`);
        return buildDemoPortfolio();
      }

      const eqJson = await eqResponse.json();
      const mfJson = await mfResponse.json();

      const rawHoldings: KiteHoldingRaw[] = eqJson.data || [];
      const rawMfHoldings: any[] = mfJson.data || [];

      const holdings: Holding[] = rawHoldings.map((h) => ({
        tradingsymbol: h.tradingsymbol,
        exchange: h.exchange,
        quantity: h.quantity,
        average_price: h.average_price,
        last_price: h.last_price,
        pnl: h.pnl,
        day_change_percentage: h.day_change_percentage,
        isin: h.isin,
      }));

      const mfHoldings: Holding[] = rawMfHoldings.map((mf) => ({
        tradingsymbol: mf.fund, // Use fund name for matching
        exchange: "MF",
        quantity: mf.quantity,
        average_price: mf.average_price,
        last_price: mf.last_price,
        pnl: mf.pnl || ((mf.last_price - mf.average_price) * mf.quantity),
        day_change_percentage: 0,
        isin: mf.tradingsymbol,
      }));

      const trades = await fetchTrades();
      return buildPortfolioSummary([...holdings, ...mfHoldings], trades);
    } catch (error) {
      console.error("[Portfolio] Kite API error:", error);
      const demoHoldings = buildDemoPortfolio();
      demoHoldings.analytics = analyzePortfolioInsights(demoHoldings.holdings, buildDemoTrades());
      return demoHoldings;
    }
  }

  // No API credentials — use demo data (populated realistically from user's live MCP trace)
  console.info("[Portfolio] No Kite credentials, using demo MF portfolio.");
  const demoHoldings = buildDemoPortfolio();
  demoHoldings.analytics = analyzePortfolioInsights(demoHoldings.holdings, buildDemoTrades());
  return demoHoldings;
}

// ── Trades API & Analytics ──

export async function fetchTrades(): Promise<Trade[]> {
  const encToken = process.env.KITE_ENCTOKEN;

  if (encToken) {
    try {
      const response = await fetch(`${KITE_API_BASE}/trades`, { // Web trades endpoint
        headers: {
          "X-Kite-Version": "3",
          Authorization: `enctoken ${encToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const json = await response.json();
        return json.data || [];
      } else {
        console.warn(`[Portfolio Trades] Kite API returned ${response.status}`);
        console.warn(`[Portfolio Trades] Body:`, await response.text().catch(() => ""));
      }
    } catch (e) {
      console.error("[Portfolio] Failed to fetch trades", e);
    }
  }
  return buildDemoTrades();
}

function analyzePortfolioInsights(holdings: Holding[], trades: Trade[]): PortfolioAnalytics {
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  
  let ltcgEligibleValue = 0;
  let ltcgUnrealizedProfit = 0;
  let realizedTaxPnl = 0;
  
  const sectorAllocation: Record<string, number> = {};

  // Approx realized PnL from recent SELL trades (assuming average 12% gain on sold assets for demo visibility if buy legs are missing)
  realizedTaxPnl = trades
    .filter(t => t.transaction_type === "SELL")
    .reduce((sum, t) => sum + (t.quantity * t.average_price * 0.12), 0); 

  // Basic sector allocation
  holdings.forEach(h => {
    const val = h.quantity * h.last_price;
    const sector = h.exchange === "MF" ? "Mutual Funds" : "Equities";
    sectorAllocation[sector] = (sectorAllocation[sector] || 0) + val;
  });

  // Calculate Long-Term portion using trades
  holdings.forEach(h => {
    const symbolBuys = trades.filter(t => t.tradingsymbol === h.tradingsymbol && t.transaction_type === "BUY");
    const recentBuys = symbolBuys.filter(t => (now - new Date(t.fill_timestamp).getTime()) < ONE_YEAR_MS);
    const recentBuyQty = recentBuys.reduce((sum, t) => sum + t.quantity, 0);
    
    const longTermQty = Math.max(0, h.quantity - recentBuyQty);
    
    if (longTermQty > 0) {
      const currentVal = longTermQty * h.last_price;
      const avgCost = longTermQty * h.average_price;
      ltcgEligibleValue += currentVal;
      ltcgUnrealizedProfit += (currentVal - avgCost);
    }
  });

  return {
    ltcgEligibleValue,
    ltcgUnrealizedProfit,
    realizedTaxPnl,
    sectorAllocation
  };
}

function buildPortfolioSummary(holdings: Holding[], trades: Trade[] = []): PortfolioSummary {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.last_price * h.quantity,
    0
  );
  const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0);

  const analytics = analyzePortfolioInsights(holdings, trades);

  return {
    holdings,
    totalValue,
    totalPnl,
    holdingCount: holdings.length,
    fetchedAt: new Date().toISOString(),
    analytics,
  };
}

function buildDemoPortfolio(): PortfolioSummary {
  const mfDemo: Holding[] = [
    { tradingsymbol: "NIFTYBEES", exchange: "NSE", quantity: 3765, average_price: 265.2, last_price: 262.28, pnl: -10993.8, day_change_percentage: -2.65, isin: "INF204KB14I2" },
    { tradingsymbol: "HDFC BSE SENSEX INDEX FUND", exchange: "MF", quantity: 995.6, average_price: 602.7, last_price: 718.1, pnl: 114954.2, day_change_percentage: 0, isin: "INF179K01WN9" },
    { tradingsymbol: "HDFC FOCUSED FUND", exchange: "MF", quantity: 882.6, average_price: 249.4, last_price: 249.1, pnl: -264.8, day_change_percentage: 0, isin: "INF179K01VK7" },
    { tradingsymbol: "MOTILAL OSWAL NIFTY MIDCAP 150 INDEX FUND", exchange: "MF", quantity: 25264.2, average_price: 25.7, last_price: 36.5, pnl: 272853.4, day_change_percentage: 0, isin: "INF247L01916" },
    { tradingsymbol: "MOTILAL OSWAL ASSET ALLOCATION PASSIVE FOF", exchange: "MF", quantity: 25186.6, average_price: 19.85, last_price: 18.98, pnl: -21912.3, day_change_percentage: 0, isin: "INF247L01AL2" },
    { tradingsymbol: "NAVI NIFTY NEXT 50 INDEX FUND", exchange: "MF", quantity: 30749.9, average_price: 15.93, last_price: 15.32, pnl: -18757.4, day_change_percentage: 0, isin: "INF959L01FR8" },
    { tradingsymbol: "EDELWEISS NIFTY SMALLCAP 250 INDEX FUND", exchange: "MF", quantity: 8881.9, average_price: 16.90, last_price: 15.40, pnl: -13322.8, day_change_percentage: 0, isin: "INF754K01QT8" },
    { tradingsymbol: "TATA NIFTY MIDCAP 150 INDEX FUND", exchange: "MF", quantity: 28559.4, average_price: 10.50, last_price: 9.58, pnl: -26274.6, day_change_percentage: 0, isin: "INF277KA1DZ9" }
  ];
  return buildPortfolioSummary(mfDemo, buildDemoTrades());
}

function buildDemoTrades(): Trade[] {
  // Adding some recent mock trades (within 1 year) to show that NOT all quantities are Long-Term
  const recentDate = new Date();
  recentDate.setMonth(recentDate.getMonth() - 2); // 2 months ago (Short term)
  
  const pastSellDate = new Date();
  pastSellDate.setMonth(pastSellDate.getMonth() - 1); // 1 month ago sell for realized tax
  
  return [
    { trade_id: "demo1", tradingsymbol: "NIFTYBEES", exchange: "NSE", transaction_type: "BUY", quantity: 1500, average_price: 260.0, fill_timestamp: recentDate.toISOString() },
    { trade_id: "demo2", tradingsymbol: "MOTILAL OSWAL NIFTY MIDCAP 150 INDEX FUND", exchange: "MF", transaction_type: "BUY", quantity: 10000, average_price: 30.0, fill_timestamp: recentDate.toISOString() },
    { trade_id: "demo3", tradingsymbol: "HDFC FOCUSED FUND", exchange: "MF", transaction_type: "SELL", quantity: 500, average_price: 250.0, fill_timestamp: pastSellDate.toISOString() }
  ];
}

// ── Matching Logic ──

/**
 * Compare discovered tickers against live holdings.
 * Returns categorized results: "already_owned" vs "new_opportunity".
 */
export function matchDiscoveriesWithHoldings(
  discoveries: DiscoveryResult[],
  portfolio: PortfolioSummary
): PortfolioAuditResult {
  const holdingSymbols = new Set(
    portfolio.holdings.map((h) => h.tradingsymbol.toUpperCase())
  );

  const holdingMap = new Map(
    portfolio.holdings.map((h) => [h.tradingsymbol.toUpperCase(), h])
  );

  const alreadyOwned: MatchedRecommendation[] = [];
  const newOpportunities: MatchedRecommendation[] = [];

  // De-duplicate tickers across all discoveries
  const seen = new Set<string>();

  for (const discovery of discoveries) {
    for (const ticker of discovery.tickers) {
      const sym = ticker.symbol.toUpperCase();
      if (seen.has(sym)) continue;
      seen.add(sym);

      const matched: MatchedRecommendation = {
        ticker,
        status: holdingSymbols.has(sym) ? "already_owned" : "new_opportunity",
        holding: holdingMap.get(sym) || null,
        source: discovery.source,
        discoveredAt: discovery.discoveredAt,
      };

      if (matched.status === "already_owned") {
        alreadyOwned.push(matched);
      } else {
        newOpportunities.push(matched);
      }
    }
  }

  return {
    alreadyOwned,
    newOpportunities,
    portfolio,
    discoveryCount: discoveries.length,
    timestamp: new Date().toISOString(),
  };
}
