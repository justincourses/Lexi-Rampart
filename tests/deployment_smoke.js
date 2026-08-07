import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_PATH || (fs.existsSync(defaultChromePath) ? defaultChromePath : undefined);
const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const recoveredPage = await context.newPage();
  let entryRequests = 0;
  let failedOnce = false;
  await recoveredPage.route('**/_app/*.js', async (route) => {
    entryRequests += 1;
    if (!failedOnce) {
      failedOnce = true;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  await recoveredPage.goto(`${baseUrl}?testMode=1`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await recoveredPage.waitForFunction(() => Boolean(
    window.__runeRampartTest
    && document.documentElement.dataset.build
    && !new URL(location.href).searchParams.has('rr_asset_retry')
  ), null, { timeout: 8000 });
  const recovered = await recoveredPage.evaluate(async () => {
    const manifestResponse = await fetch('/asset-manifest.json', { cache: 'no-cache' });
    const manifest = await manifestResponse.json();
    return {
      buildMeta: document.querySelector('meta[name="rune-rampart-build"]')?.content,
      readyBuild: document.documentElement.dataset.build,
      manifestBuild: manifest.buildId,
      recoveryVisible: Boolean(document.querySelector('#assetRecoveryPanel')),
      retryParameter: new URL(location.href).searchParams.get('rr_asset_retry')
    };
  });
  if (entryRequests < 2 || recovered.recoveryVisible || recovered.retryParameter || !recovered.buildMeta || recovered.buildMeta !== recovered.readyBuild || recovered.buildMeta !== recovered.manifestBuild) {
    throw new Error(`One-time asset recovery did not reach a coherent release: ${JSON.stringify({ entryRequests, recovered })}`);
  }

  const failedPage = await context.newPage();
  let failedRequests = 0;
  await failedPage.route('**/_app/*.js', async (route) => {
    failedRequests += 1;
    await route.abort('failed');
  });
  await failedPage.goto(`${baseUrl}?testMode=1`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await failedPage.locator('#assetRecoveryPanel').waitFor({ state: 'visible', timeout: 8000 });
  const requestsAtPrompt = failedRequests;
  await failedPage.waitForTimeout(700);
  const fallback = await failedPage.evaluate(() => ({
    buttonText: document.querySelector('#assetRecoveryPanel button')?.textContent,
    retryParameter: new URL(location.href).searchParams.get('rr_asset_retry'),
    alertRole: document.querySelector('#assetRecoveryPanel')?.getAttribute('role')
  }));
  if (failedRequests !== requestsAtPrompt || failedRequests !== 2 || fallback.buttonText !== '重新载入游戏' || !fallback.retryParameter || fallback.alertRole !== 'alert') {
    throw new Error(`Persistent asset failure does not stop at the visible recovery action: ${JSON.stringify({ failedRequests, requestsAtPrompt, fallback })}`);
  }

  console.log(`Deployment compatibility passed: one automatic retry, coherent build ${recovered.buildMeta}, and a bounded visible fallback.`);
} finally {
  await browser.close();
}
