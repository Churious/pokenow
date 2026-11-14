import { describe, expect, it, vi } from 'vitest';
import worker, { buildIssue, fence, titleSafe } from './report-worker.js';

const translation = {
  type: 'translation',
  language: 'ko',
  page: 'https://pokenow.cc/#events',
  current: '내 시간대에서 진행 중',
  suggestion: '지금 진행 중',
};
const hotspot = {
  type: 'hotspot',
  city: 'Seoul',
  spot: 'Gwanghwamun Square',
  country: 'kr',
  region: 'Asia-Pacific',
  coords: '37.5720, 126.9769',
  source: 'https://www.openstreetmap.org/',
};

describe('buildIssue', () => {
  it('builds a translation issue', () => {
    const i = buildIssue(translation);
    expect(i.labels).toEqual(['translation']);
    expect(i.title).toBe('[Translation] ko: 내 시간대에서 진행 중');
    expect(i.body).toContain('```text\n지금 진행 중\n```');
  });

  it('builds a hotspot issue with parsed coordinates', () => {
    const i = buildIssue(hotspot);
    expect(i.labels).toEqual(['hotspot-suggestion']);
    expect(i.body).toContain('`37.572, 126.9769`');
    expect(i.body).toContain('`KR`');
  });

  it('rejects bad input', () => {
    expect(buildIssue({ ...translation, language: 'xx' }).error).toBe('bad_language');
    expect(buildIssue({ ...translation, suggestion: '' }).error).toBe('missing_fields');
    expect(buildIssue({ ...translation, current: 'a'.repeat(1001) }).error).toBe('too_long');
    expect(buildIssue({ ...hotspot, coords: '91, 0' }).error).toBe('bad_coords');
    expect(buildIssue({ ...hotspot, coords: 'Seoul' }).error).toBe('bad_coords');
    expect(buildIssue({ ...hotspot, website: 'spam' }).error).toBe('bad_request');
    expect(buildIssue({ type: 'other' }).error).toBe('bad_type');
  });

  it('keeps visitor text inert', () => {
    expect(fence('```\n@everyone [x](http://evil)')).toBe("```text\n'''\n@everyone [x](http://evil)\n```");
    expect(titleSafe('hi @someone [link](x)\nnext')).toBe('hi @​someone link(x) next');
    const i = buildIssue({ ...translation, page: 'javascript:alert(1)' });
    expect(i.body).toContain('**Page:** -');
  });
});

describe('worker fetch', () => {
  const env = { ALLOWED_ORIGINS: 'https://pokenow.cc', GITHUB_REPO: 'o/r', ISSUE_TOKEN: 't', TURNSTILE_SECRET: 's' };
  const req = (body, origin = 'https://pokenow.cc') =>
    new Request('https://w.example/report', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('refuses other origins and failed captchas', async () => {
    expect((await worker.fetch(req(translation, 'https://evil.example'), env)).status).toBe(403);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    const r = await worker.fetch(req({ ...translation, turnstileToken: 'x' }), env);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'captcha' });
    vi.unstubAllGlobals();
  });

  it('creates the issue when everything checks out', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push([String(url), init]);
        return String(url).includes('turnstile')
          ? new Response(JSON.stringify({ success: true }))
          : new Response('{}', { status: 201 });
      }),
    );
    const r = await worker.fetch(req({ ...hotspot, turnstileToken: 'x' }), env);
    expect(r.status).toBe(201);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://pokenow.cc');
    const gh = calls.find(([u]) => u.includes('api.github.com'));
    expect(gh[0]).toBe('https://api.github.com/repos/o/r/issues');
    expect(JSON.parse(gh[1].body).labels).toEqual(['hotspot-suggestion']);
    vi.unstubAllGlobals();
  });

  it('answers with CORS headers even when something throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('dns'); }));
    const r = await worker.fetch(req({ ...translation, turnstileToken: 'x' }), env);
    expect(r.status).toBe(500);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://pokenow.cc');
    expect(await r.json()).toEqual({ error: 'server' });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});

describe('community listings', () => {
  const community = {
    type: 'community',
    name: 'Seoul Raiders',
    platform: 'Discord',
    url: 'https://discord.gg/abc',
    hotspots: 'Seoul, City Hall',
    languages: 'Korean',
    ruleNoCheat: 'on',
    ruleAdmin: 'on',
  };
  it('builds an issue the review script can read', () => {
    const i = buildIssue(community);
    expect(i.labels).toEqual(['community-listing']);
    expect(i.title).toBe('[Community] Seoul Raiders');
    expect(i.body).toContain('### Platform\n\nDiscord');
    expect(i.body).toContain('### One-line description (optional)\n\n_No response_');
  });
  it('rejects unticked rules, unknown platforms and non-https links', () => {
    expect(buildIssue({ ...community, ruleAdmin: '' }).error).toBe('missing_fields');
    expect(buildIssue({ ...community, platform: 'Skype' }).error).toBe('bad_request');
    expect(buildIssue({ ...community, url: 'http://discord.gg/abc' }).error).toBe('bad_url');
    expect(buildIssue({ ...community, url: 'not a link' }).error).toBe('bad_url');
  });
});
