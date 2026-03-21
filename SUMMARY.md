# Session Summary: Token Extraction Utility

## What was accomplished
- Added `puppeteer`, `puppeteer-extra`, and `puppeteer-extra-plugin-stealth` dependencies to `package.json`.
- Created a new script `scripts/extract_tokens.mts` that automates launching a headful Chrome browser to log in to Zerodha Console.
- The script successfully intercepts network requests to steal the `x-csrftoken` and reads cookies to steal the `enctoken`.
- Configured the script to automatically write/update `KITE_ENCTOKEN` and `KITE_CSRFTOKEN` inside `.env.local`.
- Added `"extract-tokens": "npx tsx scripts/extract_tokens.mts"` command to `package.json`.

## How to use
Run `npm run extract-tokens` at any time if your Zerodha session expires and you need fresh tokens for fetching historical holdings from the Console API.

## Next Steps
- Integrate the fetched historical holdings from the Zerodha Console API into the Portfolio Audit feature.
