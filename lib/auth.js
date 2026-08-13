/**
 * Shared auth config + helpers for the Action Tracker.
 *
 * Credentials are hardcoded below, but Environment Variables set in the Vercel
 * dashboard (Project -> Settings -> Environment Variables) override them without
 * a code change. Recommended if this repo stays public.
 */
export const USERNAME = process.env.SITE_USERNAME || 'oojaas.sehgal@headsupfortails.com';
export const PASSWORD = process.env.SITE_PASSWORD || 'Huft@2026';

export const COOKIE_NAME = 'oat_session';
export const SESSION_DAYS = 30;

// Bump this to force everyone to sign in again.
const SALT = 'oojas-action-tracker-v1';

let cachedToken;

/**
 * The session cookie value, derived from the credentials. Because it is derived,
 * changing the password automatically invalidates every existing session.
 */
export async function sessionToken() {
  if (cachedToken) return cachedToken;
  const data = new TextEncoder().encode(`${USERNAME}:${PASSWORD}:${SALT}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  cachedToken = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return cachedToken;
}

/** Length-independent comparison, to avoid leaking secrets via timing. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}
