import { describe, it, expect } from 'vitest';
import {
  handleLicenseRequest,
  MAX_SWAPS_PER_30D,
  recentSwaps,
  signToken,
  verifyToken,
} from './license.js';

function memoryKv() {
  const store = new Map();
  return {
    async get(key, type) {
      const val = store.get(key);
      if (val === undefined) return null;
      return type === 'json' ? JSON.parse(val) : val;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

const corsHeaders = { 'Access-Control-Allow-Origin': 'https://pokenow.cc' };
const baseEnv = () => ({
  LICENSE_SECRET: 'test-secret-key-for-hmac-signing',
  TURNSTILE_SECRET: 'ts-secret',
  LICENSE_KV: memoryKv(),
});

const makeReq = (path, body) =>
  new Request(`https://worker.example${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://pokenow.cc', 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify(body),
  });

describe('license token signing', () => {
  it('signs and verifies valid tokens and rejects tampered or expired ones', async () => {
    const secret = 'secret-123';
    const token = await signToken({ keyHash: 'abc', deviceId: 'dev1', instanceId: 'inst1', exp: Date.now() + 60_000 }, secret);
    const verified = await verifyToken(token, secret);
    expect(verified?.deviceId).toBe('dev1');

    // Tamper signature
    const [head, sig] = token.split('.');
    const bad = `${head}.${sig.slice(0, -2)}xx`;
    expect(await verifyToken(bad, secret)).toBeNull();

    // Expired token
    const expired = await signToken({ keyHash: 'abc', deviceId: 'dev1', instanceId: 'inst1', exp: Date.now() - 1000 }, secret);
    expect(await verifyToken(expired, secret)).toBeNull();
  });

  it('prunes swaps older than 30 days', () => {
    const now = Date.now();
    const old = now - 31 * 24 * 60 * 60 * 1000;
    const recent = now - 5 * 24 * 60 * 60 * 1000;
    expect(recentSwaps([old, recent], now)).toEqual([recent]);
  });
});

describe('license worker endpoints', () => {
  it('activates a device, validates token, and blocks swaps beyond the 30-day limit', async () => {
    const env = baseEnv();
    const verifyTurnstile = async () => true;
    const fetchImpl = async (url) => {
      if (url.endsWith('/activate')) {
        return new Response(JSON.stringify({ activated: true, instance: { id: 'inst-1' } }), { status: 200 });
      }
      if (url.endsWith('/deactivate')) {
        return new Response(JSON.stringify({ deactivated: true }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    };

    // 1. Activate
    const actRes = await handleLicenseRequest(
      makeReq('/license/activate', { licenseKey: 'KEY-1234', deviceId: 'dev-a', deviceLabel: 'Chrome', turnstileToken: 'ok' }),
      env,
      corsHeaders,
      { verifyTurnstile, fetchImpl },
    );
    expect(actRes.status).toBe(200);
    const actData = await actRes.json();
    expect(actData.ok).toBe(true);
    expect(actData.instanceId).toBe('inst-1');
    expect(actData.swapsRemaining).toBe(MAX_SWAPS_PER_30D);

    // 2. Validate same device succeeds, wrong device fails
    const valOk = await handleLicenseRequest(
      makeReq('/license/validate', { token: actData.token, deviceId: 'dev-a' }),
      env,
      corsHeaders,
      { verifyTurnstile, fetchImpl },
    );
    expect((await valOk.json()).valid).toBe(true);

    const valWrong = await handleLicenseRequest(
      makeReq('/license/validate', { token: actData.token, deviceId: 'dev-stolen' }),
      env,
      corsHeaders,
      { verifyTurnstile, fetchImpl },
    );
    expect((await valWrong.json()).valid).toBe(false);

    // 3. Deactivate twice succeeds, 3rd swap in 30 days is blocked (anti-rotation)
    for (let i = 0; i < MAX_SWAPS_PER_30D; i++) {
      const res = await handleLicenseRequest(
        makeReq('/license/deactivate', { licenseKey: 'KEY-1234', instanceId: `inst-${i}`, turnstileToken: 'ok' }),
        env,
        corsHeaders,
        { verifyTurnstile, fetchImpl },
      );
      expect(res.status).toBe(200);
    }

    const blocked = await handleLicenseRequest(
      makeReq('/license/deactivate', { licenseKey: 'KEY-1234', instanceId: 'inst-3', turnstileToken: 'ok' }),
      env,
      corsHeaders,
      { verifyTurnstile, fetchImpl },
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe('swap_limit');
  });

  it('returns 409 max_devices when Lemon Squeezy hits activation limit', async () => {
    const env = baseEnv();
    const res = await handleLicenseRequest(
      makeReq('/license/activate', { licenseKey: 'KEY-FULL', deviceId: 'dev-4', turnstileToken: 'ok' }),
      env,
      corsHeaders,
      {
        verifyTurnstile: async () => true,
        fetchImpl: async () =>
          new Response(JSON.stringify({ activated: false, error: 'This license key has reached the activation limit.' }), {
            status: 400,
          }),
      },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('max_devices');
  });
});
