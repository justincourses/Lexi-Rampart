import fs from 'node:fs';

const liveBase = new URL(process.env.DEPLOY_CHECK_URL || 'https://lexi-rampart.pages.dev/');
const expected = JSON.parse(fs.readFileSync(new URL('../dist/asset-manifest.json', import.meta.url), 'utf8'));
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function verify() {
  const stamp = Date.now().toString(36);
  const htmlUrl = new URL(`/?deploy-check=${stamp}`, liveBase);
  const htmlResponse = await fetch(htmlUrl, { headers: { 'cache-control': 'no-cache' } });
  if (!htmlResponse.ok) throw new Error(`HTML returned ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  if (!html.includes(`name="lexi-rampart-build" content="${expected.buildId}"`)) throw new Error('production alias still serves another build');

  const manifestUrl = new URL(`/asset-manifest.json?deploy-check=${stamp}`, liveBase);
  const manifestResponse = await fetch(manifestUrl, { headers: { 'cache-control': 'no-cache' } });
  if (!manifestResponse.ok) throw new Error(`asset manifest returned ${manifestResponse.status}`);
  if (!(manifestResponse.headers.get('content-type') || '').includes('application/json')) throw new Error('asset manifest returned the SPA fallback');
  const manifest = await manifestResponse.json();
  if (manifest.buildId !== expected.buildId) throw new Error('production asset manifest does not match the deployed HTML');
  for (const asset of expected.assets) {
    const response = await fetch(new URL(asset, liveBase), { headers: { 'cache-control': 'no-cache' } });
    if (!response.ok) throw new Error(`${asset} returned ${response.status}`);
    if ((response.headers.get('content-type') || '').includes('text/html')) throw new Error(`${asset} returned the SPA fallback instead of the asset`);
  }
}

let lastError;
for (let attempt = 1; attempt <= 8; attempt += 1) {
  try {
    await verify();
    console.log(`Production release ${expected.buildId} is live with ${expected.assets.length} verified asset(s).`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 8) await wait(2000);
  }
}
throw new Error(`Post-deploy verification failed for ${liveBase.origin}: ${lastError?.message || 'unknown error'}`);
