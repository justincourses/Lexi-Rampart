import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const htmlPath = path.join(dist, 'index.html');
const headersPath = path.join(dist, '_headers');
const manifestPath = path.join(dist, 'asset-manifest.json');

const fail = (message) => {
  throw new Error(`Deploy artifact verification failed: ${message}`);
};
if (!fs.existsSync(htmlPath)) fail('dist/index.html is missing');
if (!fs.existsSync(headersPath)) fail('dist/_headers is missing');
if (!fs.existsSync(manifestPath)) fail('dist/asset-manifest.json is missing');

const html = fs.readFileSync(htmlPath, 'utf8');
const headers = fs.readFileSync(headersPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.buildId || !Array.isArray(manifest.assets) || manifest.assets.length < 2) fail('asset manifest is incomplete');
if (!html.includes(`name="lexi-rampart-build" content="${manifest.buildId}"`)) fail('HTML build id does not match the manifest');
if (!html.includes('__runeRampartAssetRecovery')) fail('asset recovery bootstrap is missing');
if (!headers.includes('/_app/*') || !headers.includes('max-age=31536000, immutable')) fail('immutable build-asset caching is missing');
if (!headers.includes('no-cache, max-age=0, must-revalidate')) fail('HTML revalidation policy is missing');

for (const asset of manifest.assets) {
  if (!asset.startsWith('/_app/') || asset.includes('..')) fail(`unsafe or unversioned asset path: ${asset}`);
  const localPath = path.join(dist, asset.slice(1));
  if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) fail(`missing asset: ${asset}`);
}
const entryAssets = manifest.assets.filter((asset) => html.includes(asset));
if (!entryAssets.some((asset) => asset.endsWith('.js')) || !entryAssets.some((asset) => asset.endsWith('.css'))) fail('HTML does not reference both the JS and CSS entry assets');

console.log(`Verified release ${manifest.buildId}: ${manifest.assets.length} hashed assets and Cloudflare cache headers.`);
