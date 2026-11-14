/**
 * PokeNow report Worker (Cloudflare Workers, module syntax, no build step).
 *
 * Lets visitors without a GitHub account send a translation problem, a
 * hotspot suggestion or a community listing request from the site. Each report becomes a GitHub issue in the
 * PokeNow repository, so the maintainer reviews everything in one place.
 *
 *   browser form ──POST /report──▶ this Worker ──▶ Turnstile check ──▶ GitHub issue
 *
 * Settings (Workers → your worker → Settings → Variables and Secrets):
 *   ISSUE_TOKEN       secret  fine-grained token: this repo only, "Issues: Read and write"
 *   TURNSTILE_SECRET  secret  Turnstile secret key for the site
 *   GITHUB_REPO       text    e.g. "Churious/pokenow"
 *   ALLOWED_ORIGINS   text    comma-separated, e.g. "https://pokenow.cc"
 *
 * Safety: requests must come from an allowed origin, pass Turnstile, and fit
 * the field limits below. Visitor text is put inside fenced code blocks so it
 * can't @mention people or inject links/markup into the issue.
 * See worker/README.md for setup.
 */

export const LIMITS = { short: 120, long: 1000 };

const LOCALES = ['en', 'fr', 'de', 'it', 'es', 'es-419', 'pt-BR', 'tr', 'id', 'ko', 'ja', 'zh-TW', 'th', 'hi'];
const REGIONS = ['Asia-Pacific', 'Europe & Middle East', 'Americas'];
/** Same options as .github/ISSUE_TEMPLATE/community.yml. */
export const PLATFORMS = ['Discord', 'KakaoTalk Open Chat', 'LINE', 'Telegram', 'WhatsApp', 'Other'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Keeps visitor text inert inside a fenced block. */
export function fence(text) {
  const clean = String(text).replace(/\r\n?/g, '\n').replace(/```/g, "'''");
  return '```text\n' + (clean || '-') + '\n```';
}

/** One-line text for issue titles: no newlines, no @mentions, no markdown links. */
export function titleSafe(text, max = 60) {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/@/g, '@​')
    .replace(/[[\]<>`]/g, '')
    .slice(0, max)
    .trim();
}

/**
 * Validates a report and turns it into a GitHub issue (title, body, labels).
 * Returns { error } with a short code when the input is not acceptable.
 */
