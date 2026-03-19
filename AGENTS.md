Agent Project Rules: Investment
Discovery App
Model Selection
● Primary Reasoning: Gemini 3 Pro (High). Use this for all architectural planning and
"Discovery Logic."
● Speed/UI Tweak: Gemini 3 Flash. Use for simple CSS or minor bug fixes.
Tech Stack
● Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
● Deployment: Vercel.


Core Workflows
1. Discovery Loop:
○ Use linkup to find articles from https://thedailybrief.zerodha.com and https://groww.in/digest.
○ Use fetch to read article content.
○ If no stock names exist, use reasoning to extract sectors and map them to top 5
Indian listed companies via linkup.

2. Portfolio Audit:
○ Use kite.get_holdings to retrieve my live Zerodha portfolio.
○ Compare discovered tickers with my holdings.


Token-Efficiency Rules
● No Automated Tests: Do not generate or run test scripts unless explicitly asked. Manual
testing only.
● Session Summaries: After every feature, generate a SUMMARY.md. I will use this as
context for the next session to avoid re-reading the whole codebase.
● Fast Mode for UI: Toggle to "Fast Mode" for styling tasks.