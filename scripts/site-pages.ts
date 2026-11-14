/**
 * Vite plugin: static pages for search engines and link previews.
 *
 * For every hotspot it emits `<id>.html` — a copy of the built index.html with
 * its own <title>, description, canonical URL and Open Graph tags, plus a short
 * plain-HTML summary inside #root (replaced by the React app on load, but
 * readable by crawlers and without JavaScript) Visually hidden while the app loads.. It also writes sitemap.xml and
 * robots.txt.
 *
 * The React app picks the page from the URL (src/lib/routes.ts), so the same
 * bundle serves every page.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { HOTSPOTS } from '../src/data/hotspots';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface PageMeta {
  title: string;
  description: string;
  url: string;
  body: string;
  /** Name of a 1200×630 image in public/og/ (made by `npm run og`). */
  ogImage: string;
  ogAlt: string;
}

const OG_DIR = resolve(import.meta.dirname, '../public/og');

/** Large preview card when the page has its own image, otherwise the app icon. */
function ogImageTags(m: PageMeta, siteUrl: string): string[] {
  if (existsSync(resolve(OG_DIR, m.ogImage))) {
    return [
      `<meta property="og:image" content="${esc(siteUrl)}og/${esc(m.ogImage)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${esc(m.ogAlt)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ];
  }
  return [
    `<meta property="og:image" content="${esc(siteUrl)}icons/icon-512.png" />`,
    `<meta name="twitter:card" content="summary" />`,
  ];
}

function applyMeta(html: string, m: PageMeta, siteUrl: string): string {
  const head = [
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PokeSpot" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    ...ogImageTags(m, siteUrl),
    // The summary in #root is for crawlers and no-JS visitors. With JavaScript on,
    // hide it while the app loads instead of flashing unstyled text; if the app
    // still hasn't replaced it after 4s (script blocked or failed), show it.
    `<script>document.documentElement.classList.add('js')</script>`,
    `<style>.js .prerender{visibility:hidden;animation:prerender-show 0s 4s forwards}@keyframes prerender-show{to{visibility:visible}}</style>`,
  ].join('\n    ');

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(m.description)}" />`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${m.body}</div>`);
}

export function sitePages(siteUrl: string): Plugin {
  const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;

  return {
    name: 'pokespot-site-pages',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset' || typeof index.source !== 'string') return;
      const template = index.source;

      // Home page: add canonical + OG tags and a crawlable summary.
      const homeDescription =
        'Find the best Pokémon GO raid hotspot right now: live local times, Raid Hour and Spotlight Hour status, and one-click coordinates for hotspots around the world.';
      index.source = applyMeta(
        template,
        {
          title: 'PokeSpot — Best Raid Spot Now',
          description: homeDescription,
          url: base,
          ogImage: 'home.png',
          ogAlt: 'PokeSpot: best raid spot, right now',
          body: `<main class="prerender" style="padding:1rem;color:#d7deea;font-family:sans-serif"><h1>PokeSpot</h1><p>${esc(
            homeDescription,
          )}</p><ul>${HOTSPOTS.map(
            (h) => `<li><a href="./${h.id}" style="color:#d7deea">${esc(h.city)}, ${esc(h.spot)}</a></li>`,
          ).join('')}</ul></main>`,
        },
        base,
      );

      for (const h of HOTSPOTS) {
        const title = `${h.city} raid hotspot: ${h.spot} — Raid Hour times | PokeSpot`;
        const description = `Live local time in ${h.city}, Raid Hour and Spotlight Hour countdowns, and copyable coordinates (${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}) for ${h.spot}.`;
        this.emitFile({
          type: 'asset',
          fileName: `${h.id}.html`,
          source: applyMeta(
            template,
            {
              title,
              description,
              url: `${base}${h.id}`,
              ogImage: `${h.id}.png`,
              ogAlt: `${h.city}, ${h.spot} on PokeSpot`,
              body: `<main class="prerender" style="padding:1rem;color:#d7deea;font-family:sans-serif"><p><a href="./" style="color:#d7deea">PokeSpot</a></p><h1>${esc(
                h.city,
              )}</h1><p>${esc(h.spot)}</p><p>${esc(description)}</p><p>Coordinates: ${h.lat.toFixed(
                4,
              )}, ${h.lng.toFixed(4)} · Time zone: ${esc(h.timeZone)}</p>${
                h.note ? `<p>${esc(h.note)}</p>` : ''
              }</main>`,
            },
            base,
          ),
        });
      }

      const urls = [base, ...HOTSPOTS.map((h) => `${base}${h.id}`), `${base}privacy.html`];
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`,
      });
    },
  };
}
