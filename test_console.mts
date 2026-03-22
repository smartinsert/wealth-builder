import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

async function testConsole() {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().includes('console.zerodha.com/api/')) {
      console.log('--- REQ ---');
      console.log(request.url());
      console.log(request.headers());
    }
    request.continue();
  });

  console.log("Please login to Kite manually if needed. Navigating to console...");
  await page.goto("https://console.zerodha.com/portfolio/holdings", { waitUntil: 'networkidle2' });
  
  console.log("Waiting 5s...");
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Running page.evaluate fetch...");
  try {
    const data = await page.evaluate(async () => {
      const res = await fetch("https://console.zerodha.com/api/reports/portfolio/tax?entity_type=eq&fy=2024-2025");
      return res.json();
    });
    console.log("FETCH RESULT:", data);
  } catch(e: any) {
    console.log("FETCH ERR:", e.message);
  }
  
  await browser.close();
}

testConsole().catch(console.error);
