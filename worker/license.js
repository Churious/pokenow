/**
 * PokeNow Pro license handler (Cloudflare Workers + KV + Lemon Squeezy).
 *
 * Anti-abuse guarantees:
 *  - Max 3 active devices per license key (enforced by Lemon Squeezy + tracked in KV).
 *  - Swap budget: max 2 deactivations per 30 days per key in KV, blocking key-rotation sharing.
 *  - IP rate limiting on activation + Turnstile verification.
 *  - HMAC-SHA256 signed session tokens bound to (keyHash, deviceId, instanceId).
 *  - Periodic validation (6h KV cache) catches refunded or disabled keys across all devices.
 */

export const MAX_DEVICES = 3;
export const MAX_SWAPS_PER_30D = 2;
export const SWAP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const VALIDATE_CACHE_TTL_SEC = 6 * 60 * 60;
export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_SEC = 10 * 60;

const LS_BASE = 'https://api.lemonsqueezy.com/v1/licenses';
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const b64url = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const unb64url = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signToken(payload, secret) {
  const encoded = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sigB64] = token.split('.');
  if (!encoded || !sigB64) return null;
  try {
    const key = await importHmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, unb64url(sigB64), new TextEncoder().encode(encoded));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(encoded)));
    if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function recentSwaps(swaps, now = Date.now()) {
  if (!Array.isArray(swaps)) return [];
  return swaps.filter((t) => typeof t === 'number' && now - t < SWAP_WINDOW_MS);
}

async function readKeyRecord(kv, keyHash) {
  if (!kv) return { devices: [], swaps: [] };
  const raw = await kv.get(`key:${keyHash}`, 'json').catch(() => null);
  return {
    devices: Array.isArray(raw?.devices) ? raw.devices : [],
    swaps: Array.isArray(raw?.swaps) ? raw.swaps : [],
  };
}

async function writeKeyRecord(kv, keyHash, record) {
  if (!kv) return;
  await kv.put(`key:${keyHash}`, JSON.stringify(record));
}

async function checkRateLimit(kv, ip) {
  if (!kv || !ip) return true;
  const k = `rl:${ip}`;
  const current = Number((await kv.get(k)) || 0);
  if (current >= RATE_LIMIT_MAX) return false;
  await kv.put(k, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_SEC });
  return true;
}

