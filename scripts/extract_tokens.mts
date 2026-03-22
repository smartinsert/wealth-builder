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
  let consoleCookies: string | null = null;
  let hasRedirectedToConsole = false;

  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const headers = request.headers();
    
    // Look for API requests to intercept both tokens
    const url = request.url();
    if (url.includes('zerodha.com/api') || url.includes('zerodha.com/oms')) {
      if (headers['x-csrftoken']) {
        if (!csrfToken) {
          csrfToken = headers['x-csrftoken'];
          console.log('✅ Captured KITE_CSRFTOKEN:', csrfToken.substring(0, 10) + '...');
        }
      }
      if (headers['authorization'] && headers['authorization'].toLowerCase().includes('enctoken')) {
        if (!encToken) {
          encToken = headers['authorization'].split(' ')[1];
          console.log('✅ Captured KITE_ENCTOKEN from Headers:', encToken.substring(0, 10) + '...');
        }
      }
      
      const cookieHeader = headers['cookie'] || '';
      if (cookieHeader.includes('kf_session=')) {
        console.log('✅ Seen kf_session in headers');
      }
    }
    request.continue();
  });

  await page.goto('https://kite.zerodha.com/dashboard');

  // We loop until we got both or timeout after 5 minutes
  const maxLoops = 300; // 5 minutes (300 * 1s)
  let loops = 0;

  while (loops < maxLoops) {
    try {
      if (encToken && !hasRedirectedToConsole) {
        hasRedirectedToConsole = true;
        console.log('🔄 Captured active enctoken! Redirecting to Console to create session...');
        await page.goto('https://console.zerodha.com/portfolio/holdings');
        await new Promise((r) => setTimeout(r, 2000)); // Wait for redirect/load
      }

      const cookies = await page.cookies('https://kite.zerodha.com', 'https://console.zerodha.com');
      const kfSessionCookie = cookies.find((c) => c.name === 'kf_session');
      const hasConsoleSession = !!kfSessionCookie;

      if (encToken && hasConsoleSession) {
        consoleCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('🎉 Successfully captured enctoken and console cookies (kf_session)!');
        break;
      }
    } catch (error: any) {
      if (error.message.includes('Session closed') || error.message.includes('Target closed')) {
        console.log('⚠️ Browser was closed manually before capturing all tokens.');
        break;
      } else {
        throw error;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
    loops++;
  }

  if (encToken && consoleCookies) {
    console.log('💾 Saving to .env.local...');
    const payload: Record<string, string> = {
      KITE_ENCTOKEN: encToken,
      KITE_CONSOLE_COOKIES: consoleCookies,
    };
    if (csrfToken) {
      payload.KITE_CSRFTOKEN = csrfToken;
    }
    updateEnvFile(payload);
    console.log('✨ Done. You can now close the browser if it didn\'t close automatically.');
  } else {
    console.error('❌ Failed to capture tokens before timeout.');
  }

  await browser.close();
}

extractTokens().catch(console.error);
