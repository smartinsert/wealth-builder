# WealthAgent Implementation Plan

## Objective
A Next.js 15 application to automate investment discovery by parsing financial research (Zerodha/Groww) and cross-referencing findings with a live Zerodha portfolio.

## Technical Stack & Rules
- **Models:** Gemini 3 Pro (High) for Logic/Planning; Gemini 3 Flash for UI/CSS.
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Storage:** Vercel KV (Redis) with 7-day TTL for recommendations.
- **Efficiency:** No automated tests. Generate `SUMMARY.md` after every feature.

---

## Phase 1: Foundation
- [ ] Initialize Next.js 15 project with Tailwind and shadcn/ui.
- [ ] Create `AGENTS.md` and `SUMMARY.md` in the root.
- [ ] Connect Vercel KV via the Vercel Dashboard and link environment variables.
- [ ] Configure `mcp_config.json` with `kite` (Zerodha) and `linkup` (Search).

## Phase 2: Discovery Engine
- [ ] **Data Sourcing:** Implement logic to query `linkup` for:
    - `https://thedailybrief.zerodha.com`
    - `https://groww.in/digest`
- [ ] **Content Extraction:** Use the `fetch` tool to read the latest articles.
- [ ] **Reasoning Engine:** - Extract specific stock tickers.
    - *Fallback:* If no tickers found, identify macro sectors and use `linkup` to find the top 5 NSE companies in that sector.
- [ ] **Storage with Expiry:** Save findings to Vercel KV using `{ ex: 604800 }` to ensure data is deleted after 7 days.

## Phase 3: Portfolio Integration
- [ ] **Kite Integration:** Call `kite.get_holdings` to retrieve current Zerodha positions.
- [ ] **Matching Logic:** Create a service to compare KV-stored recommendations against live holdings.
- [ ] **UI Badging:** Implement logic to flag "Already Owned" vs "New Opportunity."

## Phase 4: Frontend & History
- [ ] **Dashboard:** Build a main feed displaying the latest discovered stocks/sectors.
- [ ] **History View:** Create a `/history` page to display all non-expired recommendations from KV.
- [ ] **UI Polish:** Use shadcn/ui "Cards" and "Badges" for a clean financial interface.

## Phase 5: Deployment & Handoff
- [ ] Deploy to Vercel via CLI (`vercel --prod`).
- [ ] Final check: Ensure `LINKUP_API_KEY` is in Vercel Secret Manager.
- [ ] **Final Summary:** Generate a comprehensive `SUMMARY.md` of the entire architecture.