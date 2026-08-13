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

  // Not signed in: serve the login page without changing the URL.
  return rewrite(new URL('/login.html', request.url));
}
