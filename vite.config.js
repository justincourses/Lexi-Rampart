import { defineConfig } from 'vite';

const buildId = String(
  process.env.RUNE_RAMPART_BUILD_ID
  || process.env.CF_PAGES_COMMIT_SHA
  || process.env.GITHUB_SHA
  || `local-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`
).slice(0, 40);

function releaseManifest() {
  return {
    name: 'rune-rampart-release-manifest',
    transformIndexHtml() {
      return [{
        tag: 'meta',
        attrs: { name: 'rune-rampart-build', content: buildId },
        injectTo: 'head-prepend',
      }];
    },
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((fileName) => fileName.startsWith('_app/'))
        .map((fileName) => `/${fileName}`)
        .sort();
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: `${JSON.stringify({ buildId, assets }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [releaseManifest()],
  publicDir: 'public',
  define: {
    __RUNE_RAMPART_BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsDir: '_app',
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
