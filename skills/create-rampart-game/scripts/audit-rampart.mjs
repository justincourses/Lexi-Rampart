#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
  } catch (error) {
    return '';
  }
}

function listFiles(relativePath, predicate = () => true) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  return fs.readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => path.posix.join(relativePath, entry.name))
    .sort();
}

function parseJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    return null;
  }
}

function extractCssTokens(css) {
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] || '';
  return Object.fromEntries(
    [...rootBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)]
      .map((match) => [`--${match[1]}`, match[2].trim()])
  );
}

function extractClarityProjectIds(html) {
  return [...html.matchAll(/\}\)\(window,\s*document,\s*["']clarity["'],\s*["']script["'],\s*["']([^"']+)["']\);/g)]
    .map((match) => match[1]);
}

const packageJson = parseJson('package.json') || {};
const sourceFiles = [
  ...listFiles('src/game', (name) => name.endsWith('.js')),
  ...listFiles('src/config', (name) => name.endsWith('.js')),
  ...listFiles('src/data', (name) => name.endsWith('.json')),
];
const tests = listFiles('tests', (name) => name.endsWith('.js'));
const docs = listFiles('docs', (name) => name.endsWith('.md'));
const indexHtml = readText('index.html');
const clarityProjectIds = extractClarityProjectIds(indexHtml);
const combinedContractSource = [
  readText('src/game/constants.js'),
  readText('src/game/events.js'),
  readText('index.html'),
  readText('vite.config.js'),
  readText('public/_headers'),
].join('\n');

const report = {
  repositoryRoot: root,
  recognizedBaseline: exists('src/game/runtime.js')
    && exists('src/game/shared.js')
    && exists('docs/gameplay.md')
    && packageJson.name === 'lexi-rampart',
  package: {
    name: packageJson.name || null,
    version: packageJson.version || null,
    type: packageJson.type || null,
    nodeEngine: packageJson.engines?.node || null,
    packageManager: packageJson.packageManager || null,
    scripts: packageJson.scripts || {},
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
  },
  instructions: {
    agents: exists('AGENTS.md'),
    contributing: exists('CONTRIBUTING.md'),
    readme: exists('README.md'),
    disclaimer: exists('DISCLAIMER.md'),
    topLevelLicense: ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].find(exists) || null,
  },
  entrypoints: {
    html: exists('index.html'),
    main: exists('src/main.js'),
    runtime: exists('src/game/runtime.js'),
    styles: exists('styles.css'),
  },
  inventory: {
    sourceFiles,
    tests,
    docs,
    publicAudioNotices: [
      'public/assets/audio/ui/License.txt',
      'public/assets/audio/impact/License.txt',
    ].filter(exists),
  },
  protectedContracts: {
    testHook: combinedContractSource.includes('__runeRampartTest'),
    storageNamespace: combinedContractSource.includes('runeRampart.'),
    cssAnimationFallback: readText('src/game/animation.js').includes("animationDriver') === 'css'"),
    reducedMotion: readText('styles.css').includes('prefers-reduced-motion'),
    assetRecovery: combinedContractSource.includes('__runeRampartAssetRecovery'),
    hashedAssetDirectory: combinedContractSource.includes("assetsDir: '_app'"),
    immutableAssetCache: combinedContractSource.includes('max-age=31536000, immutable'),
  },
  operationalReview: {
    microsoftClarityPresent: indexHtml.includes('clarity.ms/tag/'),
    microsoftClarityLoaderCount: clarityProjectIds.length,
    microsoftClarityProjectIds: clarityProjectIds,
    remoteGoogleFontsPresent: readText('styles.css').includes('fonts.googleapis.com'),
    cloudflarePagesConfigured: exists('wrangler.jsonc'),
  },
  cssRootTokens: extractCssTokens(readText('styles.css')),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
