# WealthAgent Implementation Plan

## Objective
Build a Next.js app that finds investment ideas via Linkup and matches them against Zerodha holdings.

## Phase 1: Foundation (Use Fast/Flash)
- [ ] Initialize Next.js 15 with Tailwind and shadcn/ui.
- [ ] Setup Vercel KV for 7-day storage (TTL).
- [ ] Configure `mcp_config.json` for Linkup and Kite.

## Phase 2: Discovery Engine (Use Planning/Pro)
- [ ] Create `/api/discover` route.
- [ ] Tool: Use `linkup` to find "Zerodha Daily Brief" articles.
- [ ] Logic: Map macro sectors to top 5 NSE tickers if specific names are missing.
- [ ] Storage: Save results to KV with `ex: 604800` (7 days).

## Phase 3: Portfolio Integration (Use Planning/Pro)
- [ ] Fetch live holdings via `kite.get_holdings`.
- [ ] Create comparison logic to highlight "Owned" vs "New" recommendations.

## Phase 4: UI Refinement (Use Fast/Flash)
- [ ] Build `/dashboard` with shadcn/ui cards.
- [ ] Build `/history` to pull recent records from Vercel KV.