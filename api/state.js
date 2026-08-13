import { COOKIE_NAME, readCookie, safeEqual, sessionToken } from '../lib/auth.js';

/**
 * Shared tracker state.
 *
 *   GET  /api/state  -> { ok: true, rev, data }
 *   PUT  /api/state  -> { ok: true, rev }     body: { data }
 *
 * Works with either backend, picked automatically from whichever environment
 * variables are present:
 *
 *   Supabase  SUPABASE_URL + SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *   Redis     KV_REST_API_URL + KV_REST_API_TOKEN
 *             (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *
 * With neither configured the endpoint reports `not_configured` and the browser
 * falls back to localStorage, so the tracker still works — it just isn't shared.
 */

// ---------------------------------------------------------------- Supabase
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/+$/, '');

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const TABLE = process.env.SUPABASE_TABLE || 'tracker_state';
const ROW_ID = 'main';

// ---------------------------------------------------------------- Redis
const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_REST_URL ||
  '';

const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_REST_TOKEN ||
  '';

const STATE_KEY = 'oat:state:v1';
const MAX_BYTES = 4 * 1024 * 1024;

function backend() {
  if (SUPABASE_URL && SUPABASE_KEY) return 'supabase';
  if (REDIS_URL && REDIS_TOKEN) return 'redis';
  return null;
}

// ---------------------------------------------------------------- adapters
const supabase = {
  headers(extra) {
    return {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  },

  async read() {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${ROW_ID}&select=rev,data`;
    const res = await fetch(url, { headers: supabase.headers() });
    if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return { rev: 0, data: {} };
    return { rev: Number(rows[0].rev) || 0, data: rows[0].data || {} };
  },

  async write(rev, data) {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: supabase.headers({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify([
        { id: ROW_ID, rev, data, updated_at: new Date(rev).toISOString() },
      ]),
    });
    if (!res.ok) throw new Error(`Supabase write ${res.status}: ${await res.text()}`);
  },
};

const redis = {
  async command(cmd) {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmd),
    });
    if (!res.ok) throw new Error(`Redis responded ${res.status}`);
    const json = await res.json();
    if (json && json.error) throw new Error(String(json.error));
    return json ? json.result : null;
  },

  async read() {
    const raw = await redis.command(['GET', STATE_KEY]);
    if (!raw) return { rev: 0, data: {} };
    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return { rev: 0, data: {} };
    }
    return { rev: parsed?.rev || 0, data: parsed?.data || {} };
  },

  async write(rev, data) {
    const payload = JSON.stringify({ rev, data, updatedAt: new Date(rev).toISOString() });
    await redis.command(['SET', STATE_KEY, payload]);
  },
};

function store() {
  return backend() === 'supabase' ? supabase : redis;
}

// ---------------------------------------------------------------- handler
async function isSignedIn(req) {
  const token = readCookie(req.headers?.cookie, COOKIE_NAME);
  if (!token) return false;
  return safeEqual(token, await sessionToken());
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!(await isSignedIn(req))) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' });
  }

  const kind = backend();
  if (!kind) {
    return res.status(200).json({
      ok: false,
      error: 'not_configured',
      hint: 'Connect Supabase or a Redis store so the tracker is shared across devices. See the README.',
    });
  }

  try {
    if (req.method === 'GET') {
      const { rev, data } = await store().read();
      return res.status(200).json({ ok: true, rev, data, backend: kind });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = null;
        }
      }

      const data =
        body && typeof body.data === 'object' && body.data !== null ? body.data : null;
      if (!data) return res.status(400).json({ ok: false, error: 'bad_payload' });

      if (JSON.stringify(data).length > MAX_BYTES) {
        return res.status(413).json({ ok: false, error: 'too_large' });
      }

      const rev = Date.now();
      await store().write(rev, data);
      return res.status(200).json({ ok: true, rev, backend: kind });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: 'store_unavailable',
      detail: String(err.message || err),
    });
  }
}
