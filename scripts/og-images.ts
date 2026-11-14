/**
 * Renders the 1200×630 link-preview images in public/og/ — one for the home
 * page and one per hotspot. They are committed, so the site build doesn't need
 * a browser; re-run this after adding or renaming a hotspot:
 *
 *   npx playwright install chromium   # once
 *   npm run og
 *
 * Pages whose image is missing fall back to the app icon (see site-pages.ts).
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { HOTSPOTS } from '../src/data/hotspots.ts';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'public/og');
// Inlined: a page opened with setContent can't load file:// fonts.
// latin-ext covers names like İzmir or São Paulo's neighbours.
const fontFile = (subset: string) =>
  `data:font/woff2;base64,${readFileSync(
    resolve(root, `node_modules/@fontsource-variable/archivo/files/archivo-${subset}-wdth-normal.woff2`),
  ).toString('base64')}`;
const font = fontFile('latin');
const fontExt = fontFile('latin-ext');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Lucide "Radar" (ISC), the same mark the app header uses.
const radarIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#3cc796" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/>
  <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/>
  <circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/></svg>`;

// Concentric rings with one sweep: the dial from the app, cropped off the right edge.
const rings = `<svg class="rings" viewBox="0 0 640 640" fill="none">
  ${[300, 230, 160, 90].map((r) => `<circle cx="320" cy="320" r="${r}" stroke="#22304d" stroke-width="2"/>`).join('')}
  <path d="M320 320 L532 108" stroke="#3cc796" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  <circle cx="320" cy="320" r="7" fill="#3cc796"/>
  <circle cx="452" cy="196" r="11" fill="#f5a524"/>
  <circle cx="452" cy="196" r="24" stroke="#f5a524" stroke-width="2" opacity=".4"/>
</svg>`;

function page(title: string, subtitle: string, footer: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Archivo; src: url('${font}') format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: ArchivoExt; src: url('${fontExt}') format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #0b1120; color: #d7deea; font-family: Archivo, ArchivoExt, sans-serif;
  position: relative; overflow: hidden; padding: 64px 72px; display: flex; flex-direction: column; }
.rings { position: absolute; width: 640px; height: 640px; right: -150px; top: -5px; }
.brand { display: flex; align-items: center; gap: 14px; font-size: 40px; font-weight: 800; font-stretch: 68%; position: relative; }
.brand svg { width: 46px; height: 46px; }
.main { margin-top: auto; position: relative; max-width: 820px; }
h1 { font-size: ${Math.max(...title.split('\n').map((l) => l.length)) > 14 ? 128 : 156}px; white-space: pre-line; line-height: .92; font-weight: 800; font-stretch: 68%; letter-spacing: -.01em; }
p.sub { margin-top: 18px; font-size: 40px; line-height: 1.15; color: #d7deea; font-stretch: 84%; font-weight: 500; }
p.foot { margin-top: 30px; font-size: 26px; color: #7d8ba6; }
</style></head><body>${rings}
<div class="brand">${radarIcon}<span>PokeNow</span></div>
<div class="main"><h1>${esc(title)}</h1><p class="sub">${esc(subtitle)}</p><p class="foot">${esc(footer)}</p></div>
</body></html>`;
}

const jobs: { file: string; html: string }[] = [
  {
    file: 'home.png',
    html: page(
      'Best raid spot,\nright now',
      `Live local times and Raid Hour countdowns for ${HOTSPOTS.length} hotspots worldwide`,
      'Free and open source. Not affiliated with Scopely, Nintendo or The Pokémon Company.',
    ),
  },
  ...HOTSPOTS.map((h) => ({
    file: `${h.id}.png`,
    html: page(h.city, h.spot, 'Raid Hour times, live local clock and copyable coordinates'),
  })),
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const job of jobs) {
  await tab.setContent(job.html, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  if (!(await tab.evaluate(() => document.fonts.check('800 40px Archivo')))) throw new Error('Archivo font did not load');
  await tab.screenshot({ path: resolve(outDir, job.file), type: 'png' });
  console.log(`og/${job.file}`);
}
await browser.close();