async function callLemonSqueezy(endpoint, body, fetchImpl = fetch) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) form.set(k, String(v));
  }
  const r = await fetchImpl(`${LS_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

const json = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export async function handleLicenseRequest(request, env, headers, { verifyTurnstile, fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!env.LICENSE_SECRET) return json(503, { error: 'license_not_configured' }, headers);

  let input;
  try {
    input = await request.json();
  } catch {
    return json(400, { error: 'bad_request' }, headers);
  }

  const kv = env.LICENSE_KV;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const now = Date.now();

  if (path === '/license/activate') {
    const ok = await verifyTurnstile(str(input?.turnstileToken), ip, env.TURNSTILE_SECRET);
    if (!ok) return json(403, { error: 'captcha' }, headers);

    if (!(await checkRateLimit(kv, ip))) {
      return json(429, { error: 'rate_limit' }, headers);
    }

    const licenseKey = str(input?.licenseKey);
    const deviceId = str(input?.deviceId);
    const deviceLabel = str(input?.deviceLabel).slice(0, 60) || 'Browser';
    if (!licenseKey || licenseKey.length > 120 || !deviceId || deviceId.length > 80) {
      return json(400, { error: 'missing_fields' }, headers);
    }

    const ls = await callLemonSqueezy(
      'activate',
      { license_key: licenseKey, instance_name: `${deviceLabel} (${deviceId.slice(0, 8)})` },
      fetchImpl,
    );

    if (!ls.ok || ls.data?.activated !== true) {
      const errText = String(ls.data?.error || '').toLowerCase();
      if (errText.includes('activation limit')) {
        const keyHash = await sha256Hex(licenseKey);
        const rec = await readKeyRecord(kv, keyHash);
        const swapsLeft = Math.max(0, MAX_SWAPS_PER_30D - recentSwaps(rec.swaps, now).length);
        return json(409, { error: 'max_devices', devices: rec.devices, swapsRemaining: swapsLeft }, headers);
      }
      return json(400, { error: 'invalid_key' }, headers);
    }

    const instanceId = str(ls.data?.instance?.id);
    const keyHash = await sha256Hex(licenseKey);
    const rec = await readKeyRecord(kv, keyHash);
    const filtered = rec.devices.filter((d) => d.deviceId !== deviceId && d.instanceId !== instanceId);
    filtered.push({ instanceId, deviceId, label: deviceLabel, activatedAt: now });
    await writeKeyRecord(kv, keyHash, { ...rec, devices: filtered.slice(-MAX_DEVICES) });
    if (kv) {
      await kv.put(`val:${keyHash}`, JSON.stringify({ valid: true, checkedAt: now }), {
        expirationTtl: VALIDATE_CACHE_TTL_SEC,
      });
    }

    const exp = now + TOKEN_TTL_MS;
    const token = await signToken({ keyHash, deviceId, instanceId, iat: now, exp }, env.LICENSE_SECRET);
    const swapsLeft = Math.max(0, MAX_SWAPS_PER_30D - recentSwaps(rec.swaps, now).length);
    return json(
      200,
      { ok: true, token, instanceId, keyHint: licenseKey.slice(-4), expiresAt: exp, swapsRemaining: swapsLeft },
      headers,
    );
  }

  if (path === '/license/validate') {
    const token = str(input?.token);
    const deviceId = str(input?.deviceId);
    const payload = await verifyToken(token, env.LICENSE_SECRET);
    if (!payload || payload.deviceId !== deviceId) {
      return json(200, { valid: false, reason: 'invalid_token' }, headers);
    }

    const rec = await readKeyRecord(kv, payload.keyHash);
    // If KV tracks devices and this instance was deactivated elsewhere, reject immediately.
    if (kv && rec.devices.length > 0 && !rec.devices.some((d) => d.instanceId === payload.instanceId)) {
      return json(200, { valid: false, reason: 'deactivated' }, headers);
    }

    const cached = kv ? await kv.get(`val:${payload.keyHash}`, 'json').catch(() => null) : null;
    if (cached && cached.valid === false) {
      return json(200, { valid: false, reason: 'revoked' }, headers);
    }

    // Optional live check if licenseKey is supplied and cache is cold.
    const licenseKey = str(input?.licenseKey);
    if (!cached && licenseKey) {
      const ls = await callLemonSqueezy(
        'validate',
        { license_key: licenseKey, instance_id: payload.instanceId },
        fetchImpl,
      );
      const isValid = ls.ok && ls.data?.valid === true;
      if (kv) {
        await kv.put(`val:${payload.keyHash}`, JSON.stringify({ valid: isValid, checkedAt: now }), {
          expirationTtl: VALIDATE_CACHE_TTL_SEC,
        });
      }
      if (!isValid) return json(200, { valid: false, reason: 'revoked' }, headers);
    }

    const exp = now + TOKEN_TTL_MS;
    const refreshedToken = await signToken(
      { keyHash: payload.keyHash, deviceId, instanceId: payload.instanceId, iat: now, exp },
      env.LICENSE_SECRET,
    );
    const swapsLeft = Math.max(0, MAX_SWAPS_PER_30D - recentSwaps(rec.swaps, now).length);
    return json(200, { valid: true, token: refreshedToken, expiresAt: exp, swapsRemaining: swapsLeft }, headers);
  }

  if (path === '/license/deactivate') {
    const licenseKey = str(input?.licenseKey);
    const instanceId = str(input?.instanceId);
    const deviceId = str(input?.deviceId);
    const token = str(input?.token);

    let keyHash = '';
    if (token) {
      const payload = await verifyToken(token, env.LICENSE_SECRET);
      if (!payload || payload.deviceId !== deviceId) return json(403, { error: 'invalid_token' }, headers);
      keyHash = payload.keyHash;
    } else if (licenseKey) {
      const ok = await verifyTurnstile(str(input?.turnstileToken), ip, env.TURNSTILE_SECRET);
      if (!ok) return json(403, { error: 'captcha' }, headers);
      keyHash = await sha256Hex(licenseKey);
    } else {
      return json(400, { error: 'missing_fields' }, headers);
    }

    if (!instanceId) return json(400, { error: 'missing_fields' }, headers);

    const rec = await readKeyRecord(kv, keyHash);
    const activeSwaps = recentSwaps(rec.swaps, now);
    if (activeSwaps.length >= MAX_SWAPS_PER_30D) {
      const oldest = Math.min(...activeSwaps);
      return json(
        429,
        { error: 'swap_limit', nextSwapAt: oldest + SWAP_WINDOW_MS, swapsRemaining: 0 },
        headers,
      );
    }

    if (licenseKey) {
      const ls = await callLemonSqueezy('deactivate', { license_key: licenseKey, instance_id: instanceId }, fetchImpl);
      if (!ls.ok && ls.status !== 404) {
        return json(502, { error: 'upstream' }, headers);
      }
    }

    activeSwaps.push(now);
    const remainingDevices = rec.devices.filter((d) => d.instanceId !== instanceId);
    await writeKeyRecord(kv, keyHash, { devices: remainingDevices, swaps: activeSwaps });

    return json(
      200,
      { ok: true, swapsRemaining: Math.max(0, MAX_SWAPS_PER_30D - activeSwaps.length), devices: remainingDevices },
      headers,
    );
  }

  return json(404, { error: 'not_found' }, headers);
}
