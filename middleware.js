import { next } from '@vercel/functions';

/**
 * Password protection for the Action Tracker.
 *
 * Credentials are hardcoded below, but can be overridden without touching code
 * by setting SITE_USERNAME / SITE_PASSWORD as Environment Variables in the
 * Vercel dashboard (Project -> Settings -> Environment Variables), then
 * redeploying. Using env vars is strongly recommended if this repo is public.
 */
const USERNAME = process.env.SITE_USERNAME || 'oojaas.sehgal@headsupfortails.com';
const PASSWORD = process.env.SITE_PASSWORD || 'Huft@2026';

const REALM = 'Action Tracker';

function unauthorized() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// Length-independent comparison, to avoid leaking the password via timing.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export default function middleware(request) {
  const header = request.headers.get('authorization') || '';

  if (!header.toLowerCase().startsWith('basic ')) {
    return unauthorized();
  }

  let decoded;
  try {
    // atob gives bytes; re-decode as UTF-8 so non-ASCII passwords work.
    const bytes = Uint8Array.from(atob(header.slice(6).trim()), (c) =>
      c.charCodeAt(0),
    );
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(':');
  if (sep === -1) return unauthorized();

  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  // Username is compared case-insensitively so the email is forgiving to type.
  if (safeEqual(user.toLowerCase(), USERNAME.toLowerCase()) && safeEqual(pass, PASSWORD)) {
    return next({
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  return unauthorized();
}
