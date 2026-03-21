import type {
  ArticleContent,
  DiscoveryResult,
  TickerInfo,
} from "./types";
import { runFundamentalResearchAgent } from "./ai";

// ── Well-known NSE tickers for regex matching ──
const KNOWN_NSE_TICKERS: Record<string, { name: string; sector: string }> = {
  RELIANCE: { name: "Reliance Industries", sector: "Energy" },
  TCS: { name: "Tata Consultancy Services", sector: "IT" },
  INFY: { name: "Infosys", sector: "IT" },
  HDFCBANK: { name: "HDFC Bank", sector: "Banking" },
  ICICIBANK: { name: "ICICI Bank", sector: "Banking" },
  SBIN: { name: "State Bank of India", sector: "Banking" },
  BHARTIARTL: { name: "Bharti Airtel", sector: "Telecom" },
  ITC: { name: "ITC", sector: "FMCG" },
  HINDUNILVR: { name: "Hindustan Unilever", sector: "FMCG" },
  KOTAKBANK: { name: "Kotak Mahindra Bank", sector: "Banking" },
  LT: { name: "Larsen & Toubro", sector: "Infrastructure" },
  AXISBANK: { name: "Axis Bank", sector: "Banking" },
  BAJFINANCE: { name: "Bajaj Finance", sector: "Finance" },
  MARUTI: { name: "Maruti Suzuki", sector: "Auto" },
  TATAMOTORS: { name: "Tata Motors", sector: "Auto" },
  SUNPHARMA: { name: "Sun Pharma", sector: "Pharma" },
  DRREDDY: { name: "Dr Reddy's", sector: "Pharma" },
  CIPLA: { name: "Cipla", sector: "Pharma" },
  WIPRO: { name: "Wipro", sector: "IT" },
  HCLTECH: { name: "HCL Technologies", sector: "IT" },
  NESTLEIND: { name: "Nestle India", sector: "FMCG" },
  TITAN: { name: "Titan Company", sector: "Consumer" },
  ADANIENT: { name: "Adani Enterprises", sector: "Conglomerate" },
  ADANIPORTS: { name: "Adani Ports", sector: "Infrastructure" },
  POWERGRID: { name: "Power Grid Corp", sector: "Power" },
  NTPC: { name: "NTPC", sector: "Power" },
  ONGC: { name: "ONGC", sector: "Energy" },
  COALINDIA: { name: "Coal India", sector: "Mining" },
  TATASTEEL: { name: "Tata Steel", sector: "Metals" },
  JSWSTEEL: { name: "JSW Steel", sector: "Metals" },
  HINDALCO: { name: "Hindalco", sector: "Metals" },
  TECHM: { name: "Tech Mahindra", sector: "IT" },
  ULTRACEMCO: { name: "UltraTech Cement", sector: "Cement" },
  ASIANPAINT: { name: "Asian Paints", sector: "Consumer" },
  BAJAJFINSV: { name: "Bajaj Finserv", sector: "Finance" },
  HDFCLIFE: { name: "HDFC Life", sector: "Insurance" },
  SBILIFE: { name: "SBI Life", sector: "Insurance" },
  INDUSINDBK: { name: "IndusInd Bank", sector: "Banking" },
  DIVISLAB: { name: "Divi's Labs", sector: "Pharma" },
  APOLLOHOSP: { name: "Apollo Hospitals", sector: "Healthcare" },
  EICHERMOT: { name: "Eicher Motors", sector: "Auto" },
  HEROMOTOCO: { name: "Hero MotoCorp", sector: "Auto" },
  BPCL: { name: "BPCL", sector: "Energy" },
  GRASIM: { name: "Grasim Industries", sector: "Cement" },
  BRITANNIA: { name: "Britannia", sector: "FMCG" },
  M_M: { name: "Mahindra & Mahindra", sector: "Auto" },
  SHRIRAMFIN: { name: "Shriram Finance", sector: "Finance" },
  TRENT: { name: "Trent", sector: "Retail" },
};

