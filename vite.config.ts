import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const CLIENT_RE = /^ca-pub-\d{10,20}$/;

/**
 * AdSense site setup, driven by VITE_ADSENSE_CLIENT ("ca-pub-…"):
 *  - adds the account meta tag and the AdSense loader to every page's <head>
 *    (what the AdSense crawler looks for when verifying the site), and
 *  - emits /ads.txt with the matching publisher line.
 * With no client id, nothing is added — dev builds and forks stay ad-free.
 */
function adsense(client: string): Plugin {
  const valid = CLIENT_RE.test(client);
  return {
    name: 'pokespot-adsense',
    transformIndexHtml() {
      if (!valid) return [];
      return [
        { tag: 'meta', attrs: { name: 'google-adsense-account', content: client }, injectTo: 'head' },
        {
          tag: 'script',
          attrs: {
            id: 'adsbygoogle-js',
            async: true,
            crossorigin: 'anonymous',
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
          },
          injectTo: 'head',
        },
      ];
    },
    generateBundle() {
      if (!valid) return;
      // "f08c47fec0942fa0" is Google's TAG certification ID for AdSense.
      this.emitFile({
        type: 'asset',
        fileName: 'ads.txt',
        source: `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`,
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const client = env.VITE_ADSENSE_CLIENT ?? '';
  if (client && !CLIENT_RE.test(client)) {
    throw new Error(`VITE_ADSENSE_CLIENT must look like "ca-pub-1234567890123456", got "${client}"`);
  }

  return {
    // Relative asset paths so the same build works on GitHub Pages (/pokespot/),
    // a custom domain, or any static host.
    base: './',
    plugins: [react(), tailwindcss(), adsense(client)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          privacy: resolve(import.meta.dirname, 'privacy.html'),
        },
      },
    },
  };
});
