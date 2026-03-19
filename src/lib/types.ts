// ── Shared TypeScript interfaces for the Discovery Engine ──

export interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  reasoning?: string;
  recommendation?: "BUY" | "SELL" | "HOLD";
}

export interface ArticleContent {
  title: string;
  url: string;
  body: string;
  source: "zerodha" | "groww";
}

export interface DiscoveryResult {
  id: string;
  source: "zerodha" | "groww";
  title: string;
  url: string;
  tickers: TickerInfo[];
  sectors: string[];
  summary: string;
  discoveredAt: string; // ISO timestamp
}

export interface DiscoveryRunResponse {
  success: boolean;
  discoveries: DiscoveryResult[];
  timestamp: string;
  errors?: string[];
}

// ── Portfolio & Matching types ──

export interface Trade {
  trade_id: string;
  tradingsymbol: string;
  exchange: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  average_price: number;
  fill_timestamp: string;
}

export interface PortfolioAnalytics {
  ltcgEligibleValue: number;
  ltcgUnrealizedProfit: number;
  realizedTaxPnl: number;
  sectorAllocation: Record<string, number>;
}

export interface Holding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change_percentage: number;
  isin: string;
}

export interface PortfolioSummary {
  holdings: Holding[];
  totalValue: number;
  totalPnl: number;
  holdingCount: number;
  fetchedAt: string;
  analytics?: PortfolioAnalytics;
}

export type RecommendationStatus = "already_owned" | "new_opportunity";

export interface MatchedRecommendation {
  ticker: TickerInfo;
  status: RecommendationStatus;
  holding: Holding | null; // populated if already_owned
  source: string;
  discoveredAt: string;
}

export interface PortfolioAuditResult {
  alreadyOwned: MatchedRecommendation[];
  newOpportunities: MatchedRecommendation[];
  portfolio: PortfolioSummary;
  discoveryCount: number;
  timestamp: string;
}