// ── Sector → Top 5 NSE tickers fallback ──
const SECTOR_TOP_TICKERS: Record<string, string[]> = {
  IT: ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM"],
  Banking: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"],
  Pharma: ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP"],
  Auto: ["MARUTI", "TATAMOTORS", "EICHERMOT", "HEROMOTOCO", "M_M"],
  FMCG: ["HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "TRENT"],
  Energy: ["RELIANCE", "ONGC", "BPCL", "NTPC", "POWERGRID"],
  Metals: ["TATASTEEL", "JSWSTEEL", "HINDALCO", "COALINDIA", "ADANIENT"],
  Infrastructure: ["LT", "ADANIPORTS", "ULTRACEMCO", "GRASIM", "POWERGRID"],
  Finance: ["BAJFINANCE", "BAJAJFINSV", "SHRIRAMFIN", "HDFCLIFE", "SBILIFE"],
  Telecom: ["BHARTIARTL"],
};

// ── Sector keyword patterns for fallback detection ──
const SECTOR_KEYWORDS: Record<string, string[]> = {
  IT: ["technology", "software", "it sector", "tech", "digital", "saas", "cloud computing"],
  Banking: ["banking", "banks", "bank", "npa", "credit growth", "loan", "deposits", "rbi"],
  Pharma: ["pharma", "pharmaceutical", "healthcare", "drug", "hospital", "biotech"],
  Auto: ["automobile", "auto", "ev", "electric vehicle", "car", "two-wheeler", "automotive"],
  FMCG: ["fmcg", "consumer goods", "staples", "food", "personal care", "household"],
  Energy: ["energy", "oil", "gas", "petroleum", "crude", "refinery", "power"],
  Metals: ["metal", "steel", "mining", "aluminium", "copper", "iron ore"],
  Infrastructure: ["infrastructure", "construction", "cement", "real estate", "roads", "highways"],
  Finance: ["finance", "nbfc", "insurance", "fintech", "lending", "microfinance"],
  Telecom: ["telecom", "5g", "spectrum", "broadband", "mobile network"],
};

// ── Content Fetching ──

async function fetchArticleContent(url: string, source: "zerodha" | "groww"): Promise<ArticleContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "WealthAgent/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[Discovery] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract text content by stripping HTML tags
    const body = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : `Article from ${source}`;

    return { title, url, body, source };
  } catch (error) {
    console.error(`[Discovery] Error fetching ${url}:`, error);
    return null;
  }
}

// ── Ticker Extraction ──

function getMockReasoning(symbol: string): { reasoning: string; recommendation: "BUY" | "SELL" | "HOLD" } {
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const recommendations: ("BUY" | "SELL" | "HOLD")[] = ["BUY", "BUY", "HOLD", "SELL"];
  const rec = recommendations[hash % 4];
  
  if (rec === "BUY") {
    return { reasoning: `The article discusses strong upcoming growth catalysts and positive sector momentum for ${symbol}.`, recommendation: rec };
  } else if (rec === "SELL") {
    return { reasoning: `Mentions of regulatory headwinds and declining margins suggest short-term pressure on ${symbol}.`, recommendation: rec };
  } else {
    return { reasoning: `The stock is mentioned in a neutral context regarding broader industry trends.`, recommendation: rec };
  }
}

