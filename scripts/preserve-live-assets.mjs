import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const liveBase = new URL(process.env.DEPLOY_CHECK_URL || 'https://lexi-rampart.pages.dev/');
const allowedAsset = (value) => /^\/(?:_app\/[a-zA-Z0-9._/-]+|assets\/index-[a-zA-Z0-9._-]+\.(?:js|css))$/.test(value) && !value.includes('..');

async function discoverAssets() {
  const stamp = Date.now().toString(36);
  const manifestUrl = new URL(`/asset-manifest.json?previous=${stamp}`, liveBase);
  const manifestResponse = await fetch(manifestUrl, { headers: { 'cache-control': 'no-cache' } });
  if (manifestResponse.ok) {
    try {
      const manifest = await manifestResponse.json();
      if (Array.isArray(manifest.assets)) return manifest.assets.filter(allowedAsset);
    } catch (error) {
      // Older releases have no manifest and Pages may return the SPA HTML fallback with status 200.
    }
  }
  const htmlUrl = new URL(`/?previous=${stamp}`, liveBase);
  const htmlResponse = await fetch(htmlUrl, { headers: { 'cache-control': 'no-cache' } });
  if (!htmlResponse.ok) throw new Error(`current production HTML returned ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  return [...html.matchAll(/(?:src|href)="(\/(?:_app\/[^"?]+|assets\/index-[^"?]+\.(?:js|css)))/g)]
    .map((match) => match[1])
    .filter(allowedAsset);
}

try {
  const assets = [...new Set(await discoverAssets())];
  let preserved = 0;
  for (const asset of assets) {
    const destination = path.join(dist, asset.slice(1));
    if (fs.existsSync(destination)) continue;
    const response = await fetch(new URL(asset, liveBase), { headers: { 'cache-control': 'no-cache' } });
    if (!response.ok) throw new Error(`${asset} returned ${response.status}`);
    if ((response.headers.get('content-type') || '').includes('text/html')) throw new Error(`${asset} returned the SPA fallback instead of the asset`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error(`${asset} has an invalid size`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    preserved += 1;
  }
  console.log(`Preserved ${preserved} previous-release asset(s) from ${liveBase.origin}.`);
} catch (error) {
  console.warn(`Previous-release asset preservation skipped: ${error.message}`);
}