export function buildIssue(input) {
  if (!input || typeof input !== 'object') return { error: 'bad_request' };
  // Honeypot: real visitors never see or fill this field.
  if (str(input.website)) return { error: 'bad_request' };

  const tooLong = (v, max) => v.length > max;

  if (input.type === 'translation') {
    const language = str(input.language);
    const page = str(input.page);
    const current = str(input.current);
    const suggestion = str(input.suggestion);
    const notes = str(input.notes);
    if (!LOCALES.includes(language)) return { error: 'bad_language' };
    if (!current || !suggestion) return { error: 'missing_fields' };
    if ([current, suggestion, notes].some((v) => tooLong(v, LIMITS.long)) || tooLong(page, 300)) {
      return { error: 'too_long' };
    }
    const safePage = /^https:\/\/[^\s]+$/.test(page) ? page : '';
    return {
      title: `[Translation] ${language}: ${titleSafe(current, 50)}`,
      labels: ['translation'],
      body: [
        '_Sent from the PokeNow site form (no GitHub account)._',
        '',
        `**Language:** \`${language}\``,
        `**Page:** ${safePage ? '`' + safePage.replace(/`/g, '') + '`' : '-'}`,
        '',
        '**Text on the site now**',
        fence(current),
        '**Better wording**',
        fence(suggestion),
        ...(notes ? ['**Notes**', fence(notes)] : []),
      ].join('\n'),
    };
  }

  if (input.type === 'hotspot') {
    const city = str(input.city);
    const spot = str(input.spot);
    const country = str(input.country).toUpperCase();
    const region = str(input.region);
    const coords = str(input.coords);
    const source = str(input.source);
    const note = str(input.note);
    if (!city || !spot || !coords || !source) return { error: 'missing_fields' };
    if ([city, spot, coords].some((v) => tooLong(v, LIMITS.short)) || [source, note].some((v) => tooLong(v, LIMITS.long))) {
      return { error: 'too_long' };
    }
    const m = coords.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    const lat = m ? Number(m[1]) : NaN;
    const lng = m ? Number(m[2]) : NaN;
    if (!m || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: 'bad_coords' };
    if (country && !/^[A-Z]{2}$/.test(country)) return { error: 'bad_country' };
    if (region && !REGIONS.includes(region)) return { error: 'bad_request' };
    return {
      title: `[Hotspot] ${titleSafe(city, 40)}, ${titleSafe(spot, 50)}`,
      labels: ['hotspot-suggestion'],
      body: [
        '_Sent from the PokeNow site form (no GitHub account)._',
        '',
        `**Coordinates:** \`${lat}, ${lng}\` · [OpenStreetMap](https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng})`,
        `**Country:** ${country ? '`' + country + '`' : '-'} · **Region:** ${region ? '`' + region + '`' : '-'}`,
        '',
        '**City**',
        fence(city),
        '**Spot**',
        fence(spot),
        '**Source for the coordinates**',
        fence(source),
        ...(note ? ['**Note**', fence(note)] : []),
        '',
        '_Maintainer: check the coordinates and source before adding it to `src/data/hotspots.ts`._',
      ].join('\n'),
    };
  }

  if (input.type === 'community') {
    const name = str(input.name);
    const platform = str(input.platform);
    const url = str(input.url);
    const hotspots = str(input.hotspots);
    const languages = str(input.languages);
    const description = str(input.description);
    if (!name || !platform || !url || !hotspots || !languages) return { error: 'missing_fields' };
    // Both rule checkboxes must be ticked ("on" from a form, or true).
    const ticked = (v) => v === true || v === 'on';
    if (!ticked(input.ruleNoCheat) || !ticked(input.ruleAdmin)) return { error: 'missing_fields' };
    if (!PLATFORMS.includes(platform)) return { error: 'bad_request' };
    if ([name, hotspots, languages].some((v) => tooLong(v, LIMITS.short)) || tooLong(url, 300) || tooLong(description, 300)) {
      return { error: 'too_long' };
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return { error: 'bad_url' };
    }
    if (parsed.protocol !== 'https:' || /\s/.test(url)) return { error: 'bad_url' };
    // Headings match the GitHub issue form, so scripts/review-issue.mjs reads both the same way.
    return {
      title: `[Community] ${titleSafe(name, 60)}`,
      labels: ['community-listing'],
      body: [
        '_Sent from the PokeNow site form (no GitHub account)._',
        '',
        '### Community name',
        '',
        fence(name),
        '',
        '### Platform',
        '',
        platform,
        '',
        '### Public invite link',
        '',
        fence(url),
        '',
        '### Which PokeNow hotspot(s)?',
        '',
        fence(hotspots),
        '',
        '### Main language(s)',
        '',
        fence(languages),
        '',
        '### One-line description (optional)',
        '',
        description ? fence(description) : '_No response_',
        '',
        '### Community rules',
        '',
        '- [x] Our community does not allow spoofing, account trading, bots or cheat tools.',
        "- [x] I'm an admin of this community or have its admins' permission to list it.",
        '',
        '_Maintainer: open the link and check the community before adding it to `src/data/communities.ts`._',
      ].join('\n'),
    };
  }

  return { error: 'bad_type' };
}

function cors(origin, env) {
  const allowed = str(env.ALLOWED_ORIGINS)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : null;
}

const json = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

async function verifyTurnstile(token, ip, secret) {
  if (!secret) {
    console.error('TURNSTILE_SECRET is not set (Worker → Settings → Variables and Secrets, type Secret)');
    return false;
  }
  if (!token) {
    console.warn('turnstile token missing');
    return false;
  }
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await r.json().catch(() => ({}));
  if (data.success !== true) console.warn('turnstile rejected', JSON.stringify(data['error-codes'] ?? r.status));
  return data.success === true;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin, env);
    try {
      return await handle(request, env, origin, headers);
    } catch (err) {
      // Keep CORS headers on failures too, or the browser only sees a "network error".
      console.error('report failed', err instanceof Error ? err.stack || err.message : String(err));
      return json(500, { error: 'server' }, headers ?? {});
    }
  },
};

async function handle(request, env, origin, headers) {
  const url = new URL(request.url);
  if (url.pathname !== '/report') return json(404, { error: 'not_found' });
  if (!headers) {
    console.warn('origin not allowed', origin || '(none)');
    return json(403, { error: 'origin' });
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json(405, { error: 'method' }, headers);
  if (Number(request.headers.get('Content-Length') || 0) > 16_000) return json(413, { error: 'too_long' }, headers);

  let input;
  try {
    input = await request.json();
  } catch {
    return json(400, { error: 'bad_request' }, headers);
  }

  const ok = await verifyTurnstile(str(input?.turnstileToken), request.headers.get('CF-Connecting-IP'), env.TURNSTILE_SECRET);
  if (!ok) return json(403, { error: 'captcha' }, headers);

  const issue = buildIssue(input);
  if (issue.error) return json(400, { error: issue.error }, headers);

  const gh = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ISSUE_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pokenow-report-worker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title: issue.title, body: issue.body, labels: issue.labels }),
  });
  if (!env.ISSUE_TOKEN) console.error('ISSUE_TOKEN is not set (Worker → Settings → Variables and Secrets, type Secret)');
  if (!gh.ok) {
    console.error('github issue failed', gh.status, (await gh.text().catch(() => '')).slice(0, 300));
    return json(502, { error: 'github' }, headers);
  }
  return json(201, { ok: true }, headers);
}
