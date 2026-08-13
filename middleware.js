import { next, rewrite } from '@vercel/functions';
import { COOKIE_NAME, readCookie, safeEqual, sessionToken } from './lib/auth.js';

// Paths that must stay reachable while signed out.
const PUBLIC_PATHS = new Set([
  '/login',
  '/login.html',
  '/api/login',
  '/api/logout',
  '/favicon.ico',
  '/robots.txt',
]);

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Pretty URL for the login page.
  if (path === '/login') {
    return rewrite(new URL('/login.html', request.url));
  }

  if (PUBLIC_PATHS.has(path)) {
    return next();
  }

  const token = readCookie(request.headers.get('cookie'), COOKIE_NAME);

  if (token && safeEqual(token, await sessionToken())) {
    return next({
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  // API calls get a JSON 401 rather than a page, so fetch() can react sensibly.
  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ ok: false, error: 'not_signed_in' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Not signed in: serve the login page without changing the URL.
  return rewrite(new URL('/login.html', request.url));
}
