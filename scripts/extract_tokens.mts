import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

const envPath = path.resolve(process.cwd(), '.env.local');

function updateEnvFile(envUpdates: Record<string, string>) {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  for (const [key, value] of Object.entries(envUpdates)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
}

async function extractTokens() {
  console.log('🚀 Launching browser for Zerodha login...');
  console.log('👉 Please log in manually. The script will automatically close the browser once the tokens are captured.');

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  let csrfToken: string | null = null;
  let encToken: string | null = null;

  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const headers = request.headers();
    
    // Look for Console API requests to steal the CSRF token
    if (request.url().includes('console.zerodha.com/api')) {
      if (headers['x-csrftoken']) {
        if (!csrfToken) {
          csrfToken = headers['x-csrftoken'];
          console.log('✅ Captured KITE_CSRFTOKEN:', csrfToken.substring(0, 10) + '...');
        }
      }
    }
    request.continue();
  });

  await page.goto('https://console.zerodha.com/portfolio/holdings');

  // We loop until we got both or timeout after 5 minutes
  const maxLoops = 300; // 5 minutes (300 * 1s)
  let loops = 0;

  while (loops < maxLoops) {
    // Attempt to grab enctoken from cookies
    const cookies = await page.cookies();
    const encCookie = cookies.find((c) => c.name === 'enctoken');
    
    if (encCookie && !encToken) {
      encToken = encCookie.value;
      console.log('✅ Captured KITE_ENCTOKEN:', encToken.substring(0, 10) + '...');
    }

    if (csrfToken && encToken) {
      console.log('🎉 Successfully captured both tokens!');
      break;
    }

    await new Promise((r) => setTimeout(r, 1000));
    loops++;
  }

  if (csrfToken && encToken) {
    console.log('💾 Saving to .env.local...');
    updateEnvFile({
      KITE_ENCTOKEN: encToken,
      KITE_CSRFTOKEN: csrfToken,
    });
    console.log('✨ Done. You can now close the browser if it didn\'t close automatically.');
  } else {
    console.error('❌ Failed to capture tokens before timeout.');
  }

  await browser.close();
}

extractTokens().catch(console.error);
