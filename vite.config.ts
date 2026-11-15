import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sitePages } from './scripts/site-pages';

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
    name: 'pokenow-adsense',
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
            // Read by src/hooks/useAdBlocked.ts: did the loader load, or was it blocked?
            onload: 'window.__pokenowAds="loaded"',
            onerror: 'window.__pokenowAds="error"',
            // Keep Cloudflare Rocket Loader from deferring it (that would look like a blocked script).
            'data-cfasync': 'false',
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

/**
 * Cookie-free page-view analytics, off unless configured:
 *  - VITE_CF_ANALYTICS_TOKEN → Cloudflare Web Analytics beacon
 *  - VITE_GOATCOUNTER_CODE   → GoatCounter (hosted free tier is for non-commercial sites)
 */
/**
 * Analytics loaders, injected only when a token is configured. They are added by a tiny inline script instead
 * of plain <script src> tags so the site owner can leave their own visits out:
 *   https://pokenow.cc/?notrack  → this browser stops sending page views (localStorage pokenow:no-analytics)
 *   https://pokenow.cc/?track    → counts again
 * A short note confirms the switch. data-cfasync=false keeps Cloudflare Rocket Loader from rewriting it.
 */
function analytics(cfToken: string, goatCode: string): Plugin {
  const safe = (v: string) => /^[A-Za-z0-9_-]{1,64}$/.test(v);
  return {
    name: 'pokenow-analytics',
    transformIndexHtml() {
      const loaders: string[] = [];
      if (cfToken && safe(cfToken)) {
        loaders.push(
          `add('https://static.cloudflareinsights.com/beacon.min.js','data-cf-beacon',${JSON.stringify(
            JSON.stringify({ token: cfToken }),
          )},true)`,
        );
      }
      if (goatCode && safe(goatCode)) {
        loaders.push(
          `add('https://gc.zgo.at/count.js','data-goatcounter',${JSON.stringify(`https://${goatCode}.goatcounter.com/count`)},false)`,
        );
      }
      if (!loaders.length) return [];
      const code =
        `(function(){var K='pokenow:no-analytics',q=location.search,off=false,note='';` +
        `try{if(/[?&]notrack(=|&|$)/.test(q)){localStorage.setItem(K,'1');note='Analytics off in this browser';}` +
        `else if(/[?&]track(=|&|$)/.test(q)){localStorage.removeItem(K);note='Analytics on again';}` +
        `off=localStorage.getItem(K)==='1';}catch(e){}` +
        `if(note){var n=document.createElement('div');n.textContent=note;n.style.cssText='position:fixed;left:50%;top:12px;` +
        `transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;font:13px system-ui;padding:8px 12px;` +
        `border-radius:6px';document.body.appendChild(n);setTimeout(function(){n.remove()},4000);}` +
        `if(off)return;function add(src,attr,val,isDefer){var s=document.createElement('script');s.src=src;` +
        `if(isDefer)s.defer=true;else s.async=true;s.setAttribute(attr,val);document.body.appendChild(s);}` +
        loaders.join(';') +
        `})();`;
      return [{ tag: 'script', attrs: { 'data-cfasync': 'false' }, children: code, injectTo: 'body' as const }];
    },
  };
}

// https://vite.dev/config/
/**
 * Starts the two biggest first-paint downloads together with the HTML instead
 * of after main.tsx has run: the app bundle (bootstrap.tsx, loaded dynamically
 * by the tiny entry) and the Latin cut of the Archivo font. Only for the app
 * pages — privacy.html has neither.
 */
function preloadCritical(): Plugin {
  return {
    name: 'pokenow-preload-critical',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle || !ctx.filename.endsWith('index.html')) return [];
        const files = Object.values(ctx.bundle);
        const app = files.find((f) => f.type === 'chunk' && f.facadeModuleId?.endsWith('/src/bootstrap.tsx'));
        const font = files.find((f) => f.type === 'asset' && /archivo-latin-wdth-normal.*\.woff2$/.test(f.fileName));
        const tags = [];
        if (app) {
          tags.push({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `./${app.fileName}` }, injectTo: 'head' as const });
        }
        if (font) {
          tags.push({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: `./${font.fileName}` },
            injectTo: 'head' as const,
          });
        }
        return tags;
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // AdSense shows the id as "pub-…" in most places; the ad client is "ca-pub-…". Accept both.
  const rawClient = (env.VITE_ADSENSE_CLIENT ?? '').trim();
  const client = /^pub-/.test(rawClient) ? `ca-${rawClient}` : rawClient;
  if (client && !CLIENT_RE.test(client)) {
    throw new Error(`VITE_ADSENSE_CLIENT must look like "ca-pub-1234567890123456" (or "pub-…"), got "${client}"`);
  }

  return {
    // Relative asset paths so the same build works on GitHub Pages (/pokenow/),
    // a custom domain, or any static host.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      adsense(client),
      analytics(env.VITE_CF_ANALYTICS_TOKEN ?? '', env.VITE_GOATCOUNTER_CODE ?? ''),
      preloadCritical(),
      sitePages(env.VITE_SITE_URL || 'https://churious.github.io/pokenow/'),
      // Installable app + offline app shell. Map tiles and ads are never cached.
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script-defer',
        includeAssets: ['favicon.svg', 'favicon.ico', 'icons/favicon-96.png', 'icons/apple-touch-icon.png'],
        manifest: {
          id: './',
          name: 'PokeNow — Best Raid Spot Now',
          short_name: 'PokeNow',
          description:
            'Live local times, Raid Hour status and one-click coordinates for Pokémon GO raid hotspots worldwide.',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0b1120',
          theme_color: '#0b1120',
          categories: ['games', 'utilities'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Link-preview images are for other sites' crawlers, not for offline use.
          globIgnores: ['og/**'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/privacy/, /ads\.txt$/, /sitemap\.xml$/, /robots\.txt$/, /naver.*\.html$/],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
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