function extractTickers(text: string): TickerInfo[] {
  const found = new Map<string, TickerInfo>();
  const upperText = text.toUpperCase();

  for (const [symbol, info] of Object.entries(KNOWN_NSE_TICKERS)) {
    // Match the ticker symbol as a standalone word
    const symbolPattern = new RegExp(`\\b${symbol.replace("_", "[&]?")}\\b`, "i");
    // Also match the company name
    const namePattern = new RegExp(info.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    if (symbolPattern.test(upperText) || namePattern.test(text)) {
      const { reasoning, recommendation } = getMockReasoning(symbol);
      found.set(symbol, {
        symbol,
        name: info.name,
        exchange: "NSE",
        sector: info.sector,
        reasoning,
        recommendation
      });
    }
  }

  return Array.from(found.values());
}

// ── Sector Detection (Fallback) ──

function detectSectors(text: string): string[] {
  const lowerText = text.toLowerCase();
  const detectedSectors: string[] = [];

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        detectedSectors.push(sector);
        break; // one match per sector is enough
      }
    }
  }

  return detectedSectors;
}

function sectorToTickers(sectors: string[]): TickerInfo[] {
  const tickers = new Map<string, TickerInfo>();

  for (const sector of sectors) {
    const symbols = SECTOR_TOP_TICKERS[sector] || [];
    for (const symbol of symbols.slice(0, 5)) {
      const info = KNOWN_NSE_TICKERS[symbol];
      if (info && !tickers.has(symbol)) {
        tickers.set(symbol, {
          symbol,
          name: info.name,
          exchange: "NSE",
          sector: info.sector,
        });
      }
    }
  }

  return Array.from(tickers.values());
}

// ── Main Discovery Orchestrator ──

function generateId(): string {
  return `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function discoverFromSources(modelId: string = "google/gemini-2.5-flash"): Promise<DiscoveryResult[]> {
  const sources: { url: string; source: "zerodha" | "groww" }[] = [
    { url: "https://thedailybrief.zerodha.com/feed", source: "zerodha" },
    { url: "https://groww.in/digest", source: "groww" },
  ];

  const articles = await Promise.all(
    sources.map((s) => fetchArticleContent(s.url, s.source))
  );

  const discoveries: DiscoveryResult[] = [];

  // Run AI extraction in parallel for all fetched articles
  await Promise.all(articles.map(async (article) => {
    if (!article) return;

    // Utilize the Vercel AI SDK based structured agent
    const aiResult = await runFundamentalResearchAgent(
      article.title,
      article.body,
      modelId
    );

    // Map extracted tickers to our known dataset to ensure validity and attach full names/sectors
    const tickers: TickerInfo[] = (aiResult.tickers || []).map((t: any) => {
      const known = KNOWN_NSE_TICKERS[t.symbol] || { name: t.symbol, sector: "Unknown" };
      return {
        symbol: t.symbol,
        name: known.name,
        exchange: "NSE",
        sector: known.sector,
        reasoning: t.reasoning,
        recommendation: t.recommendation as "BUY" | "SELL" | "HOLD" | undefined,
      };
    });

    let sectors = aiResult.sectors || [];
    
    // Feature: Sector Fallback Proxies
    // If an article discusses a macro sector (like The Daily Brief) but mentions no specific stock, 
    // inject the top bluechip constituents of that sector into the recommendation pipeline.
    if (tickers.length === 0 && sectors.length > 0) {
      const fallbackProxies = sectorToTickers(sectors);
      fallbackProxies.forEach((proxy) => {
        tickers.push({
          ...proxy,
          reasoning: `While no specific stock was mentioned, the article discusses macro trends in the ${proxy.sector} sector where ${proxy.name} is a leading constituent.`,
          recommendation: "HOLD", // Give proxy stocks a neutral sentiment
        });
      });
    }

    // If nothing found at all, at least tag as General Market
    if (tickers.length === 0 && sectors.length === 0) {
      sectors = ["General Market"];
    }

    const summary = aiResult.synopsis || (
      article.body.length > 300
        ? article.body.slice(0, 300).trim() + "…"
        : article.body
    );

    discoveries.push({
      id: generateId(),
      source: article.source,
      title: article.title,
      url: article.url,
      tickers,
      sectors,
      summary,
      discoveredAt: new Date().toISOString(),
    });
  }));

  // Sort by time discovered (or keep arbitrary order, UI handles it)
  return discoveries;
}
